from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
import random

class Command(BaseCommand):
    help = 'Create simple demo data without external dependencies'

    def handle(self, *args, **options):
        self.stdout.write('🚀 Creating simple demo data for client presentation...')

        try:
            # Create demo users
            demo_users = []
            for i in range(1, 6):
                user, created = User.objects.get_or_create(
                    username=f'demo_user_{i}',
                    defaults={
                        'email': f'demo{i}@trackfutura.com',
                        'first_name': f'Demo',
                        'last_name': f'User {i}',
                        'is_active': True,
                    }
                )
                if created:
                    user.set_password('demo123')
                    user.save()
                demo_users.append(user)
                self.stdout.write(f'✅ Created user: {user.username}')

            # Create admin user
            admin_user, created = User.objects.get_or_create(
                username='admin',
                defaults={
                    'email': 'admin@trackfutura.com',
                    'first_name': 'Admin',
                    'last_name': 'User',
                    'is_active': True,
                    'is_staff': True,
                    'is_superuser': True,
                }
            )
            if created:
                admin_user.set_password('admin123')
                admin_user.save()
            self.stdout.write(f'✅ Created admin: {admin_user.username}')

            # Create user profiles
            from users.models import UserProfile, Organization, Project, Company, UserRole, UnifiedUserRecord

            # Create demo company first
            company, created = Company.objects.get_or_create(
                name='Demo Company',
                defaults={
                    'description': 'Demo company for client presentation',
                    'status': 'active',
                }
            )
            self.stdout.write(f'✅ Created company: {company.name}')

            # Create demo organization
            org, created = Organization.objects.get_or_create(
                name='Demo Organization',
                defaults={
                    'description': 'Demo organization for client presentation',
                    'owner': admin_user,
                }
            )
            self.stdout.write(f'✅ Created organization: {org.name}')

            # Create demo project
            project, created = Project.objects.get_or_create(
                name='TrackFutura Demo Project',
                defaults={
                    'description': 'Demo project showcasing social media analytics',
                    'organization': org,
                    'owner': admin_user,
                }
            )
            self.stdout.write(f'✅ Created project: {project.name}')

            # Create user profiles and roles
            for i, user in enumerate(demo_users + [admin_user]):
                # Create UserProfile
                profile, created = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'company': company,
                    }
                )
                if created:
                    self.stdout.write(f'✅ Created profile for: {user.username}')

                # Create UserRole
                if user == admin_user:
                    role_type = 'super_admin'
                elif i == 0:  # First demo user as tenant admin
                    role_type = 'tenant_admin'
                else:
                    role_type = 'user'

                role, created = UserRole.objects.get_or_create(
                    user=user,
                    defaults={'role': role_type}
                )
                if created:
                    self.stdout.write(f'✅ Created role {role_type} for: {user.username}')

                # Create UnifiedUserRecord
                unified_record, created = UnifiedUserRecord.objects.get_or_create(
                    user=user,
                    defaults={
                        'name': f'{user.first_name} {user.last_name}'.strip() or user.username,
                        'email': user.email,
                        'company': company,
                        'role': role_type,
                        'status': 'active' if user.is_active else 'inactive',
                    }
                )
                if created:
                    self.stdout.write(f'✅ Created unified record for: {user.username}')

            # Create simple demo social media data
            from scrapy_integration.models import ScrapyJob, ScrapyResult

            platforms = ['instagram', 'facebook', 'linkedin', 'tiktok']
            for platform in platforms:
                for i in range(1, 4):
                    job, created = ScrapyJob.objects.get_or_create(
                        name=f'Demo {platform.title()} Job {i}',
                        defaults={
                            'platform': platform,
                            'status': 'completed',
                            'user': admin_user,
                            'project': project,
                            'spider_name': f'{platform}_spider',
                            'target_urls': [f'https://{platform}.com/demo_account_{i}'],
                        }
                    )
                    if created:
                        self.stdout.write(f'✅ Created {platform} job: {job.name}')

                        # Create demo results
                        for j in range(1, 3):
                            result, created = ScrapyResult.objects.get_or_create(
                                job=job,
                                item_id=f'demo_{platform}_{i}_{j}',
                                defaults={
                                    'data': {
                                        'post_id': f'demo_{platform}_{i}_{j}',
                                        'text': f'Demo {platform} post {j} from account {i}',
                                        'likes': random.randint(10, 1000),
                                        'comments': random.randint(1, 100),
                                        'shares': random.randint(0, 50),
                                        'timestamp': timezone.now().isoformat(),
                                        'author': f'demo_account_{i}',
                                        'url': f'https://{platform}.com/demo_account_{i}/post_{j}',
                                    },
                                    'platform': platform,
                                    'status': 'processed',
                                }
                            )
                            if created:
                                self.stdout.write(f'✅ Created {platform} result: {result.item_id}')

            # Create demo chat data
            from chat.models import ChatThread, ChatMessage

            chat_thread, created = ChatThread.objects.get_or_create(
                title='Demo AI Analysis Chat',
                defaults={
                    'user': admin_user,
                    'project': project,
                }
            )
            if created:
                self.stdout.write(f'✅ Created chat thread: {chat_thread.title}')

                # Create demo chat messages
                demo_messages = [
                    {'role': 'user', 'content': 'Analyze the social media performance for this project'},
                    {'role': 'assistant', 'content': 'Based on the demo data, I can see engagement across multiple platforms. Instagram shows strong visual content performance, while LinkedIn demonstrates professional networking reach. The overall sentiment appears positive with good engagement rates.'},
                    {'role': 'user', 'content': 'What are the trending topics?'},
                    {'role': 'assistant', 'content': 'The trending topics in your demo data include social media marketing, digital transformation, and brand engagement. These topics show consistent performance across platforms.'},
                ]

                for msg_data in demo_messages:
                    message, created = ChatMessage.objects.get_or_create(
                        thread=chat_thread,
                        role=msg_data['role'],
                        content=msg_data['content'],
                        defaults={
                            'timestamp': timezone.now(),
                        }
                    )
                    if created:
                        self.stdout.write(f'✅ Created chat message: {msg_data["role"]}')

            self.stdout.write(
                self.style.SUCCESS(f'🎉 Successfully created simple demo data!')
            )
            self.stdout.write(f'📊 Summary:')
            self.stdout.write(f'   - Users: {User.objects.count()}')
            self.stdout.write(f'   - User Profiles: {UserProfile.objects.count()}')
            self.stdout.write(f'   - User Roles: {UserRole.objects.count()}')
            self.stdout.write(f'   - Unified User Records: {UnifiedUserRecord.objects.count()}')
            self.stdout.write(f'   - Companies: {Company.objects.count()}')
            self.stdout.write(f'   - Organizations: {Organization.objects.count()}')
            self.stdout.write(f'   - Projects: {Project.objects.count()}')
            self.stdout.write(f'   - Scrapy Jobs: {ScrapyJob.objects.count()}')
            self.stdout.write(f'   - Scrapy Results: {ScrapyResult.objects.count()}')
            self.stdout.write(f'   - Chat Threads: {ChatThread.objects.count()}')
            self.stdout.write(f'   - Chat Messages: {ChatMessage.objects.count()}')

            # Test API endpoints by checking required relationships
            self.stdout.write(f'\n🔍 API Readiness Check:')
            users_with_profiles = User.objects.filter(profile__isnull=False).count()
            users_with_roles = User.objects.filter(global_role__isnull=False).count()
            superadmins = User.objects.filter(global_role__role='super_admin').count()

            self.stdout.write(f'   - Users with profiles: {users_with_profiles}/{User.objects.count()}')
            self.stdout.write(f'   - Users with roles: {users_with_roles}/{User.objects.count()}')
            self.stdout.write(f'   - Super admins: {superadmins}')

            if superadmins > 0:
                self.stdout.write(self.style.SUCCESS('✅ API endpoints should work - superadmin exists'))
            else:
                self.stdout.write(self.style.WARNING('⚠️ No superadmin found - admin APIs might fail'))

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error creating demo data: {str(e)}')
            )
            import traceback
            self.stdout.write(traceback.format_exc())