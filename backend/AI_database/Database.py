from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="pcsk_78mXZf_N5w38HcHeJD6MniEjw3BBdiEGTpATqAyzhAWKnRZcsWjwASQnXwYkYf5r1hk5hA")


#Create index
index_name = "testing-py"

# Delete existing index if it exists (to recreate with correct field mapping)
if pc.has_index(index_name):
    print(f"Deleting existing index: {index_name}")
    pc.delete_index(index_name)
    print("Waiting for index deletion to complete...")
    import time
    time.sleep(10)  # Wait for deletion to complete

# Create new index with correct configuration
print(f"Creating new index: {index_name}")
pc.create_index_for_model(
    name=index_name,
    cloud="aws",
    region="us-east-1",
    embed={
        "model":"llama-text-embed-v2",
        "field_map":{"text": "text"}
    }
)
    
    
#Upsert records
# index = pc.Index(index_name)  

import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import time

def clean_text(text: Optional[str]) -> str:
    """Clean and normalize text content."""
    if not text:
        return ""
    
    # Remove HTML entities and tags
    text = text.replace("&#x2014;", "—")
    text = text.replace("&#x2019;", "'")
    text = text.replace("&quot;", '"')
    text = text.replace("&apos;", "'")
    text = text.replace("&amp;", "&")
    text = text.replace("<br/>", " ")
    text = text.replace("<br>", " ")
    
    # Remove HTML tags (simple approach)
    import re
    text = re.sub(r'<[^>]+>', '', text)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    return text.strip()

def extract_content_text(post: Dict[str, Any]) -> str:
    """Extract and combine all content fields for embedding."""
    content_parts = []
    
    # Primary content
    if post.get('title'):
        content_parts.append(f"Title: {clean_text(post['title'])}")
    
    if post.get('post_text'):
        content_parts.append(f"Post: {clean_text(post['post_text'])}")
    
    # User context
    if post.get('headline'):
        content_parts.append(f"User: {clean_text(post['headline'])}")
    
    if post.get('user_title'):
        content_parts.append(f"Position: {clean_text(post['user_title'])}")
    
    # Hashtags
    if post.get('hashtags'):
        hashtags_str = ' '.join(post['hashtags']) if isinstance(post['hashtags'], list) else str(post['hashtags'])
        content_parts.append(f"Tags: {clean_text(hashtags_str)}")
    
    # Repost content
    repost = post.get('repost', {})
    if repost and repost.get('repost_text'):
        content_parts.append(f"Repost: {clean_text(repost['repost_text'])}")
    
    # External link data
    external_links = post.get('external_link_data', [])
    if external_links:
        for link_data in external_links:
            if link_data.get('post_external_title'):
                content_parts.append(f"Link Title: {clean_text(link_data['post_external_title'])}")
            if link_data.get('post_external_description'):
                content_parts.append(f"Link Description: {clean_text(link_data['post_external_description'])}")
    
    # Comments
    comments = post.get('top_visible_comments', [])
    if comments:
        comment_texts = []
        for comment in comments:
            if comment.get('comment'):
                comment_text = clean_text(comment['comment'])
                if comment_text:
                    comment_texts.append(comment_text)
        
        if comment_texts:
            # Limit comments to avoid overly long content
            max_comments = 3
            selected_comments = comment_texts[:max_comments]
            content_parts.append(f"Comments: {' | '.join(selected_comments)}")
    
    return ' | '.join(content_parts)

def extract_metadata(post: Dict[str, Any]) -> Dict[str, Any]:
    """Extract metadata from the post."""
    metadata = {}
    
    # Basic identifiers
    metadata['url'] = post.get('url')
    metadata['user_id'] = post.get('user_id')
    metadata['user_url'] = post.get('use_url')
    
    # Post classification
    metadata['post_type'] = post.get('post_type')
    metadata['account_type'] = post.get('account_type')
    
    # Temporal data
    if post.get('date_posted'):
        metadata['date_posted'] = post['date_posted']
        # Extract date components for filtering
        try:
            dt = datetime.fromisoformat(post['date_posted'].replace('Z', '+00:00'))
            metadata['year'] = dt.year
            metadata['month'] = dt.month
            metadata['day_of_week'] = dt.strftime('%A')
        except:
            pass
    
    # Engagement metrics
    metadata['num_likes'] = post.get('num_likes', 0)
    metadata['num_comments'] = post.get('num_comments', 0)
    metadata['user_followers'] = post.get('user_followers')
    metadata['num_connections'] = post.get('num_connections')
    metadata['user_posts'] = post.get('user_posts', 0)
    metadata['user_articles'] = post.get('user_articles', 0)
    
    # Media presence flags
    metadata['has_images'] = bool(post.get('images'))
    metadata['has_videos'] = bool(post.get('videos'))
    metadata['has_documents'] = bool(post.get('document_cover_image'))
    
    if post.get('video_duration'):
        metadata['video_duration'] = post['video_duration']
    
    # Links and external content
    embedded_links = post.get('embedded_links', [])
    metadata['num_embedded_links'] = len(embedded_links) if embedded_links else 0
    metadata['has_external_links'] = bool(post.get('external_link_data'))
    
    # Tagged entities
    tagged_companies = post.get('tagged_companies', [])
    tagged_people = post.get('tagged_people', [])
    metadata['num_tagged_companies'] = len(tagged_companies) if tagged_companies else 0
    metadata['num_tagged_people'] = len(tagged_people) if tagged_people else 0
    
    if tagged_companies:
        company_names = [comp.get('name') for comp in tagged_companies if comp.get('name')]
        metadata['tagged_company_names'] = ', '.join(company_names) if company_names else ''
    
    if tagged_people:
        people_names = [person.get('name') for person in tagged_people if person.get('name')]
        metadata['tagged_people_names'] = ', '.join(people_names) if people_names else ''
    
    # Repost information
    repost = post.get('repost', {})
    metadata['is_repost'] = bool(repost and any(repost.values()))
    if metadata['is_repost']:
        if repost.get('repost_user_name'):
            metadata['original_author'] = repost['repost_user_name']
        if repost.get('repost_date'):
            metadata['original_post_date'] = repost['repost_date']
    
    # Comment analysis
    comments = post.get('top_visible_comments', [])
    if comments:
        metadata['top_comments_count'] = len(comments)
        metadata['total_comment_reactions'] = sum(
            comment.get('num_reactions', 0) for comment in comments
        )
        
        # Extract unique commenters
        commenters = [comment.get('user_name') for comment in comments if comment.get('user_name')]
        unique_commenters = list(set(commenters)) if commenters else []
        metadata['unique_commenters'] = ', '.join(unique_commenters) if unique_commenters else ''
    
    # Content characteristics
    post_text = post.get('post_text', '')
    if post_text:
        metadata['post_length'] = len(post_text)
        metadata['post_word_count'] = len(post_text.split())
    
    # Remove None values
    metadata = {k: v for k, v in metadata.items() if v is not None}
    
    return metadata

