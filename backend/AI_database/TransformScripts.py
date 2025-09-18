import json
from typing import List, Dict, Any, Optional
from datetime import datetime

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
        metadata['tagged_company_names'] = [comp.get('name') for comp in tagged_companies if comp.get('name')]
    
    if tagged_people:
        metadata['tagged_people_names'] = [person.get('name') for person in tagged_people if person.get('name')]
    
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
        metadata['unique_commenters'] = list(set(commenters)) if commenters else []
    
    # Content characteristics
    post_text = post.get('post_text', '')
    if post_text:
        metadata['post_length'] = len(post_text)
        metadata['post_word_count'] = len(post_text.split())
    
    # Remove None values
    metadata = {k: v for k, v in metadata.items() if v is not None}
    
    return metadata

def transform_linkedin_posts(json_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Transform LinkedIn posts JSON to vector embedding format."""
    transformed_posts = []
    
    for post in json_data:
        # Extract content for embedding
        content_text = extract_content_text(post)
        
        # Skip posts with no meaningful content
        if not content_text.strip():
            print(f"Skipping post {post.get('id', 'unknown')} - no content")
            continue
        
        # Extract metadata
        metadata = extract_metadata(post)
        
        # Create transformed post
        transformed_post = {
            "id": post.get('id', ''),
            "content_text": content_text,
            "metadata": metadata
        }
        
        transformed_posts.append(transformed_post)
    
    return transformed_posts

def main():
    """Main function to process LinkedIn posts JSON file."""
    
    # Example usage - replace with your JSON file path
    input_file = "linkedin_posts.json"
    output_file = "transformed_posts.json"
    
    try:
        # Load JSON data
        with open(input_file, 'r', encoding='utf-8') as f:
            linkedin_posts = json.load(f)
        
        print(f"Loaded {len(linkedin_posts)} posts from {input_file}")
        
        # Transform the data
        transformed_data = transform_linkedin_posts(linkedin_posts)
        
        print(f"Successfully transformed {len(transformed_data)} posts")
        
        # Save transformed data
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(transformed_data, f, indent=2, ensure_ascii=False)
        
        print(f"Saved transformed data to {output_file}")
        
        # Print sample output
        if transformed_data:
            print("\nSample transformed post:")
            print(json.dumps(transformed_data[0], indent=2, ensure_ascii=False))
            
            print(f"\nContent preview: {transformed_data[0]['content_text'][:200]}...")
            print(f"Metadata keys: {list(transformed_data[0]['metadata'].keys())}")
    
    except FileNotFoundError:
        print(f"File {input_file} not found. Please provide the correct path.")
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
    except Exception as e:
        print(f"Error processing data: {e}")

# Function to process data directly from a list (useful for API/memory usage)
def process_linkedin_data(posts_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Process LinkedIn posts data directly from a list."""
    return transform_linkedin_posts(posts_data)

if __name__ == "__main__":
    main()