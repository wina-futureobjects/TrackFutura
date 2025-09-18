"""
Configuration Validator for BrightData Platform Integration
Validates platform configurations without affecting existing functionality
"""

import json
import os
from typing import Dict, List, Optional, Tuple
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class PlatformConfigValidator:
    """Validates platform configurations for BrightData integration"""
    
    def __init__(self, config_file_path: str = None):
        self.config_file_path = config_file_path or os.path.join(
            os.path.dirname(__file__), 'configs', 'platform_config.json'
        )
        self.configs = self._load_configs()
    
    def _load_configs(self) -> Dict:
        """Load platform configurations from JSON file"""
        try:
            with open(self.config_file_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"Configuration file not found: {self.config_file_path}")
            return {}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in configuration file: {e}")
            return {}
    
    def validate_all_configs(self) -> Dict[str, List[str]]:
        """Validate all platform configurations"""
        results = {}
        
        for platform_key, config in self.configs.items():
            errors = self.validate_platform_config(platform_key, config)
            if errors:
                results[platform_key] = errors
            else:
                results[platform_key] = ["✅ Valid"]
        
        return results
    
    def validate_platform_config(self, platform_key: str, config: Dict) -> List[str]:
        """Validate a single platform configuration"""
        errors = []
        
        # Required top-level fields
        required_fields = [
            'dataset_id', 'platform_name', 'service_type', 'content_type',
            'payload_structure', 'url_extraction', 'discovery_params',
            'required_fields', 'optional_fields'
        ]
        
        for field in required_fields:
            if field not in config:
                errors.append(f"Missing required field: {field}")
        
        if errors:
            return errors
        
        # Validate dataset_id format
        if not isinstance(config['dataset_id'], str) or not config['dataset_id'].isdigit():
            errors.append("dataset_id must be a string of digits")
        
        # Validate payload_structure
        if not isinstance(config['payload_structure'], dict):
            errors.append("payload_structure must be a dictionary")
        
        # Validate url_extraction
        if not isinstance(config['url_extraction'], dict):
            errors.append("url_extraction must be a dictionary")
        elif 'field' not in config['url_extraction']:
            errors.append("url_extraction must contain 'field' key")
        
        # Validate discovery_params
        if not isinstance(config['discovery_params'], dict):
            errors.append("discovery_params must be a dictionary")
        elif 'discover_by' not in config['discovery_params']:
            errors.append("discovery_params must contain 'discover_by' key")
        
        # Validate required_fields and optional_fields are lists
        for field_name in ['required_fields', 'optional_fields']:
            if not isinstance(config[field_name], list):
                errors.append(f"{field_name} must be a list")
        
        return errors
    
    def get_platform_config(self, platform_key: str) -> Optional[Dict]:
        """Get configuration for a specific platform"""
        return self.configs.get(platform_key)
    
    def get_all_platforms(self) -> List[str]:
        """Get list of all configured platforms"""
        return list(self.configs.keys())
    
    def validate_platform_exists(self, platform_key: str) -> bool:
        """Check if a platform configuration exists"""
        return platform_key in self.configs
    
    def get_dataset_id(self, platform_key: str) -> Optional[str]:
        """Get dataset ID for a platform"""
        config = self.get_platform_config(platform_key)
        return config.get('dataset_id') if config else None
    
    def get_payload_structure(self, platform_key: str) -> Optional[Dict]:
        """Get payload structure for a platform"""
        config = self.get_platform_config(platform_key)
        return config.get('payload_structure') if config else None
    
    def get_discovery_params(self, platform_key: str) -> Optional[Dict]:
        """Get discovery parameters for a platform"""
        config = self.get_platform_config(platform_key)
        return config.get('discovery_params') if config else None
    
    def compare_with_database_configs(self) -> Dict[str, Dict]:
        """Compare configuration file with database BrightdataConfig records"""
        try:
            from brightdata_integration.models import BrightdataConfig
            
            results = {}
            db_configs = BrightdataConfig.objects.all()
            
            for platform_key, file_config in self.configs.items():
                platform_name = file_config.get('platform_name')
                service_type = file_config.get('service_type')
                
                # Find matching database config
                db_config = db_configs.filter(
                    platform=f"{platform_name}_{service_type}"
                ).first()
                
                comparison = {
                    'file_dataset_id': file_config.get('dataset_id'),
                    'db_dataset_id': db_config.dataset_id if db_config else None,
                    'db_exists': db_config is not None,
                    'match': False
                }
                
                if db_config and db_config.dataset_id == file_config.get('dataset_id'):
                    comparison['match'] = True
                
                results[platform_key] = comparison
            
            return results
            
        except ImportError:
            logger.error("Could not import BrightdataConfig model")
            return {}
    
    def generate_config_template(self, platform_name: str, service_type: str) -> Dict:
        """Generate a configuration template for a new platform"""
        return {
            "dataset_id": "REPLACE_WITH_ACTUAL_DATASET_ID",
            "platform_name": platform_name,
            "service_type": service_type,
            "content_type": "post",  # Default, adjust as needed
            "payload_structure": {
                "url": "direct_url"  # Default, adjust as needed
            },
            "url_extraction": {
                "field": f"{platform_name}_link",
                "method": "direct_url"  # or "extract_username_from_url"
            },
            "discovery_params": {
                "discover_by": "url"  # or "username", "user_name", etc.
            },
            "required_fields": ["url"],
            "optional_fields": [],
            "api_limitations": {
                "rate_limit": "requests_per_minute",
                "max_posts": 1000
            },
            "error_handling": {
                "retry_on_failure": true,
                "max_retries": 3
            }
        }


# Utility functions for easy access
def get_validator() -> PlatformConfigValidator:
    """Get a configured validator instance"""
    return PlatformConfigValidator()


def validate_configs() -> Dict[str, List[str]]:
    """Quick validation of all configurations"""
    validator = get_validator()
    return validator.validate_all_configs()


def get_platform_config(platform_key: str) -> Optional[Dict]:
    """Quick access to platform configuration"""
    validator = get_validator()
    return validator.get_platform_config(platform_key) 