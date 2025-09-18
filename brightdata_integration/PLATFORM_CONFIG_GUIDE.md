# BrightData Platform Configuration Guide

This guide explains how to use the new configuration-driven system for BrightData platform integration.

## Overview

The platform configuration system provides a centralized, validated way to manage BrightData integrations for different social media platforms. This system is designed to be:

- **Zero-risk**: Does not affect existing functionality
- **Scalable**: Easy to add new platforms
- **Validated**: Comprehensive validation and testing
- **Documented**: Clear configuration structure

## File Structure

```
brightdata_integration/
├── configs/
│   └── platform_config.json          # Platform configurations
├── config_validator.py               # Configuration validator
├── test_configs.py                   # Testing framework
├── management/commands/
│   └── validate_platform_configs.py  # Django management command
└── PLATFORM_CONFIG_GUIDE.md          # This documentation
```

## Configuration File Format

Each platform configuration in `platform_config.json` follows this structure:

```json
{
  "platform_service": {
    "dataset_id": "1234567890",
    "platform_name": "platform",
    "service_type": "service",
    "content_type": "post",
    "payload_structure": {
      "field_name": "extraction_method"
    },
    "url_extraction": {
      "field": "platform_link",
      "method": "extract_username_from_url"
    },
    "discovery_params": {
      "discover_by": "field_name"
    },
    "required_fields": ["field1", "field2"],
    "optional_fields": ["field3"],
    "api_limitations": {
      "rate_limit": "requests_per_minute",
      "max_posts": 1000
    },
    "error_handling": {
      "retry_on_failure": true,
      "max_retries": 3
    }
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `dataset_id` | string | BrightData dataset ID (digits only) |
| `platform_name` | string | Platform name (e.g., "facebook") |
| `service_type` | string | Service type (e.g., "posts") |
| `content_type` | string | BrightData content type (e.g., "post") |
| `payload_structure` | object | How to build API payload |
| `url_extraction` | object | How to extract URL from TrackSource |
| `discovery_params` | object | BrightData discovery parameters |
| `required_fields` | array | Required fields in payload |
| `optional_fields` | array | Optional fields in payload |
| `api_limitations` | object | Platform-specific limitations |
| `error_handling` | object | Error handling configuration |

## Usage Examples

### 1. Validate All Configurations

```bash
python manage.py validate_platform_configs
```

### 2. Validate Specific Platform

```bash
python manage.py validate_platform_configs --platform facebook_posts
```

### 3. Compare with Database

```bash
python manage.py validate_platform_configs --compare-db
```

### 4. Generate Template for New Platform

```bash
python manage.py validate_platform_configs --generate-template twitter_posts
```

### 5. Output Results to File

```bash
python manage.py validate_platform_configs --output validation_results.json
```

## Adding a New Platform

### Step 1: Generate Configuration Template

```bash
python manage.py validate_platform_configs --generate-template new_platform_service
```

### Step 2: Edit Configuration

1. Copy the generated template
2. Replace `REPLACE_WITH_ACTUAL_DATASET_ID` with actual BrightData dataset ID
3. Update payload structure based on BrightData API requirements
4. Set correct URL extraction method
5. Configure discovery parameters

### Step 3: Validate Configuration

```bash
python manage.py validate_platform_configs --platform new_platform_service
```

### Step 4: Test Integration

```bash
python manage.py test brightdata_integration.test_configs
```

## Platform-Specific Requirements

### Facebook Posts
- **Payload**: `{"url": "direct_url"}`
- **Discovery**: `{"discover_by": "url"}`
- **URL Extraction**: Use Facebook URL directly

### Instagram Posts
- **Payload**: `{"username": "extracted_username"}`
- **Discovery**: `{"discover_by": "username"}`
- **URL Extraction**: Extract username from Instagram URL

### LinkedIn Posts
- **Payload**: `{"url": "direct_url"}`
- **Discovery**: `{"discover_by": "url"}`
- **URL Extraction**: Use LinkedIn URL directly

### TikTok Posts
- **Payload**: `{"URL": "direct_url"}` (note: uppercase "URL")
- **Discovery**: `{"discover_by": "url"}`
- **URL Extraction**: Use TikTok URL directly

## Validation Rules

The system validates the following:

1. **Required Fields**: All required fields must be present
2. **Data Types**: Fields must have correct data types
3. **Dataset ID Format**: Must be string of digits only
4. **Platform Consistency**: Platform names must match keys
5. **Service Consistency**: Service types must match keys
6. **Unique Dataset IDs**: No duplicate dataset IDs allowed
7. **Payload Structure**: Must be valid dictionary
8. **URL Extraction**: Must have field and method keys
9. **Discovery Params**: Must have discover_by key

## Testing

### Run All Tests

```bash
python manage.py test brightdata_integration.test_configs
```

### Run Standalone Tests

```bash
python brightdata_integration/test_configs.py
```

### Test Coverage

The test suite covers:

- Configuration file existence and readability
- All platform configurations validation
- Required fields presence
- Data type validation
- Platform name consistency
- Service type consistency
- Dataset ID uniqueness
- Configuration access methods
- Template generation
- Database integration

## Integration with Existing System

The configuration system is designed to work alongside the existing hardcoded system:

1. **No Breaking Changes**: Existing code continues to work
2. **Feature Flags**: Can be enabled/disabled via settings
3. **Gradual Migration**: Can be adopted platform by platform
4. **Easy Rollback**: Can revert to old system if needed

## Troubleshooting

### Common Issues

1. **Configuration File Not Found**
   - Ensure `platform_config.json` exists in `configs/` directory
   - Check file permissions

2. **Validation Errors**
   - Run validation command to see specific errors
   - Check required fields are present
   - Verify data types are correct

3. **Database Mismatch**
   - Use `--compare-db` flag to check database consistency
   - Update database records if needed

4. **Dataset ID Issues**
   - Ensure dataset ID is string of digits only
   - Verify dataset ID exists in BrightData
   - Check for duplicate dataset IDs

### Debug Commands

```bash
# Check configuration file syntax
python -m json.tool brightdata_integration/configs/platform_config.json

# Validate specific platform with details
python manage.py validate_platform_configs --platform facebook_posts

# Compare with database
python manage.py validate_platform_configs --compare-db

# Run tests with verbose output
python manage.py test brightdata_integration.test_configs -v 2
```

## Future Enhancements

Planned improvements for the configuration system:

1. **Dynamic Configuration**: Database-driven configurations
2. **Platform Service Classes**: Object-oriented platform handling
3. **Automated Testing**: API connection testing
4. **Performance Monitoring**: Configuration performance metrics
5. **Self-Healing**: Automatic error recovery
6. **Configuration UI**: Web interface for configuration management

## Support

For issues or questions about the platform configuration system:

1. Check this documentation
2. Run validation commands
3. Review test output
4. Check Django logs for errors
5. Verify BrightData API documentation 