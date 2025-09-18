from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth.models import User
import os

class Command(BaseCommand):
    help = 'Force load demo data regardless of existing data'

    def handle(self, *args, **options):
        self.stdout.write('🚀 Force loading TrackFutura demo data...')

        try:
            # Try multiple possible paths for the fixture file
            possible_paths = [
                'fixtures/sample_data_export.json',
                'backend/fixtures/sample_data_export.json',
                '/app/backend/fixtures/sample_data_export.json',
                os.path.join(os.path.dirname(__file__), '..', '..', '..', 'fixtures', 'sample_data_export.json'),
            ]

            fixture_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    fixture_path = path
                    break

            if fixture_path:
                self.stdout.write(f'📁 Loading fixture from: {fixture_path}')
                call_command('loaddata', fixture_path)
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Successfully force-loaded demo data from {fixture_path}')
                )

                # Display what was loaded
                user_count = User.objects.count()
                self.stdout.write(f'📊 Total users in database: {user_count}')

                # Check for demo data
                from users.models import UserProfile
                from chat.models import ChatThread
                from facebook_data.models import FacebookPost
                from instagram_data.models import InstagramPost
                from linkedin_data.models import LinkedinPost
                from tiktok_data.models import TiktokPost

                profiles = UserProfile.objects.count()
                chats = ChatThread.objects.count()
                fb_posts = FacebookPost.objects.count()
                ig_posts = InstagramPost.objects.count()
                li_posts = LinkedinPost.objects.count()
                tt_posts = TiktokPost.objects.count()

                self.stdout.write(f'📈 Demo data loaded:')
                self.stdout.write(f'   - User Profiles: {profiles}')
                self.stdout.write(f'   - Chat Threads: {chats}')
                self.stdout.write(f'   - Facebook Posts: {fb_posts}')
                self.stdout.write(f'   - Instagram Posts: {ig_posts}')
                self.stdout.write(f'   - LinkedIn Posts: {li_posts}')
                self.stdout.write(f'   - TikTok Posts: {tt_posts}')

            else:
                self.stdout.write(
                    self.style.ERROR(f'❌ No fixture file found in any of these paths: {possible_paths}')
                )
                # List what files exist in the current directory
                current_files = os.listdir('.')
                self.stdout.write(f'📂 Current directory files: {current_files}')

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error loading demo data: {str(e)}')
            )
            import traceback
            self.stdout.write(traceback.format_exc())