#!/usr/bin/env python
"""
Simple Data Migration Script - Import CSV data into Django models
"""
import os
import sys
import django
import pandas as pd
import json
from datetime import datetime
from django.utils import timezone
from django.utils.dateparse import parse_datetime

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from instagram_data.models import InstagramPost, Folder as InstagramFolder
from linkedin_data.models import LinkedInPost, Folder as LinkedInFolder
from users.models import Project, User

def get_or_create_default_project():
    """Get or create a default project for migration"""
    user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@trackfutura.com',
            'first_name': 'System',
            'last_name': 'Admin'
        }
    )

    project, created = Project.objects.get_or_create(
        name='Migrated Data',
        defaults={
            'description': 'Data migrated from CSV files',
            'owner': user
        }
    )
    return project

def get_or_create_folder(model_class, name, category, project):
    """Get or create a folder for organizing data"""
    folder, created = model_class.objects.get_or_create(
        name=name,
        category=category,
        project=project,
        defaults={
            'description': f'Migrated {category} data',
            'folder_type': 'content'
        }
    )
    return folder

def parse_date(date_str):
    """Parse date string to datetime object"""
    if not date_str or pd.isna(date_str):
        return None

    try:
        if 'T' in str(date_str):
            return parse_datetime(str(date_str))

        for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y']:
            try:
                return timezone.make_aware(datetime.strptime(str(date_str), fmt))
            except ValueError:
                continue
        return None
    except Exception as e:
        print(f"Error parsing date '{date_str}': {e}")
        return None

def parse_json_field(value):
    """Parse JSON field safely"""
    if not value or pd.isna(value):
        return None

    if isinstance(value, (list, dict)):
        return value

    try:
        return json.loads(str(value))
    except json.JSONDecodeError:
        if str(value).startswith('[') and str(value).endswith(']'):
            try:
                clean_str = str(value).strip('[]').replace("'", "").replace('"', '')
                if clean_str:
                    return [item.strip() for item in clean_str.split(',') if item.strip()]
                return []
            except:
                return [str(value)]
        return [str(value)] if str(value) else None

def migrate_instagram_data():
    """Migrate Instagram data from CSV files"""
    print("Migrating Instagram data...")

    project = get_or_create_default_project()
    folder = get_or_create_folder(InstagramFolder, "Migrated Instagram Posts", "posts", project)

    csv_files = [
        'test_export.csv',
        'final_test_export.csv'
    ]

    total_imported = 0

    for csv_file in csv_files:
        if os.path.exists(csv_file):
            print(f"Processing {csv_file}...")

            try:
                df = pd.read_csv(csv_file)
                print(f"   Found {len(df)} rows")

                for index, row in df.iterrows():
                    try:
                        post_data = {
                            'folder': folder,
                            'url': row.get('Post URL', ''),
                            'user_posted': row.get('Username', '') or row.get('User Full Name', ''),
                            'description': row.get('Caption', ''),
                            'hashtags': parse_json_field(row.get('Hashtags', '')),
                            'num_comments': int(row.get('Comments Count', 0) or 0),
                            'date_posted': parse_date(row.get('Timestamp', '')),
                            'likes': int(row.get('Likes', 0) or 0),
                            'views': int(row.get('Views', 0) or 0) if row.get('Views') else None,
                            'post_id': str(row.get('Post URL', '')).split('/')[-2] if row.get('Post URL') else f"migrated_{index}",
                            'content_type': row.get('Media Type', '').lower(),
                            'videos': parse_json_field(row.get('Video URLs', '')),
                            'photos': parse_json_field(row.get('Image URLs', '')),
                            'latest_comments': parse_json_field(row.get('All Comments (JSON)', '')),
                        }

                        post, created = InstagramPost.objects.get_or_create(
                            post_id=post_data['post_id'],
                            folder=folder,
                            defaults=post_data
                        )

                        if created:
                            total_imported += 1
                            if total_imported % 100 == 0:
                                print(f"   Imported {total_imported} posts...")

                    except Exception as e:
                        print(f"   Error processing row {index}: {e}")
                        continue

            except Exception as e:
                print(f"   Error reading {csv_file}: {e}")

    print(f"Instagram migration complete: {total_imported} posts imported")
    return total_imported

def migrate_linkedin_data():
    """Migrate LinkedIn data from JSON files"""
    print("Migrating LinkedIn data...")

    project = get_or_create_default_project()
    folder = get_or_create_folder(LinkedInFolder, "Migrated LinkedIn Posts", "posts", project)

    json_files = [
        'backend/transformed_linkedin_posts.json',
        'transformed_linkedin_posts.json'
    ]

    total_imported = 0

    for json_file in json_files:
        if os.path.exists(json_file):
            print(f"Processing {json_file}...")

            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                if isinstance(data, list):
                    posts = data
                else:
                    posts = [data]

                print(f"   Found {len(posts)} posts")

                for index, post_data in enumerate(posts):
                    try:
                        metadata = post_data.get('metadata', {})

                        post_obj_data = {
                            'folder': folder,
                            'url': metadata.get('url', ''),
                            'post_id': metadata.get('post_id', f"migrated_{index}"),
                            'user_posted': metadata.get('user_name', ''),
                            'user_url': metadata.get('user_url', ''),
                            'description': post_data.get('chunk_text', ''),
                            'date_posted': parse_date(metadata.get('date_posted', '')),
                            'platform_type': 'linkedin',
                            'content_type': 'post',
                        }

                        post, created = LinkedInPost.objects.get_or_create(
                            post_id=post_obj_data['post_id'],
                            folder=folder,
                            defaults=post_obj_data
                        )

                        if created:
                            total_imported += 1
                            if total_imported % 100 == 0:
                                print(f"   Imported {total_imported} posts...")

                    except Exception as e:
                        print(f"   Error processing post {index}: {e}")
                        continue

            except Exception as e:
                print(f"   Error reading {json_file}: {e}")

    print(f"LinkedIn migration complete: {total_imported} posts imported")
    return total_imported

def main():
    """Main migration function"""
    print("Starting data migration from CSV/JSON to database...")
    print("=" * 60)

    try:
        instagram_count = migrate_instagram_data()
        print()
        linkedin_count = migrate_linkedin_data()
        print()
        print("=" * 60)
        print(f"Migration complete!")
        print(f"   Instagram posts: {instagram_count}")
        print(f"   LinkedIn posts: {linkedin_count}")
        print(f"   Total: {instagram_count + linkedin_count}")
        print()
        print("Your data is now in the database and ready for deployment!")

    except Exception as e:
        print(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()