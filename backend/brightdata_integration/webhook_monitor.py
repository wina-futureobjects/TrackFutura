"""
Webhook Monitoring and Observability System

This module provides comprehensive monitoring, metrics, and alerting for webhook operations:
- Real-time webhook performance tracking
- Error detection and alerting
- Health metrics and dashboards
- Retry queue management
- Performance analytics
"""

import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.db import models
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)

@dataclass
class WebhookMetrics:
    """Webhook performance metrics"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    avg_response_time: float = 0.0
    max_response_time: float = 0.0
    min_response_time: float = float('inf')
    error_rate: float = 0.0
    last_success: Optional[datetime] = None
    last_failure: Optional[datetime] = None

@dataclass
class WebhookEvent:
    """Webhook event log entry"""
    timestamp: datetime
    event_id: str
    event_type: str
    status: str
    response_time: float
    payload_size: int
    client_ip: str
    user_agent: str
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = None

class WebhookHealthStatus(models.TextChoices):
    """Webhook health status options"""
    HEALTHY = 'healthy', 'Healthy'
    DEGRADED = 'degraded', 'Degraded'
    UNHEALTHY = 'unhealthy', 'Unhealthy'
    CRITICAL = 'critical', 'Critical'

class WebhookMonitor:
    """
    Comprehensive webhook monitoring system
    """

    def __init__(self):
        self.metrics_key = "webhook_metrics"
        self.events_key = "webhook_events"
        self.health_key = "webhook_health"
        self.alerts_key = "webhook_alerts"

        # Configuration
        self.max_events = getattr(settings, 'WEBHOOK_MAX_EVENTS', 1000)
        self.metrics_retention = getattr(settings, 'WEBHOOK_METRICS_RETENTION', 3600)  # 1 hour
        self.error_threshold = getattr(settings, 'WEBHOOK_ERROR_THRESHOLD', 0.1)  # 10%
        self.response_time_threshold = getattr(settings, 'WEBHOOK_RESPONSE_TIME_THRESHOLD', 5.0)  # 5 seconds

    def record_webhook_event(self, event_type: str, status: str, response_time: float = 0.0,
                           payload_size: int = 0, client_ip: str = '', user_agent: str = '',
                           error_message: str = None, metadata: Dict = None) -> str:
        """
        Record a webhook event for monitoring and analytics
        """
        try:
            event_id = f"webhook_{int(time.time() * 1000000)}"

            event = WebhookEvent(
                timestamp=timezone.now(),
                event_id=event_id,
                event_type=event_type,
                status=status,
                response_time=response_time,
                payload_size=payload_size,
                client_ip=client_ip,
                user_agent=user_agent,
                error_message=error_message,
                metadata=metadata or {}
            )

            # Store event
            self._store_event(event)

            # Update metrics
            self._update_metrics(event)

            # Check health status
            self._update_health_status()

            # Check for alerts
            self._check_alerts(event)

            logger.info(f"Recorded webhook event: {event_id} ({status})")
            return event_id

        except Exception as e:
            logger.error(f"Error recording webhook event: {str(e)}")
            return ""

    def _store_event(self, event: WebhookEvent):
        """Store webhook event in cache"""
        try:
            events = cache.get(self.events_key, [])

            # Convert event to dict for JSON serialization
            event_dict = asdict(event)
            event_dict['timestamp'] = event.timestamp.isoformat()

            events.append(event_dict)

            # Keep only recent events
            if len(events) > self.max_events:
                events = events[-self.max_events:]

            cache.set(self.events_key, events, timeout=self.metrics_retention * 2)

        except Exception as e:
            logger.error(f"Error storing webhook event: {str(e)}")

    def _update_metrics(self, event: WebhookEvent):
        """Update webhook performance metrics"""
        try:
            metrics = self.get_current_metrics()

            # Update counters
            metrics.total_requests += 1

            if event.status == 'success':
                metrics.successful_requests += 1
                metrics.last_success = event.timestamp
            else:
                metrics.failed_requests += 1
                metrics.last_failure = event.timestamp

            # Update response time metrics
            if event.response_time > 0:
                if metrics.min_response_time == float('inf'):
                    metrics.min_response_time = event.response_time
                else:
                    metrics.min_response_time = min(metrics.min_response_time, event.response_time)

                metrics.max_response_time = max(metrics.max_response_time, event.response_time)

                # Calculate average (simplified rolling average)
                if metrics.total_requests == 1:
                    metrics.avg_response_time = event.response_time
                else:
                    metrics.avg_response_time = (
                        (metrics.avg_response_time * (metrics.total_requests - 1) + event.response_time) /
                        metrics.total_requests
                    )

            # Calculate error rate
            if metrics.total_requests > 0:
                metrics.error_rate = metrics.failed_requests / metrics.total_requests

            # Store updated metrics
            metrics_dict = asdict(metrics)
            metrics_dict['last_success'] = metrics.last_success.isoformat() if metrics.last_success else None
            metrics_dict['last_failure'] = metrics.last_failure.isoformat() if metrics.last_failure else None

            # Handle infinity values for JSON serialization
            if metrics.min_response_time == float('inf'):
                metrics_dict['min_response_time'] = 0.0

            cache.set(self.metrics_key, metrics_dict, timeout=self.metrics_retention)

        except Exception as e:
            logger.error(f"Error updating webhook metrics: {str(e)}")

    def get_current_metrics(self) -> WebhookMetrics:
        """Get current webhook metrics"""
        try:
            metrics_dict = cache.get(self.metrics_key, {})

            if not metrics_dict:
                return WebhookMetrics()

            # Convert back from dict
            metrics = WebhookMetrics(**{
                k: v for k, v in metrics_dict.items()
                if k in ['total_requests', 'successful_requests', 'failed_requests',
                        'avg_response_time', 'max_response_time', 'min_response_time', 'error_rate']
            })

            # Parse datetime fields
            if metrics_dict.get('last_success'):
                metrics.last_success = datetime.fromisoformat(metrics_dict['last_success'])
            if metrics_dict.get('last_failure'):
                metrics.last_failure = datetime.fromisoformat(metrics_dict['last_failure'])

            return metrics

        except Exception as e:
            logger.error(f"Error getting current metrics: {str(e)}")
            return WebhookMetrics()

    def get_recent_events(self, limit: int = 50, event_type: str = None) -> List[Dict]:
        """Get recent webhook events"""
        try:
            events = cache.get(self.events_key, [])

            # Filter by event type if specified
            if event_type:
                events = [e for e in events if e.get('event_type') == event_type]

            # Return most recent events
            return events[-limit:] if events else []

        except Exception as e:
            logger.error(f"Error getting recent events: {str(e)}")
            return []

    def _update_health_status(self):
        """Update overall webhook health status"""
        try:
            metrics = self.get_current_metrics()

            # Determine health status based on metrics
            health_status = WebhookHealthStatus.HEALTHY
            # Prepare metrics dict with JSON-safe values
            metrics_dict = asdict(metrics)
            if metrics.min_response_time == float('inf'):
                metrics_dict['min_response_time'] = 0.0
            if metrics.last_success:
                metrics_dict['last_success'] = metrics.last_success.isoformat()
            if metrics.last_failure:
                metrics_dict['last_failure'] = metrics.last_failure.isoformat()

            health_details = {
                'status': health_status,
                'timestamp': timezone.now().isoformat(),
                'metrics': metrics_dict,
                'issues': []
            }

            # Check error rate
            if metrics.error_rate > 0.5:  # 50%
                health_status = WebhookHealthStatus.CRITICAL
                health_details['issues'].append('High error rate (>50%)')
            elif metrics.error_rate > 0.25:  # 25%
                health_status = WebhookHealthStatus.UNHEALTHY
                health_details['issues'].append('Elevated error rate (>25%)')
            elif metrics.error_rate > self.error_threshold:
                health_status = WebhookHealthStatus.DEGRADED
                health_details['issues'].append(f'Error rate above threshold ({metrics.error_rate:.1%})')

            # Check response time
            if metrics.avg_response_time > self.response_time_threshold * 2:
                if health_status == WebhookHealthStatus.HEALTHY:
                    health_status = WebhookHealthStatus.UNHEALTHY
                health_details['issues'].append('Very slow response times')
            elif metrics.avg_response_time > self.response_time_threshold:
                if health_status == WebhookHealthStatus.HEALTHY:
                    health_status = WebhookHealthStatus.DEGRADED
                health_details['issues'].append('Slow response times')

            # Check for recent failures
            if metrics.last_failure:
                time_since_failure = timezone.now() - metrics.last_failure
                if time_since_failure < timedelta(minutes=5):
                    if health_status == WebhookHealthStatus.HEALTHY:
                        health_status = WebhookHealthStatus.DEGRADED
                    health_details['issues'].append('Recent failures detected')

            health_details['status'] = health_status
            cache.set(self.health_key, health_details, timeout=self.metrics_retention)

        except Exception as e:
            logger.error(f"Error updating health status: {str(e)}")

    def get_health_status(self) -> Dict:
        """Get current webhook health status"""
        try:
            default_metrics = asdict(WebhookMetrics())
            # Handle infinity values for JSON serialization
            if default_metrics['min_response_time'] == float('inf'):
                default_metrics['min_response_time'] = 0.0

            return cache.get(self.health_key, {
                'status': WebhookHealthStatus.HEALTHY,
                'timestamp': timezone.now().isoformat(),
                'metrics': default_metrics,
                'issues': []
            })
        except Exception as e:
            logger.error(f"Error getting health status: {str(e)}")
            return {'status': WebhookHealthStatus.CRITICAL, 'issues': ['Monitoring system error']}

    def _check_alerts(self, event: WebhookEvent):
        """Check if event should trigger alerts"""
        try:
            alerts = []

            # High error rate alert
            metrics = self.get_current_metrics()
            if metrics.error_rate > self.error_threshold and metrics.total_requests >= 10:
                alerts.append({
                    'type': 'HIGH_ERROR_RATE',
                    'severity': 'warning',
                    'message': f'Webhook error rate is {metrics.error_rate:.1%}',
                    'timestamp': timezone.now().isoformat()
                })

            # Slow response time alert
            if event.response_time > self.response_time_threshold:
                alerts.append({
                    'type': 'SLOW_RESPONSE',
                    'severity': 'warning',
                    'message': f'Webhook response time {event.response_time:.2f}s exceeds threshold',
                    'timestamp': timezone.now().isoformat()
                })

            # Critical error alert
            if event.status == 'error' and event.error_message:
                alerts.append({
                    'type': 'CRITICAL_ERROR',
                    'severity': 'error',
                    'message': f'Webhook critical error: {event.error_message}',
                    'timestamp': timezone.now().isoformat()
                })

            # Store alerts
            if alerts:
                existing_alerts = cache.get(self.alerts_key, [])
                existing_alerts.extend(alerts)

                # Keep only recent alerts (last 24 hours worth)
                cutoff_time = timezone.now() - timedelta(hours=24)
                existing_alerts = [
                    alert for alert in existing_alerts
                    if datetime.fromisoformat(alert['timestamp']) > cutoff_time
                ]

                cache.set(self.alerts_key, existing_alerts, timeout=86400)  # 24 hours

                # Log alerts
                for alert in alerts:
                    logger.warning(f"Webhook Alert: {alert['type']} - {alert['message']}")

        except Exception as e:
            logger.error(f"Error checking alerts: {str(e)}")

    def get_alerts(self, severity: str = None) -> List[Dict]:
        """Get webhook alerts"""
        try:
            alerts = cache.get(self.alerts_key, [])

            if severity:
                alerts = [alert for alert in alerts if alert.get('severity') == severity]

            return sorted(alerts, key=lambda x: x['timestamp'], reverse=True)

        except Exception as e:
            logger.error(f"Error getting alerts: {str(e)}")
            return []

    def get_performance_analytics(self, hours: int = 24) -> Dict:
        """Get detailed performance analytics"""
        try:
            events = self.get_recent_events(limit=self.max_events)

            # Filter events by time window
            cutoff_time = timezone.now() - timedelta(hours=hours)
            recent_events = [
                event for event in events
                if datetime.fromisoformat(event['timestamp']) > cutoff_time
            ]

            if not recent_events:
                return {
                    'total_events': 0,
                    'success_rate': 0,
                    'avg_response_time': 0,
                    'hourly_breakdown': [],
                    'error_types': {},
                    'top_clients': {}
                }

            # Calculate analytics
            total_events = len(recent_events)
            successful_events = len([e for e in recent_events if e['status'] == 'success'])
            success_rate = (successful_events / total_events) * 100 if total_events > 0 else 0

            response_times = [e['response_time'] for e in recent_events if e['response_time'] > 0]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0

            # Hourly breakdown
            hourly_data = {}
            for event in recent_events:
                hour = datetime.fromisoformat(event['timestamp']).strftime('%Y-%m-%d %H:00')
                if hour not in hourly_data:
                    hourly_data[hour] = {'total': 0, 'success': 0, 'errors': 0}

                hourly_data[hour]['total'] += 1
                if event['status'] == 'success':
                    hourly_data[hour]['success'] += 1
                else:
                    hourly_data[hour]['errors'] += 1

            # Error types
            error_types = {}
            for event in recent_events:
                if event['status'] != 'success' and event.get('error_message'):
                    error_type = event['error_message'][:50]  # Truncate for grouping
                    error_types[error_type] = error_types.get(error_type, 0) + 1

            # Top clients by IP
            client_ips = {}
            for event in recent_events:
                ip = event.get('client_ip', 'unknown')
                client_ips[ip] = client_ips.get(ip, 0) + 1

            top_clients = sorted(client_ips.items(), key=lambda x: x[1], reverse=True)[:10]

            return {
                'total_events': total_events,
                'success_rate': round(success_rate, 2),
                'avg_response_time': round(avg_response_time, 3),
                'hourly_breakdown': [
                    {
                        'hour': hour,
                        'total': data['total'],
                        'success': data['success'],
                        'errors': data['errors'],
                        'success_rate': round((data['success'] / data['total']) * 100, 1) if data['total'] > 0 else 0
                    }
                    for hour, data in sorted(hourly_data.items())
                ],
                'error_types': dict(sorted(error_types.items(), key=lambda x: x[1], reverse=True)[:10]),
                'top_clients': [{'ip': ip, 'requests': count} for ip, count in top_clients]
            }

        except Exception as e:
            logger.error(f"Error getting performance analytics: {str(e)}")
            return {}

    def reset_metrics(self):
        """Reset all webhook metrics (for testing/maintenance)"""
        try:
            cache.delete(self.metrics_key)
            cache.delete(self.events_key)
            cache.delete(self.health_key)
            cache.delete(self.alerts_key)
            logger.info("Webhook metrics reset successfully")
        except Exception as e:
            logger.error(f"Error resetting metrics: {str(e)}")


# Global monitor instance
webhook_monitor = WebhookMonitor()
