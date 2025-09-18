import os
import time
import subprocess
import json
import requests
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

class Command(BaseCommand):
    help = 'Start ngrok tunnel for webhook testing and display configuration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--port',
            type=int,
            default=8000,
            help='Port to expose (default: 8000)',
        )
        parser.add_argument(
            '--subdomain',
            type=str,
            help='Custom subdomain (requires ngrok auth)',
        )
        parser.add_argument(
            '--region',
            type=str,
            default='us',
            choices=['us', 'eu', 'ap', 'au', 'sa', 'jp', 'in'],
            help='Ngrok region (default: us)',
        )
        parser.add_argument(
            '--auth-token',
            type=str,
            help='Ngrok auth token',
        )
        parser.add_argument(
            '--kill',
            action='store_true',
            help='Kill existing ngrok processes',
        )
        parser.add_argument(
            '--status',
            action='store_true',
            help='Show ngrok tunnel status',
        )

    def handle(self, *args, **options):
        if options['kill']:
            self.kill_ngrok()
            return

        if options['status']:
            self.show_status()
            return

        try:
            self.start_ngrok(options)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\nStopping ngrok...'))
            self.kill_ngrok()

    def kill_ngrok(self):
        """Kill existing ngrok processes"""
        try:
            if os.name == 'nt':  # Windows
                subprocess.run(['taskkill', '/f', '/im', 'ngrok.exe'],
                             capture_output=True, check=False)
            else:  # Unix/Linux/macOS
                subprocess.run(['pkill', '-f', 'ngrok'],
                             capture_output=True, check=False)
            self.stdout.write(self.style.SUCCESS('Killed existing ngrok processes'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error killing ngrok: {e}'))

    def show_status(self):
        """Show current ngrok tunnel status"""
        try:
            response = requests.get('http://localhost:4040/api/tunnels', timeout=5)
            if response.status_code == 200:
                tunnels = response.json().get('tunnels', [])
                if tunnels:
                    self.stdout.write(self.style.SUCCESS('Active ngrok tunnels:'))
                    for tunnel in tunnels:
                        self.stdout.write(
                            f"  {tunnel['proto']}: {tunnel['public_url']} -> {tunnel['config']['addr']}"
                        )

                        # Show webhook URLs if HTTP/HTTPS tunnel
                        if tunnel['proto'] in ['http', 'https']:
                            webhook_url = f"{tunnel['public_url']}/api/brightdata/webhook/"
                            notify_url = f"{tunnel['public_url']}/api/brightdata/notify/"
                            self.stdout.write(f"    Webhook URL: {webhook_url}")
                            self.stdout.write(f"    Notify URL: {notify_url}")
                else:
                    self.stdout.write(self.style.WARNING('No active tunnels'))
            else:
                self.stdout.write(self.style.ERROR('Ngrok not running or API not accessible'))
        except requests.exceptions.RequestException:
            self.stdout.write(self.style.ERROR('Ngrok not running'))

    def check_ngrok_installed(self):
        """Check if ngrok is installed"""
        try:
            result = subprocess.run(['ngrok', 'version'],
                                  capture_output=True, text=True, check=True)
            version = result.stdout.strip()
            self.stdout.write(f"Found {version}")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            self.stdout.write(self.style.ERROR(
                'ngrok not found. Please install ngrok:\n'
                '  - Download from: https://ngrok.com/download\n'
                '  - Or install via package manager:\n'
                '    - macOS: brew install ngrok\n'
                '    - Windows: choco install ngrok\n'
                '    - Linux: snap install ngrok'
            ))
            return False

    def setup_auth_token(self, auth_token):
        """Set up ngrok auth token"""
        try:
            subprocess.run(['ngrok', 'config', 'add-authtoken', auth_token],
                         check=True, capture_output=True)
            self.stdout.write(self.style.SUCCESS('Auth token configured'))
        except subprocess.CalledProcessError as e:
            raise CommandError(f'Failed to set auth token: {e}')

    def start_ngrok(self, options):
        """Start ngrok tunnel"""
        if not self.check_ngrok_installed():
            return

        port = options['port']
        subdomain = options['subdomain']
        region = options['region']
        auth_token = options['auth_token']

        # Set up auth token if provided
        if auth_token:
            self.setup_auth_token(auth_token)
        elif hasattr(settings, 'NGROK_AUTH_TOKEN') and settings.NGROK_AUTH_TOKEN:
            self.setup_auth_token(settings.NGROK_AUTH_TOKEN)

        # Build ngrok command
        cmd = ['ngrok', 'http', str(port), '--region', region]

        if subdomain:
            cmd.extend(['--subdomain', subdomain])
        elif hasattr(settings, 'NGROK_SUBDOMAIN') and settings.NGROK_SUBDOMAIN:
            cmd.extend(['--subdomain', settings.NGROK_SUBDOMAIN])

        self.stdout.write(
            self.style.SUCCESS(f'Starting ngrok tunnel on port {port}...')
        )

        # Kill existing ngrok processes
        self.kill_ngrok()
        time.sleep(1)

        try:
            # Start ngrok in background
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            # Wait for ngrok to start up
            self.stdout.write('Waiting for ngrok to start...')
            for i in range(10):
                time.sleep(1)
                try:
                    response = requests.get('http://localhost:4040/api/tunnels', timeout=2)
                    if response.status_code == 200:
                        break
                except requests.exceptions.RequestException:
                    continue
            else:
                raise CommandError('Ngrok failed to start after 10 seconds')

            # Get tunnel information
            tunnels = response.json().get('tunnels', [])
            if not tunnels:
                raise CommandError('No tunnels created')

            # Display tunnel information
            self.stdout.write(self.style.SUCCESS('\n=== Ngrok Tunnel Started ==='))

            https_url = None
            for tunnel in tunnels:
                self.stdout.write(
                    f"{tunnel['proto'].upper()}: {tunnel['public_url']}"
                )
                if tunnel['proto'] == 'https':
                    https_url = tunnel['public_url']

            if https_url:
                self.stdout.write(self.style.SUCCESS(f'\n=== BrightData Configuration ==='))
                webhook_url = f"{https_url}/api/brightdata/webhook/"
                notify_url = f"{https_url}/api/brightdata/notify/"

                self.stdout.write(f"Webhook URL: {webhook_url}")
                self.stdout.write(f"Notify URL: {notify_url}")
                self.stdout.write(f"Auth Token: {getattr(settings, 'BRIGHTDATA_WEBHOOK_TOKEN', 'your-webhook-token')}")

                self.stdout.write(self.style.SUCCESS(f'\n=== Test Commands ==='))
                self.stdout.write(f"Test webhook:")
                self.stdout.write(f"  curl -X POST {webhook_url} \\")
                self.stdout.write(f"       -H \"Authorization: Bearer {getattr(settings, 'BRIGHTDATA_WEBHOOK_TOKEN', 'your-token')}\" \\")
                self.stdout.write(f"       -H \"Content-Type: application/json\" \\")
                self.stdout.write(f"       -d '{{'\"test\": true, \"timestamp\": \"{int(time.time())}\"}}'")

                self.stdout.write(f"\nTest security:")
                self.stdout.write(f"  python manage.py test_brightdata_setup --test-webhook")

                # Update environment variable for other parts of the application
                os.environ['NGROK_URL'] = https_url

            self.stdout.write(
                self.style.WARNING(f'\nNgrok Web Interface: http://localhost:4040')
            )
            self.stdout.write(
                self.style.WARNING('Press Ctrl+C to stop the tunnel\n')
            )

            # Keep running until interrupted
            try:
                while True:
                    time.sleep(1)
                    # Check if process is still running
                    if process.poll() is not None:
                        stdout, stderr = process.communicate()
                        if stderr:
                            self.stdout.write(self.style.ERROR(f'Ngrok error: {stderr.decode()}'))
                        break
            except KeyboardInterrupt:
                pass
            finally:
                # Clean up
                process.terminate()
                self.kill_ngrok()

        except subprocess.CalledProcessError as e:
            raise CommandError(f'Failed to start ngrok: {e}')
        except Exception as e:
            raise CommandError(f'Error: {e}')
