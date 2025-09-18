"""
Django management command to validate BrightData platform configurations
"""

from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
from brightdata_integration.config_validator import PlatformConfigValidator
import json


class Command(BaseCommand):
    help = 'Validate BrightData platform configurations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--platform',
            type=str,
            help='Validate specific platform configuration'
        )
        parser.add_argument(
            '--compare-db',
            action='store_true',
            help='Compare configuration file with database records'
        )
        parser.add_argument(
            '--generate-template',
            type=str,
            help='Generate configuration template for new platform (format: platform_service)'
        )
        parser.add_argument(
            '--output',
            type=str,
            help='Output file for results (JSON format)'
        )

    def handle(self, *args, **options):
        validator = PlatformConfigValidator()
        
        # Generate template for new platform
        if options['generate_template']:
            platform_service = options['generate_template']
            if '_' not in platform_service:
                raise CommandError('Platform format must be: platform_service (e.g., twitter_posts)')
            
            platform_name, service_type = platform_service.split('_', 1)
            template = validator.generate_config_template(platform_name, service_type)
            
            self.stdout.write(
                self.style.SUCCESS(f'Configuration template for {platform_service}:')
            )
            self.stdout.write(json.dumps(template, indent=2))
            return
        
        # Validate specific platform
        if options['platform']:
            platform_key = options['platform']
            if not validator.validate_platform_exists(platform_key):
                raise CommandError(f'Platform configuration not found: {platform_key}')
            
            config = validator.get_platform_config(platform_key)
            errors = validator.validate_platform_config(platform_key, config)
            
            if errors:
                self.stdout.write(
                    self.style.ERROR(f'❌ Validation failed for {platform_key}:')
                )
                for error in errors:
                    self.stdout.write(f'  - {error}')
            else:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ {platform_key} configuration is valid')
                )
            
            # Show configuration details
            self.stdout.write('\nConfiguration details:')
            self.stdout.write(f'  Dataset ID: {config.get("dataset_id")}')
            self.stdout.write(f'  Platform: {config.get("platform_name")}')
            self.stdout.write(f'  Service: {config.get("service_type")}')
            self.stdout.write(f'  Content Type: {config.get("content_type")}')
            
            return
        
        # Compare with database
        if options['compare_db']:
            self.stdout.write('Comparing configuration file with database records...')
            comparison = validator.compare_with_database_configs()
            
            for platform_key, result in comparison.items():
                if result['match']:
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ {platform_key}: File and DB match')
                    )
                elif result['db_exists']:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠️  {platform_key}: Dataset ID mismatch '
                            f'(File: {result["file_dataset_id"]}, DB: {result["db_dataset_id"]})'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f'❌ {platform_key}: No database record found')
                    )
            
            return
        
        # Validate all configurations
        self.stdout.write('Validating all platform configurations...')
        results = validator.validate_all_configs()
        
        all_valid = True
        output_data = {}
        
        for platform_key, messages in results.items():
            if messages == ["✅ Valid"]:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ {platform_key}: Valid')
                )
                output_data[platform_key] = {'status': 'valid', 'errors': []}
            else:
                all_valid = False
                self.stdout.write(
                    self.style.ERROR(f'❌ {platform_key}:')
                )
                for error in messages:
                    self.stdout.write(f'  - {error}')
                output_data[platform_key] = {'status': 'invalid', 'errors': messages}
        
        # Summary
        if all_valid:
            self.stdout.write(
                self.style.SUCCESS('\n🎉 All platform configurations are valid!')
            )
        else:
            self.stdout.write(
                self.style.ERROR('\n❌ Some platform configurations have errors.')
            )
        
        # Output to file if requested
        if options['output']:
            with open(options['output'], 'w') as f:
                json.dump(output_data, f, indent=2)
            self.stdout.write(
                self.style.SUCCESS(f'Results saved to: {options["output"]}')
            )
        
        # Show available platforms
        platforms = validator.get_all_platforms()
        self.stdout.write(f'\nAvailable platforms: {", ".join(platforms)}')
        
        if not all_valid:
            raise CommandError('Configuration validation failed') 