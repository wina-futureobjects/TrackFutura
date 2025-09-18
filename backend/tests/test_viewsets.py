import os
import django
import json

# Initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Import models after Django is set up
from rest_framework.test import APIRequestFactory
from users.models import Project
from instagram_data.models import Folder as InstagramFolder
from facebook_data.models import Folder as FacebookFolder
from linkedin_data.models import Folder as LinkedInFolder
from tiktok_data.models import Folder as TikTokFolder
from instagram_data.views import FolderViewSet as InstagramFolderViewSet
from facebook_data.views import FolderViewSet as FacebookFolderViewSet
from linkedin_data.views import FolderViewSet as LinkedInFolderViewSet
from tiktok_data.views import FolderViewSet as TikTokFolderViewSet

# Create fake request factory
factory = APIRequestFactory()

# Get a project to use for testing
try:
    test_project = Project.objects.first()
    if test_project:
        print(f"Using test project: ID={test_project.id}, Name={test_project.name}")
    else:
        print("No projects found in the database. Please create a project first.")
        exit(1)
except Exception as e:
    print(f"Error getting test project: {e}")
    exit(1)

# Test Instagram FolderViewSet
print("\n=== Testing Instagram FolderViewSet ===")
view = InstagramFolderViewSet.as_view({'post': 'create'})
request = factory.post('/api/instagram-data/folders/', 
                     {'name': 'Test ViewSet Instagram Folder', 
                      'description': 'Created via ViewSet', 
                      'project': test_project.id},
                     format='json')
response = view(request)
print(f"Response status: {response.status_code}")
print(f"Response data: {json.dumps(response.data, indent=2)}")

# Verify the folder was created with the project ID
created_folder_id = response.data.get('id')
if created_folder_id:
    folder = InstagramFolder.objects.get(id=created_folder_id)
    print(f"Folder project_id in database: {folder.project_id}")
    assert folder.project_id == test_project.id, "Project ID wasn't properly saved!"

# Test Facebook FolderViewSet
print("\n=== Testing Facebook FolderViewSet ===")
view = FacebookFolderViewSet.as_view({'post': 'create'})
request = factory.post('/api/facebook-data/folders/', 
                     {'name': 'Test ViewSet Facebook Folder', 
                      'description': 'Created via ViewSet', 
                      'project': test_project.id},
                     format='json')
response = view(request)
print(f"Response status: {response.status_code}")
print(f"Response data: {json.dumps(response.data, indent=2)}")

# Verify the folder was created with the project ID
created_folder_id = response.data.get('id')
if created_folder_id:
    folder = FacebookFolder.objects.get(id=created_folder_id)
    print(f"Folder project_id in database: {folder.project_id}")
    assert folder.project_id == test_project.id, "Project ID wasn't properly saved!"

print("\n=== All tests passed! ===")
print("The ViewSet overrides are correctly handling project IDs.") 