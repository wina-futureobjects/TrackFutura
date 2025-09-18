"""
Testing framework for BrightData platform configurations
Can be run independently or as part of Django tests
"""

import os
import sys
import json
import unittest
from typing import Dict, List

# Add Django to path if running independently
if 'DJANGO_SETTINGS_MODULE' not in os.environ:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from django.test import TestCase
from brightdata_integration.config_validator import PlatformConfigValidator


class PlatformConfigTestCase(TestCase):
    """Test cases for platform configuration validation"""
    
    def setUp(self):
        self.validator = PlatformConfigValidator()
    
    def test_config_file_exists(self):
        """Test that configuration file exists and is readable"""
        self.assertTrue(os.path.exists(self.validator.config_file_path))
        self.assertIsInstance(self.validator.configs, dict)
        self.assertGreater(len(self.validator.configs), 0)
    
    def test_all_platforms_valid(self):
        """Test that all platform configurations are valid"""
        results = self.validator.validate_all_configs()
        
        for platform_key, messages in results.items():
            with self.subTest(platform=platform_key):
                self.assertEqual(messages, ["✅ Valid"], 
                               f"Platform {platform_key} has validation errors: {messages}")
    
    def test_required_fields_present(self):
        """Test that all required fields are present in each configuration"""
        required_fields = [
            'dataset_id', 'platform_name', 'service_type', 'content_type',
            'payload_structure', 'url_extraction', 'discovery_params',
            'required_fields', 'optional_fields'
        ]
        
        for platform_key, config in self.validator.configs.items():
            with self.subTest(platform=platform_key):
                for field in required_fields:
                    self.assertIn(field, config, 
                                f"Platform {platform_key} missing required field: {field}")
    
    def test_dataset_id_format(self):
        """Test that dataset IDs are properly formatted"""
        for platform_key, config in self.validator.configs.items():
            with self.subTest(platform=platform_key):
                dataset_id = config.get('dataset_id')
                self.assertIsInstance(dataset_id, str, 
                                    f"Dataset ID for {platform_key} must be string")
                self.assertTrue(dataset_id.isdigit(), 
                              f"Dataset ID for {platform_key} must be digits only")
    
    def test_payload_structure_valid(self):
        """Test that payload structures are valid dictionaries"""
        for platform_key, config in self.validator.configs.items():
            with self.subTest(platform=platform_key):
                payload_structure = config.get('payload_structure')
                self.assertIsInstance(payload_structure, dict,
                                    f"Payload structure for {platform_key} must be dict")
                self.assertGreater(len(payload_structure), 0,
                                 f"Payload structure for {platform_key} cannot be empty")
    
    def test_url_extraction_valid(self):
        """Test that URL extraction configurations are valid"""
        for platform_key, config in self.validator.configs.items():
            with self.subTest(platform=platform_key):
                url_extraction = config.get('url_extraction')
                self.assertIsInstance(url_extraction, dict,
                                    f"URL extraction for {platform_key} must be dict")
                self.assertIn('field', url_extraction,
                            f"URL extraction for {platform_key} must have 'field' key")
                self.assertIn('method', url_extraction,
                            f"URL extraction for {platform_key} must have 'method' key")
    
    def test_discovery_params_valid(self):
        """Test that discovery parameters are valid"""
        for platform_key, config in self.validator.configs.items():
            with self.subTest(platform=platform_key):
                discovery_params = config.get('discovery_params')
                self.assertIsInstance(discovery_params, dict,
                                    f"Discovery params for {platform_key} must be dict")
                self.assertIn('discover_by', discovery_params,
                            f"Discovery params for {platform_key} must have 'discover_by' key")
    
    def test_platform_names_consistent(self):
        """Test that platform names are consistent with keys"""
        for platform_key, config in self.validator.configs.items():
            with self.subTest(platform=platform_key):
                expected_platform = platform_key.split('_')[0]
                actual_platform = config.get('platform_name')
                self.assertEqual(actual_platform, expected_platform,
                               f"Platform name mismatch for {platform_key}")
    
    def test_service_types_consistent(self):
        """Test that service types are consistent with keys"""
        for platform_key, config in self.validator.configs.items():
            with self.subTest(platform=platform_key):
                expected_service = platform_key.split('_')[1]
                actual_service = config.get('service_type')
                self.assertEqual(actual_service, expected_service,
                               f"Service type mismatch for {platform_key}")
    
    def test_unique_dataset_ids(self):
        """Test that dataset IDs are unique across platforms"""
        dataset_ids = []
        for platform_key, config in self.validator.configs.items():
            dataset_id = config.get('dataset_id')
            self.assertNotIn(dataset_id, dataset_ids,
                           f"Duplicate dataset ID {dataset_id} found for {platform_key}")
            dataset_ids.append(dataset_id)
    
    def test_platform_config_access(self):
        """Test platform configuration access methods"""
        for platform_key in self.validator.configs.keys():
            with self.subTest(platform=platform_key):
                # Test get_platform_config
                config = self.validator.get_platform_config(platform_key)
                self.assertIsNotNone(config)
                
                # Test get_dataset_id
                dataset_id = self.validator.get_dataset_id(platform_key)
                self.assertIsNotNone(dataset_id)
                self.assertEqual(dataset_id, config.get('dataset_id'))
                
                # Test get_payload_structure
                payload_structure = self.validator.get_payload_structure(platform_key)
                self.assertIsNotNone(payload_structure)
                self.assertEqual(payload_structure, config.get('payload_structure'))
                
                # Test get_discovery_params
                discovery_params = self.validator.get_discovery_params(platform_key)
                self.assertIsNotNone(discovery_params)
                self.assertEqual(discovery_params, config.get('discovery_params'))
    
    def test_template_generation(self):
        """Test configuration template generation"""
        template = self.validator.generate_config_template('test_platform', 'test_service')
        
        required_fields = [
            'dataset_id', 'platform_name', 'service_type', 'content_type',
            'payload_structure', 'url_extraction', 'discovery_params',
            'required_fields', 'optional_fields'
        ]
        
        for field in required_fields:
            self.assertIn(field, template, f"Template missing required field: {field}")
        
        self.assertEqual(template['platform_name'], 'test_platform')
        self.assertEqual(template['service_type'], 'test_service')
        self.assertEqual(template['dataset_id'], 'REPLACE_WITH_ACTUAL_DATASET_ID')


