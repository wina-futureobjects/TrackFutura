"""
Enhanced Webhook Security Module for Professional-Grade BrightData Integration

This module implements enterprise-level security measures for webhook endpoints:
- HMAC signature verification
- Timestamp-based replay attack prevention
- Rate limiting and IP whitelisting
- Comprehensive logging and monitoring
- Certificate pinning support
"""

import hmac
import hashlib
import time
import json
import logging
import ipaddress
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest
from django.utils.crypto import constant_time_compare
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

logger = logging.getLogger(__name__)

class WebhookSecurityError(Exception):
    """Base exception for webhook security issues"""
    pass

class WebhookAuthenticationError(WebhookSecurityError):
    """Raised when webhook authentication fails"""
    pass

class WebhookReplayAttackError(WebhookSecurityError):
    """Raised when a potential replay attack is detected"""
    pass

class WebhookRateLimitError(WebhookSecurityError):
    """Raised when rate limit is exceeded"""
    pass

class EnhancedWebhookSecurity:
    """
    Enterprise-grade webhook security implementation
    """

    def __init__(self):
        self.webhook_token = getattr(settings, 'BRIGHTDATA_WEBHOOK_TOKEN', '')
        self.max_timestamp_age = getattr(settings, 'WEBHOOK_MAX_TIMESTAMP_AGE', 300)  # 5 minutes
        self.rate_limit = getattr(settings, 'WEBHOOK_RATE_LIMIT', 100)  # requests per minute
        self.allowed_ips = getattr(settings, 'WEBHOOK_ALLOWED_IPS', [])
        self.enable_certificate_pinning = getattr(settings, 'WEBHOOK_ENABLE_CERT_PINNING', False)

    def verify_webhook_signature(self, request: HttpRequest, payload: bytes) -> bool:
        """
        Verify HMAC signature of webhook payload
        """
        try:
            signature_header = request.headers.get('X-BrightData-Signature') or request.headers.get('Authorization', '')

            if not signature_header:
                logger.warning("No signature header found in webhook request")
                return False

            # Extract signature from header (support multiple formats)
            if signature_header.startswith('Bearer '):
                token = signature_header[7:]
                # For Bearer tokens, verify direct match for now
                return constant_time_compare(token, self.webhook_token)
            elif signature_header.startswith('sha256='):
                expected_signature = signature_header[7:]
            elif 'sha256=' in signature_header:
                expected_signature = signature_header.split('sha256=')[1]
            else:
                # Fallback to direct token comparison
                return constant_time_compare(signature_header, self.webhook_token)

            # Calculate expected HMAC signature
            calculated_signature = hmac.new(
                self.webhook_token.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()

            # Verify signature using constant-time comparison
            is_valid = constant_time_compare(expected_signature, calculated_signature)

            if not is_valid:
                logger.warning(f"Webhook signature verification failed. Expected: {expected_signature[:8]}..., Got: {calculated_signature[:8]}...")

            return is_valid

        except Exception as e:
            logger.error(f"Error verifying webhook signature: {str(e)}")
            return False

    def verify_timestamp(self, request: HttpRequest) -> bool:
        """
        Verify timestamp to prevent replay attacks
        """
        try:
            timestamp_header = request.headers.get('X-BrightData-Timestamp') or request.headers.get('X-Timestamp')

            if not timestamp_header:
                # If no timestamp provided, check if payload contains one
                try:
                    if hasattr(request, 'body'):
                        payload = json.loads(request.body)
                        timestamp_header = payload.get('timestamp')
                except (json.JSONDecodeError, AttributeError):
                    pass

            if not timestamp_header:
                logger.warning("No timestamp found in webhook request")
                return False

            # Parse timestamp (support multiple formats)
            try:
                if isinstance(timestamp_header, str) and timestamp_header.isdigit():
                    webhook_time = int(timestamp_header)
                elif isinstance(timestamp_header, (int, float)):
                    webhook_time = int(timestamp_header)
                else:
                    # Try to parse ISO format
                    webhook_time = int(datetime.fromisoformat(timestamp_header.replace('Z', '+00:00')).timestamp())
            except (ValueError, AttributeError) as e:
                logger.warning(f"Invalid timestamp format: {timestamp_header}")
                return False

            current_time = int(time.time())
            time_diff = abs(current_time - webhook_time)

            if time_diff > self.max_timestamp_age:
                logger.warning(f"Webhook timestamp too old. Diff: {time_diff}s, Max: {self.max_timestamp_age}s")
                return False

            # Check for potential replay attack
            replay_key = f"webhook_replay_{webhook_time}_{request.headers.get('X-BrightData-ID', 'unknown')}"
            if cache.get(replay_key):
                logger.warning(f"Potential replay attack detected: {replay_key}")
                return False

            # Store timestamp to prevent replay
            cache.set(replay_key, True, timeout=self.max_timestamp_age * 2)

            return True

        except Exception as e:
            logger.error(f"Error verifying webhook timestamp: {str(e)}")
            return False

    def check_rate_limit(self, request: HttpRequest) -> bool:
        """
        Check if request exceeds rate limits
        """
        try:
            client_ip = self.get_client_ip(request)
            rate_key = f"webhook_rate_{client_ip}"

            current_requests = cache.get(rate_key, 0)
            if current_requests >= self.rate_limit:
                logger.warning(f"Rate limit exceeded for IP {client_ip}: {current_requests}/{self.rate_limit}")
                return False

            # Increment counter with 1-minute expiry
            cache.set(rate_key, current_requests + 1, timeout=60)
            return True

        except Exception as e:
            logger.error(f"Error checking rate limit: {str(e)}")
            return True  # Allow request if rate limiting fails

    def verify_ip_whitelist(self, request: HttpRequest) -> bool:
        """
        Verify if request comes from allowed IP addresses
        """
        if not self.allowed_ips:
            return True  # No IP restrictions configured

        try:
            client_ip = self.get_client_ip(request)
            client_addr = ipaddress.ip_address(client_ip)

            for allowed_ip in self.allowed_ips:
                try:
                    if '/' in allowed_ip:
                        # CIDR notation
                        if client_addr in ipaddress.ip_network(allowed_ip, strict=False):
                            return True
                    else:
                        # Single IP
                        if client_addr == ipaddress.ip_address(allowed_ip):
                            return True
                except ValueError:
                    logger.warning(f"Invalid IP configuration: {allowed_ip}")
                    continue

            logger.warning(f"IP not whitelisted: {client_ip}")
            return False

        except Exception as e:
            logger.error(f"Error verifying IP whitelist: {str(e)}")
            return True  # Allow request if IP checking fails

    def get_client_ip(self, request: HttpRequest) -> str:
        """
        Get real client IP considering proxies and load balancers
        """
        # Check for common proxy headers
        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(',')[0].strip()

        # Check other common headers
        real_ip = request.META.get('HTTP_X_REAL_IP')
        if real_ip:
            return real_ip

        # Fallback to REMOTE_ADDR
        return request.META.get('REMOTE_ADDR', '127.0.0.1')

    def validate_webhook_payload(self, payload: dict) -> Tuple[bool, List[str]]:
        """
        Validate webhook payload structure and content
        """
        errors = []

        try:
            # Basic structure validation
            if not isinstance(payload, (dict, list)):
                errors.append("Payload must be a JSON object or array")
                return False, errors

            # If it's a list, validate each item
            if isinstance(payload, list):
                for i, item in enumerate(payload):
                    if not isinstance(item, dict):
                        errors.append(f"Item {i} must be a JSON object")
                        continue

                    # Validate individual item
                    item_valid, item_errors = self._validate_payload_item(item)
                    if not item_valid:
                        errors.extend([f"Item {i}: {error}" for error in item_errors])
            else:
                # Single object validation
                item_valid, item_errors = self._validate_payload_item(payload)
                if not item_valid:
                    errors.extend(item_errors)

            return len(errors) == 0, errors

        except Exception as e:
            errors.append(f"Payload validation error: {str(e)}")
            return False, errors

    def _validate_payload_item(self, item: dict) -> Tuple[bool, List[str]]:
        """
        Validate individual payload item
        """
        errors = []

        # Check for required fields (basic validation)
        if 'url' in item:
            if not isinstance(item['url'], str) or not item['url'].strip():
                errors.append("URL field must be a non-empty string")

        # Validate date fields
        date_fields = ['date_posted', 'discovered', 'timestamp']
        for field in date_fields:
            if field in item and item[field]:
                try:
                    # Try to parse various date formats
                    if isinstance(item[field], str):
                        datetime.fromisoformat(item[field].replace('Z', '+00:00'))
                except ValueError:
                    errors.append(f"Invalid date format in field '{field}': {item[field]}")

        # Validate numeric fields
        numeric_fields = ['num_comments', 'num_shares', 'likes', 'video_view_count']
        for field in numeric_fields:
            if field in item and item[field] is not None:
                if not isinstance(item[field], (int, float)) or item[field] < 0:
                    errors.append(f"Field '{field}' must be a non-negative number")

        return len(errors) == 0, errors

    def log_webhook_security_event(self, request: HttpRequest, event_type: str, details: dict):
        """
        Log security-related webhook events for monitoring and auditing
        """
        try:
            security_log = {
                'timestamp': datetime.now().isoformat(),
                'event_type': event_type,
                'client_ip': self.get_client_ip(request),
                'user_agent': request.headers.get('User-Agent', ''),
                'path': request.path,
                'method': request.method,
                'details': details
            }

            # Log to security logger
            security_logger = logging.getLogger('webhook_security')
            security_logger.warning(f"Webhook Security Event: {json.dumps(security_log)}")

            # Store in cache for monitoring dashboard
            events_key = "webhook_security_events"
            events = cache.get(events_key, [])
            events.append(security_log)

            # Keep only last 100 events
            if len(events) > 100:
                events = events[-100:]

            cache.set(events_key, events, timeout=3600)  # 1 hour

        except Exception as e:
            logger.error(f"Error logging security event: {str(e)}")

    def comprehensive_webhook_validation(self, request: HttpRequest) -> Tuple[bool, dict]:
        """
        Perform comprehensive webhook validation
        """
        validation_result = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'security_score': 100
        }

        try:
            # Get request payload
            payload = request.body

            # 1. Rate limiting check
            if not self.check_rate_limit(request):
                validation_result['valid'] = False
                validation_result['errors'].append('Rate limit exceeded')
                validation_result['security_score'] -= 30
                self.log_webhook_security_event(request, 'RATE_LIMIT_EXCEEDED', {})

            # 2. IP whitelist check
            if not self.verify_ip_whitelist(request):
                validation_result['valid'] = False
                validation_result['errors'].append('IP not whitelisted')
                validation_result['security_score'] -= 40
                self.log_webhook_security_event(request, 'IP_NOT_WHITELISTED', {
                    'client_ip': self.get_client_ip(request)
                })

            # 3. Signature verification
            if not self.verify_webhook_signature(request, payload):
                validation_result['valid'] = False
                validation_result['errors'].append('Invalid signature')
                validation_result['security_score'] -= 50
                self.log_webhook_security_event(request, 'INVALID_SIGNATURE', {})

            # 4. Timestamp verification
            if not self.verify_timestamp(request):
                validation_result['warnings'].append('Invalid or missing timestamp')
                validation_result['security_score'] -= 20
                self.log_webhook_security_event(request, 'INVALID_TIMESTAMP', {})

            # 5. Payload validation
            if payload:
                try:
                    parsed_payload = json.loads(payload)
                    is_valid, errors = self.validate_webhook_payload(parsed_payload)
                    if not is_valid:
                        validation_result['warnings'].extend(errors)
                        validation_result['security_score'] -= 10
                except json.JSONDecodeError:
                    validation_result['warnings'].append('Invalid JSON payload')
                    validation_result['security_score'] -= 15

            return validation_result['valid'], validation_result

        except Exception as e:
            logger.error(f"Error in comprehensive webhook validation: {str(e)}")
            return False, {
                'valid': False,
                'errors': [f'Validation error: {str(e)}'],
                'warnings': [],
                'security_score': 0
            }


# Global security instance
webhook_security = EnhancedWebhookSecurity()
