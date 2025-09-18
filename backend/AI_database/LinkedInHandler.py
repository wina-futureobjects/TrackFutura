from pinecone import Pinecone, ServerlessSpec
import json
import time
import re
from typing import List, Dict, Any, Optional
from datetime import datetime


class LinkedInPineconeDB:
    """
    A class to handle LinkedIn posts storage and retrieval in Pinecone vector database.
    """
    
    def __init__(self, api_key: str, index_name: str = "linkedin-posts-db"):
        """
        Initialize the LinkedIn Pinecone database handler.
        
        Args:
            api_key (str): Pinecone API key
            index_name (str): Name for the Pinecone index
        """
        self.pc = Pinecone(api_key=api_key)
        self.index_name = index_name
        self.index = None
        
    def create_index(self, recreate: bool = False):
        """
        Create or recreate the Pinecone index with proper configuration.
        
        Args:
            recreate (bool): Whether to delete and recreate existing index
        """
        # Delete existing index if recreate is True
        if recreate and self.pc.has_index(self.index_name):
            print(f"Deleting existing index: {self.index_name}")
            self.pc.delete_index(self.index_name)
            print("Waiting for index deletion to complete...")
            time.sleep(10)
        
        # Create new index if it doesn't exist
        if not self.pc.has_index(self.index_name):
            print(f"Creating new index: {self.index_name}")
            self.pc.create_index_for_model(
                name=self.index_name,
                cloud="aws",
                region="us-east-1",
                embed={
                    "model": "llama-text-embed-v2",
                    "field_map": {"text": "content"}  # Map the content field for embedding
                }
            )
            print(f"✓ Index '{self.index_name}' created successfully!")
        else:
            print(f"Index '{self.index_name}' already exists.")
            
        # Initialize index connection
        self.index = self.pc.Index(self.index_name)
    
    def clean_text(self, text: Optional[str]) -> str:
        """
        Clean and normalize text content by removing HTML entities and tags.
        
        Args:
            text (Optional[str]): Raw text content
            
        Returns:
            str: Cleaned text content
        """
        if not text:
            return ""
        
        # Replace HTML entities
        replacements = {
            "&#x2014;": "—",
            "&#x2019;": "'",
            "&quot;": '"',
            "&apos;": "'",
            "&amp;": "&",
            "<br/>": " ",
            "<br>": " "
        }
        
        for old, new in replacements.items():
            text = text.replace(old, new)
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Normalize whitespace
        text = ' '.join(text.split())
        
        return text.strip()
    
    def extract_content_text(self, post: Dict[str, Any]) -> str:
        """
        Extract and combine all relevant content fields for embedding.
        This becomes the main searchable content.
        
        Args:
            post (Dict[str, Any]): LinkedIn post data
            
        Returns:
            str: Combined content text for embedding
        """
        content_parts = []
        
        # Primary content - most important for search
        if post.get('title'):
            content_parts.append(f"Title: {self.clean_text(post['title'])}")
        
        if post.get('post_text'):
            content_parts.append(f"Post: {self.clean_text(post['post_text'])}")
        
        # User context - helps with authorship and expertise searches
        if post.get('headline'):
            content_parts.append(f"Author: {self.clean_text(post['headline'])}")
        
        if post.get('user_title'):
            content_parts.append(f"Position: {self.clean_text(post['user_title'])}")
        
        # Hashtags - important for topic-based searches
        if post.get('hashtags'):
            if isinstance(post['hashtags'], list):
                hashtags_str = ' '.join(post['hashtags'])
            else:
                hashtags_str = str(post['hashtags'])
            content_parts.append(f"Tags: {self.clean_text(hashtags_str)}")
        
        # Repost content - include original content if it's a repost
        repost = post.get('repost', {}) or {}
        if repost.get('repost_text'):
            content_parts.append(f"Shared Content: {self.clean_text(repost['repost_text'])}")
        
        # External link data - helps with content about external resources
        external_links = post.get('external_link_data', []) or []
        for link_data in external_links:
            if link_data.get('post_external_title'):
                content_parts.append(f"Link: {self.clean_text(link_data['post_external_title'])}")
            if link_data.get('post_external_description'):
                content_parts.append(f"Link Description: {self.clean_text(link_data['post_external_description'])}")
        
        # Top comments - include for context and engagement insights
        comments = post.get('top_visible_comments', []) or []
        if comments:
            comment_texts = []
            for comment in comments[:3]:  # Limit to top 3 comments
                if comment.get('comment'):
                    clean_comment = self.clean_text(comment['comment'])
                    if clean_comment and len(clean_comment) > 10:  # Only meaningful comments
                        comment_texts.append(clean_comment)
            
            if comment_texts:
                content_parts.append(f"Comments: {' | '.join(comment_texts)}")
        
        return ' | '.join(content_parts)
    
    def extract_metadata(self, post: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract metadata fields that are useful for filtering and analysis.
        These won't be embedded but can be used for filtering searches.
        
        Args:
            post (Dict[str, Any]): LinkedIn post data
            
        Returns:
            Dict[str, Any]: Metadata dictionary
        """
        metadata = {}
        
        # Essential identifiers and URLs
        if post.get('url'):
            metadata['source_url'] = post['url']
        if post.get('user_id'):
            metadata['author_id'] = post['user_id']
        if post.get('use_url'):
            metadata['author_profile'] = post['use_url']
        
        # Post classification
        if post.get('post_type'):
            metadata['content_type'] = post['post_type']  # post, repost, etc.
        if post.get('account_type'):
            metadata['account_type'] = post['account_type']  # Person, Company
        
        # Temporal metadata - crucial for time-based filtering
        if post.get('date_posted'):
            metadata['published_date'] = post['date_posted']
            try:
                dt = datetime.fromisoformat(post['date_posted'].replace('Z', '+00:00'))
                metadata['year'] = dt.year
                metadata['month'] = dt.month
                metadata['weekday'] = dt.strftime('%A')
            except Exception:
                pass
        
        # Engagement metrics - for popularity/quality filtering
        metadata['likes'] = post.get('num_likes', 0)
        metadata['comments'] = post.get('num_comments', 0)
        metadata['author_followers'] = post.get('user_followers', 0)
        metadata['author_posts'] = post.get('user_posts', 0)
        
        # Media indicators - for content type filtering
        metadata['has_images'] = bool(post.get('images'))
        metadata['has_videos'] = bool(post.get('videos'))
        metadata['has_documents'] = bool(post.get('document_cover_image'))
        
        if post.get('video_duration'):
            metadata['video_duration_sec'] = post['video_duration']
        
        # Link and external content indicators
        embedded_links = post.get('embedded_links', []) or []
        metadata['external_links_count'] = len(embedded_links)
        metadata['has_external_content'] = bool(post.get('external_link_data'))
        
        # Tagged entities - for network and company analysis
        tagged_companies = post.get('tagged_companies', []) or []
        tagged_people = post.get('tagged_people', []) or []
        
        if tagged_companies:
            company_names = [comp.get('name') for comp in tagged_companies if comp.get('name')]
            if company_names:
                metadata['tagged_companies'] = ', '.join(company_names)
                metadata['companies_count'] = len(company_names)
        
        if tagged_people:
            people_names = [person.get('name') for person in tagged_people if person.get('name')]
            if people_names:
                metadata['tagged_people'] = ', '.join(people_names)
                metadata['people_count'] = len(people_names)
        
        # Repost analysis
        repost = post.get('repost', {}) or {}
        metadata['is_repost'] = bool(repost and any(v for v in repost.values() if v))
        if metadata['is_repost']:
            if repost.get('repost_user_name'):
                metadata['original_author'] = repost['repost_user_name']
            if repost.get('repost_date'):
                metadata['original_date'] = repost['repost_date']
        
        # Content characteristics
        post_text = post.get('post_text', '') or ''
        if post_text:
            metadata['content_length'] = len(post_text)
            metadata['word_count'] = len(post_text.split())
            # Classify content length
            if len(post_text) < 280:
                metadata['content_size'] = 'short'
            elif len(post_text) < 1000:
                metadata['content_size'] = 'medium'
            else:
                metadata['content_size'] = 'long'
        
        # Comment engagement analysis
        comments = post.get('top_visible_comments', []) or []
        if comments:
            metadata['top_comments_count'] = len(comments)
            total_reactions = sum(comment.get('num_reactions', 0) for comment in comments)
            metadata['comment_reactions'] = total_reactions
            
            # Extract unique commenters for network analysis
            commenters = [c.get('user_name') for c in comments if c.get('user_name')]
            if commenters:
                metadata['active_commenters'] = ', '.join(list(set(commenters)))
        
        # Calculate engagement rate if possible
        if metadata.get('author_followers', 0) > 0:
            engagement = (metadata.get('likes', 0) + metadata.get('comments', 0))
            metadata['engagement_rate'] = round(engagement / metadata['author_followers'] * 100, 2)
        
        # Add standard classification tags
        metadata['data_source'] = 'linkedin'
        metadata['content_category'] = 'social_media_post'
        
        return metadata
    
    def sanitize_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize metadata to ensure Pinecone compatibility.
        
        Args:
            metadata (Dict[str, Any]): Raw metadata
            
        Returns:
            Dict[str, Any]: Sanitized metadata
        """
        sanitized = {}
        
        for key, value in metadata.items():
            if value is None:
                continue  # Skip None values
            
            # Ensure key doesn't start with $ (Pinecone restriction)
            clean_key = key.lstrip('$')
            
            # Convert to supported types
            if isinstance(value, (str, int, float, bool)):
                sanitized[clean_key] = value
            elif isinstance(value, list):
                # Convert lists to comma-separated strings
                sanitized[clean_key] = ', '.join(str(item) for item in value)
            else:
                # Convert other types to string
                sanitized[clean_key] = str(value)
        
        return sanitized
    
    def process_linkedin_posts(self, posts_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Process LinkedIn posts data into Pinecone-compatible format.
        
        Args:
            posts_data (List[Dict[str, Any]]): List of LinkedIn post dictionaries
            
        Returns:
            List[Dict[str, Any]]: Processed records ready for Pinecone
        """
        processed_records = []
        
        print(f"Processing {len(posts_data)} LinkedIn posts...")
        
        for i, post in enumerate(posts_data):
            if i % 25 == 0:  # Progress indicator
                print(f"Processing record {i+1}/{len(posts_data)}...")
            
            # Extract content for embedding
            content_text = self.extract_content_text(post)
            
            # Skip posts with no meaningful content
            if not content_text.strip() or len(content_text.strip()) < 20:
                print(f"Skipping post {post.get('id', f'record_{i}')} - insufficient content")
                continue
            
            # Extract and sanitize metadata
            metadata = self.extract_metadata(post)
            sanitized_metadata = self.sanitize_metadata(metadata)
            
            # Create Pinecone record - metadata fields should be at the top level
            record = {
                "id": str(post.get('id', f"linkedin_post_{i}")),
                "content": content_text,  # This field will be embedded
            }
            
            # Add metadata fields directly to the record (not nested)
            record.update(sanitized_metadata)
            
            processed_records.append(record)
        
        print(f"✓ Successfully processed {len(processed_records)} records!")
        return processed_records
    
    def upload_posts(self, posts_data: List[Dict[str, Any]], namespace: str = "linkedin_posts", batch_size: int = 100):
        """
        Upload LinkedIn posts to Pinecone database.
        
        Args:
            posts_data (List[Dict[str, Any]]): List of LinkedIn post dictionaries
            namespace (str): Pinecone namespace for organization
            batch_size (int): Number of records to upload per batch
        """
        if not self.index:
            raise ValueError("Index not initialized. Call create_index() first.")
        
        # Process the posts
        processed_records = self.process_linkedin_posts(posts_data)
        
        if not processed_records:
            print("No valid records to upload!")
            return
        
        print(f"\nUploading {len(processed_records)} records to Pinecone...")
        
        # Debug: Show sample record structure
        if processed_records:
            sample = processed_records[0]
            print(f"Sample record - ID: {sample['id']}")
            print(f"Content length: {len(sample['content'])} characters")
            # Show all fields (content + metadata fields are now at top level)
            metadata_fields = [k for k in sample.keys() if k not in ['id', 'content']]
            print(f"Metadata fields: {metadata_fields}")
        
        # Upload in batches to handle large datasets
        total_uploaded = 0
        for i in range(0, len(processed_records), batch_size):
            batch = processed_records[i:i + batch_size]
            
            try:
                self.index.upsert_records(
                    namespace=namespace,
                    records=batch
                )
                total_uploaded += len(batch)
                print(f"✓ Uploaded batch {i//batch_size + 1}: {len(batch)} records")
                
            except Exception as e:
                print(f"✗ Error uploading batch {i//batch_size + 1}: {e}")
                continue
        
        print(f"✓ Upload complete! Total records uploaded: {total_uploaded}")
        
        # Show index statistics
        time.sleep(5)  # Wait for indexing
        self.show_index_stats()
    
    def show_index_stats(self):
        """Display current index statistics."""
        if not self.index:
            print("Index not initialized.")
            return
        
        try:
            stats = self.index.describe_index_stats()
            print("\n" + "="*50)
            print("INDEX STATISTICS")
            print("="*50)
            print(f"Total vectors: {stats.get('total_vector_count', 'Unknown')}")
            
            namespaces = stats.get('namespaces', {})
            for ns_name, ns_stats in namespaces.items():
                print(f"Namespace '{ns_name}': {ns_stats.get('vector_count', 'Unknown')} vectors")
            
            print("="*50)
            
        except Exception as e:
            print(f"Error retrieving index stats: {e}")
    
    def search_posts(self, query: str, namespace: str = "linkedin_posts", top_k: int = 5, include_metadata: bool = True):
        """
        Search LinkedIn posts using semantic similarity.
        
        Args:
            query (str): Search query
            namespace (str): Pinecone namespace to search
            top_k (int): Number of results to return
            include_metadata (bool): Whether to include metadata in results
            
        Returns:
            List[Dict]: Search results
        """
        if not self.index:
            raise ValueError("Index not initialized. Call create_index() first.")
        
        try:
            # Perform semantic search using the model's inference capabilities
            results = self.index.query(
                query_text=query,  # Pinecone will embed this using the configured model
                namespace=namespace,
                top_k=top_k,
                include_metadata=include_metadata
            )
            
            print(f"\nFound {len(results.matches)} results for: '{query}'")
            
            # Format results for better readability
            formatted_results = []
            for match in results.matches:
                # Extract metadata fields (all fields except id and content)
                metadata = {k: v for k, v in match.metadata.items() if k not in ['id', 'content']} if hasattr(match, 'metadata') and match.metadata else {}
                
                result = {
                    'id': match.id,
                    'score': round(match.score, 4),
                    'metadata': metadata if include_metadata else {}
                }
                formatted_results.append(result)
            
            return formatted_results
            
        except Exception as e:
            print(f"Search error: {e}")
            return []


def load_linkedin_posts_from_file(file_path: str) -> List[Dict[str, Any]]:
    """
    Load LinkedIn posts from JSON file.
    
    Args:
        file_path (str): Path to JSON file containing LinkedIn posts
        
    Returns:
        List[Dict[str, Any]]: List of LinkedIn post dictionaries
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✓ Loaded {len(data)} posts from {file_path}")
        return data
    except Exception as e:
        print(f"✗ Error loading file {file_path}: {e}")
        return []


# Example usage
if __name__ == "__main__":
    # Configuration
    API_KEY = "your_pinecone_api_key_here"
    INDEX_NAME = "linkedin-content-db"
    
    # Initialize database handler
    db = LinkedInPineconeDB(api_key=API_KEY, index_name=INDEX_NAME)
    
    # Create/setup index
    db.create_index(recreate=False)  # Set to True to recreate existing index
    
    # Load LinkedIn posts from JSON file
    json_file_path = "LinkedIn posts.json"  # Update with your file path
    posts_data = load_linkedin_posts_from_file(json_file_path)
    
    if posts_data:
        # Upload posts to Pinecone
        db.upload_posts(posts_data, namespace="linkedin_posts")
        
        # Example search
        search_results = db.search_posts(
            query="family business management", 
            top_k=3
        )
        
        for i, result in enumerate(search_results, 1):
            print(f"\n{i}. Score: {result['score']}")
            print(f"   Post ID: {result['id']}")
            if 'source_url' in result['metadata']:
                print(f"   URL: {result['metadata']['source_url']}")