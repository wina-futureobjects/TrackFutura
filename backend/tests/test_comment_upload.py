import os
import django
import requests
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from instagram_data.models import InstagramPost, InstagramComment, Folder

def test_comment_upload():
    print("=== Testing Instagram Comment Upload ===")
    
    # Find a comments folder
    comments_folder = Folder.objects.filter(category='comments').first()
    if not comments_folder:
        print("No comments folder found. Creating one for testing...")
        comments_folder = Folder.objects.create(
            name="Test Comments Folder",
            description="Test folder for comment uploads",
            category='comments'
        )
    
    print(f"Using folder: {comments_folder.name} (ID: {comments_folder.id}, Category: {comments_folder.category})")
    
    # Check initial counts
    initial_posts = InstagramPost.objects.filter(folder=comments_folder).count()
    initial_comments = InstagramComment.objects.filter(folder=comments_folder).count()
    
    print(f"Initial counts - Posts: {initial_posts}, Comments: {initial_comments}")
    
    # Test the API endpoint directly
    url = 'http://localhost:8000/api/instagram-data/comments/upload_csv/'
    
    # Create test CSV data
    csv_data = '''url,comment_user,comment_user_url,comment_date,comment,likes_number,replies_number,post_url,post_user,comment_id,post_id
https://www.instagram.com/test,test_user,https://www.instagram.com/test_user,2025-01-01T12:00:00.000Z,Test comment,5,0,https://www.instagram.com/p/TEST123/,test_post_user,test_comment_123,TEST123'''
    
    # Prepare the request
    files = {'file': ('test_comments.csv', csv_data, 'text/csv')}
    data = {'folder_id': str(comments_folder.id)}
    
    print(f"Sending request to: {url}")
    print(f"Folder ID: {comments_folder.id}")
    
    try:
        response = requests.post(url, files=files, data=data)
        print(f"Response status: {response.status_code}")
        print(f"Response content: {response.text}")
        
        if response.status_code == 200:
            # Check final counts
            final_posts = InstagramPost.objects.filter(folder=comments_folder).count()
            final_comments = InstagramComment.objects.filter(folder=comments_folder).count()
            
            print(f"Final counts - Posts: {final_posts}, Comments: {final_comments}")
            
            if final_comments > initial_comments:
                print("✅ SUCCESS: Comment was added to InstagramComment table!")
            elif final_posts > initial_posts:
                print("❌ FAILURE: Comment was incorrectly added to InstagramPost table!")
            else:
                print("❓ UNCLEAR: No new records were added")
        else:
            print(f"❌ FAILURE: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    test_comment_upload() 