def sanitize_metadata_for_pinecone(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure all metadata values are compatible with Pinecone's requirements."""
    sanitized = {}
    
    # Map LinkedIn fields to simple metadata fields
    field_mapping = {
        'post_type': 'document_type',
        'user_id': 'author_id',
        'date_posted': 'created_date',
        'num_likes': 'engagement_score',
        'num_comments': 'comment_count',
        'url': 'source_url',
        'has_images': 'has_media',
        'has_videos': 'has_video',
        'has_documents': 'has_document',
        'is_repost': 'is_shared'
    }
    
    for old_key, new_key in field_mapping.items():
        if old_key in metadata:
            value = metadata[old_key]
            # Skip null values (Pinecone requirement)
            if value is not None:
                # Ensure key doesn't start with $ (Pinecone requirement)
                clean_key = new_key.lstrip('$')
                
                # Convert value to supported type
                if isinstance(value, (str, int, float, bool)):
                    sanitized[clean_key] = value
                elif isinstance(value, list):
                    # Convert lists to comma-separated strings
                    sanitized[clean_key] = ', '.join(str(item) for item in value)
                else:
                    # Convert any other type to string
                    sanitized[clean_key] = str(value)
    
    # Add standard fields
    sanitized['is_public'] = True
    sanitized['tags'] = 'linkedin, social-media, post'
    
    return sanitized

# Load data from the specified JSON file
json_file_path = r"S:\FutureObjects\TrackFutura\Sample Data\LinkedIn posts.json"

with open(json_file_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Transform the data using the comprehensive transformation functions
formatted_records = []

print(f"Processing {len(data)} records...")
for i, record in enumerate(data):
    if i % 10 == 0:  # Progress indicator every 10 records
        print(f"Processing record {i+1}/{len(data)}...")
    
    # Extract content for embedding using the comprehensive function
    content_text = extract_content_text(record)
    
    # Skip posts with no meaningful content
    if not content_text.strip():
        print(f"Skipping post {record.get('id', 'unknown')} - no content")
        continue
    
    # Extract comprehensive metadata
    metadata = extract_metadata(record)
    
    # Sanitize metadata for Pinecone compatibility
    sanitized_metadata = sanitize_metadata_for_pinecone(metadata)
    
    # Create the formatted record for model-based embedding
    formatted_record = {
        "id": str(record.get('id', f"record_{i}")),
        "text": content_text,  # This field will be embedded by the model
        "metadata": sanitized_metadata
    }
    
    formatted_records.append(formatted_record)

print(f"✓ Processed {len(formatted_records)} records successfully!")


print("\n" + "="*50)
print("UPLOADING TO PINECONE")
print("="*50)

# Initialize index for upload
index = pc.Index(index_name)

# Use upsert_records method for model-based embeddings
print(f"Attempting to upsert {len(formatted_records)} records...")

# Debug: Print first record structure
if formatted_records:
    print("First record structure:")
    print(f"ID: {formatted_records[0]['id']}")
    print(f"Text length: {len(formatted_records[0]['text'])}")
    print(f"Metadata keys: {list(formatted_records[0]['metadata'].keys())}")
    print(f"Metadata types: {[(k, type(v)) for k, v in formatted_records[0]['metadata'].items()]}")

try:
    index.upsert_records(
        namespace="ns1",
        records=formatted_records
    )
    print("✓ Successfully upserted all records!")
except Exception as e:
    print(f"✗ Error during upload: {e}")
    if formatted_records:
        print("First record metadata type:", type(formatted_records[0]["metadata"]))
        print("First record metadata:", formatted_records[0]["metadata"])

#Check index stats
print("Index stats:")
time.sleep(5)
print(index.describe_index_stats())