class PlatformConfigIntegrationTestCase(TestCase):
    """Integration tests for platform configuration with database"""
    
    def setUp(self):
        self.validator = PlatformConfigValidator()
    
    def test_database_comparison(self):
        """Test comparison with database configurations"""
        comparison = self.validator.compare_with_database_configs()
        
        # Should have comparison results for all platforms
        self.assertEqual(len(comparison), len(self.validator.configs))
        
        for platform_key, result in comparison.items():
            with self.subTest(platform=platform_key):
                # Each result should have expected keys
                self.assertIn('file_dataset_id', result)
                self.assertIn('db_exists', result)
                self.assertIn('match', result)
                
                # If database record exists, should have db_dataset_id
                if result['db_exists']:
                    self.assertIn('db_dataset_id', result)
    
    def test_platform_existence_validation(self):
        """Test platform existence validation"""
        for platform_key in self.validator.configs.keys():
            with self.subTest(platform=platform_key):
                self.assertTrue(self.validator.validate_platform_exists(platform_key))
        
        # Test non-existent platform
        self.assertFalse(self.validator.validate_platform_exists('non_existent_platform'))


def run_standalone_tests():
    """Run tests independently of Django test runner"""
    # Create test suite
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(PlatformConfigTestCase)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_standalone_tests()
    sys.exit(0 if success else 1) 