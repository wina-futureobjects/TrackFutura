"""
Data Transformer for converting ScrapyResult data to platform-specific models
"""
import logging
from datetime import datetime
from typing import Dict, Any

from asgiref.sync import sync_to_async
from django.utils import timezone

from scrapy_integration.models import ScrapyResult
from tiktok_data.models import TikTokPost, Folder as TikTokFolder
from linkedin_data.models import LinkedInPost, Folder as LinkedInFolder
from facebook_data.models import FacebookPost, Folder as FacebookFolder
from instagram_data.models import InstagramPost, Folder as InstagramFolder

logger = logging.getLogger(__name__)


class DataTransformer:
    """Transform scraped data to platform-specific models"""
    
    async def transform_scrapy_results_to_platform_data(self, job_id: int):
        """Transform all ScrapyResult entries for a job to platform-specific models"""
        
        try:
            # Get async database functions
            get_results = sync_to_async(
                lambda: list(ScrapyResult.objects.select_related('job', 'job__config').filter(
                    job_id=job_id,
                    success=True
                ))
            )
            
            results = await get_results()
            
            if not results:
                logger.info(f"No successful results found for job {job_id}")
                return
            
            platform = results[0].job.config.platform
            logger.info(f"Transforming {len(results)} results for platform: {platform}")
            
            # Transform based on platform
            if platform == 'tiktok':
                await self._transform_tiktok_data(results)
            elif platform == 'linkedin':
                await self._transform_linkedin_data(results)
            elif platform == 'facebook':
                await self._transform_facebook_data(results)
            elif platform == 'instagram':
                await self._transform_instagram_data(results)
            else:
                logger.warning(f"Unknown platform: {platform}")
                
        except Exception as e:
            logger.error(f"Error transforming data for job {job_id}: {str(e)}")
            raise
    
    async def _transform_tiktok_data(self, results):
        """Transform TikTok data"""
        
        for result in results:
            try:
                data = result.scraped_data
                if not data:
                    continue
                
                # Get or create folder
                folder = await self._get_or_create_tiktok_folder(result)
                
                # Create TikTok post
                await self._create_tiktok_post(result, data, folder)
                
            except Exception as e:
                logger.error(f"Error transforming TikTok result {result.id}: {str(e)}")
    
    async def _transform_linkedin_data(self, results):
        """Transform LinkedIn data"""
        
        for result in results:
            try:
                data = result.scraped_data
                if not data:
                    continue
                
                # Get or create folder
                folder = await self._get_or_create_linkedin_folder(result)
                
                # Create LinkedIn post
                await self._create_linkedin_post(result, data, folder)
                
            except Exception as e:
                logger.error(f"Error transforming LinkedIn result {result.id}: {str(e)}")
    
    async def _transform_facebook_data(self, results):
        """Transform Facebook data"""
        
        for result in results:
            try:
                data = result.scraped_data
                if not data:
                    continue
                
                # Get or create folder
                folder = await self._get_or_create_facebook_folder(result)
                
                # Create Facebook post
                await self._create_facebook_post(result, data, folder)
                
            except Exception as e:
                logger.error(f"Error transforming Facebook result {result.id}: {str(e)}")
    
    async def _transform_instagram_data(self, results):
        """Transform Instagram data"""
        
        for result in results:
            try:
                data = result.scraped_data
                if not data:
                    continue
                
                # Get or create folder
                folder = await self._get_or_create_instagram_folder(result)
                
                # Create Instagram post
                await self._create_instagram_post(result, data, folder)
                
            except Exception as e:
                logger.error(f"Error transforming Instagram result {result.id}: {str(e)}")
    
    async def _get_or_create_tiktok_folder(self, result):
        """Get or create TikTok folder"""
        
        get_or_create_folder = sync_to_async(
            lambda: TikTokFolder.objects.get_or_create(
                name=f"TikTok - {result.source_name}",
                defaults={
                    'description': f'Auto-created folder for {result.source_name}',
                    'created_at': timezone.now(),
                    'project_id': result.job.project_id
                }
            )[0]
        )
        
        return await get_or_create_folder()
    
    async def _get_or_create_linkedin_folder(self, result):
        """Get or create LinkedIn folder"""
        
        get_or_create_folder = sync_to_async(
            lambda: LinkedInFolder.objects.get_or_create(
                name=f"LinkedIn - {result.source_name}",
                defaults={
                    'description': f'Auto-created folder for {result.source_name}',
                    'created_at': timezone.now(),
                    'project_id': result.job.project_id
                }
            )[0]
        )
        
        return await get_or_create_folder()
    
    async def _get_or_create_facebook_folder(self, result):
        """Get or create Facebook folder"""
        
        get_or_create_folder = sync_to_async(
            lambda: FacebookFolder.objects.get_or_create(
                name=f"Facebook - {result.source_name}",
                defaults={
                    'description': f'Auto-created folder for {result.source_name}',
                    'created_at': timezone.now(),
                    'project_id': result.job.project_id
                }
            )[0]
        )
        
        return await get_or_create_folder()
    
    async def _get_or_create_instagram_folder(self, result):
        """Get or create Instagram folder"""
        
        get_or_create_folder = sync_to_async(
            lambda: InstagramFolder.objects.get_or_create(
                name=f"Instagram - {result.source_name}",
                defaults={
                    'description': f'Auto-created folder for {result.source_name}',
                    'created_at': timezone.now(),
                    'project_id': result.job.project_id
                }
            )[0]
        )
        
        return await get_or_create_folder()
    
    async def _create_tiktok_post(self, result, data, folder):
        """Create TikTok post from scraped data"""
        
        create_post = sync_to_async(TikTokPost.objects.create)
        
        # Parse timestamp
        timestamp = self._parse_timestamp(data.get('timestamp', ''))
        
        # Extract comments data - handle both direct count and array length
        # Try multiple possible field names for comments
        comments_data = (data.get('comments') or 
                        data.get('comment_list') or 
                        data.get('commentsList') or 
                        data.get('post_comments') or [])
        
        if isinstance(comments_data, list):
            comments_count = len(comments_data)
        else:
            # Try multiple field names for comment count
            comments_count = self._safe_int(
                data.get('comments_count') or 
                data.get('comment_count') or 
                data.get('commentCount') or 
                data.get('num_comments') or 0
            )
        
        # Map data to TikTok model fields
        post = await create_post(
            url=data.get('post_url', result.source_url),
            user_posted=data.get('username', ''),
            description=data.get('text', ''),
            hashtags=str(data.get('hashtags', [])),
            num_comments=comments_count,
            date_posted=timestamp,
            likes=self._safe_int(data.get('likes', 0)),
            videos=str(data.get('videos', [])),
            photos=str(data.get('images', [])),
            post_id=data.get('post_url', '').split('/')[-1] if data.get('post_url') else f"scraped_{result.id}",
            discovery_input=result.source_url,
            folder=folder,
            content_type='video',
            platform_type='tiktok'
        )
        
        # Create TikTok comments if they exist
        if isinstance(comments_data, list) and comments_data:
            try:
                await self._create_tiktok_comments(comments_data, post, folder)
                logger.info(f"Created {len(comments_data)} comments for TikTok post {post.id}")
            except Exception as e:
                logger.error(f"Failed to create TikTok comments for post {post.id}: {str(e)}")
        
        logger.info(f"Created TikTok post {post.id} for user {data.get('username', 'unknown')}")
        return post
    
    async def _create_linkedin_post(self, result, data, folder):
        """Create LinkedIn post from scraped data"""
        
        create_post = sync_to_async(LinkedInPost.objects.create)
        
        # LinkedIn data structure has metadata field containing the actual post data
        metadata = data.get('metadata', {})
        
        # Parse timestamp from metadata
        timestamp = self._parse_timestamp(metadata.get('date_posted', ''))
        
        # Extract post text from chunk_text or metadata
        post_text = data.get('chunk_text', '').replace('*', '') if data.get('chunk_text') else ''
        
        # Map data to LinkedIn model fields using the correct structure
        post = await create_post(
            url=metadata.get('url', result.source_url),
            user_posted=metadata.get('user_id', ''),
            user_id=metadata.get('user_id', ''),
            user_url=metadata.get('user_url', ''),
            description=post_text,
            post_text=post_text,
            post_type=metadata.get('post_type', 'post'),
            account_type=metadata.get('account_type', ''),
            hashtags=[],  # TODO: Extract from post text if needed
            num_comments=self._safe_int(metadata.get('num_comments', 0)),
            num_shares=self._safe_int(metadata.get('num_shares', 0)), 
            likes=self._safe_int(metadata.get('num_likes', 0)),
            num_likes=self._safe_int(metadata.get('num_likes', 0)),
            date_posted=timestamp,
            post_id=data.get('id', f"scraped_{result.id}"),
            discovery_input=result.source_url,
            user_followers=self._safe_int(metadata.get('user_followers', 0)),
            user_posts=self._safe_int(metadata.get('user_posts', 0)),
            user_articles=self._safe_int(metadata.get('user_articles', 0)),
            images=metadata.get('images', []) if metadata.get('has_images') else [],
            videos=metadata.get('videos', []) if metadata.get('has_videos') else [],
            folder=folder,
            content_type='post',
            platform_type='linkedin'
        )
        
        logger.info(f"Created LinkedIn post {post.id} for user {metadata.get('user_id', 'unknown')}")
        return post
    
    async def _create_facebook_post(self, result, data, folder):
        """Create Facebook post from scraped data"""
        
        create_post = sync_to_async(FacebookPost.objects.create)
        
        # Parse timestamp
        timestamp = self._parse_timestamp(data.get('timestamp', ''))
        
        # Extract comments count - handle both direct count and array length
        # Try multiple possible field names for comments
        comments_data = (data.get('comments') or 
                        data.get('comment_list') or 
                        data.get('commentsList') or 
                        data.get('post_comments') or [])
        
        if isinstance(comments_data, list):
            comments_count = len(comments_data)
        else:
            # Try multiple field names for comment count
            comments_count = self._safe_int(
                data.get('comments_count') or 
                data.get('comment_count') or 
                data.get('commentCount') or 
                data.get('num_comments') or 0
            )
        
        # Map data to Facebook model fields
        post = await create_post(
            url=data.get('post_url', result.source_url),
            user_posted=data.get('username', ''),
            content=data.get('text', ''),
            hashtags=str(data.get('hashtags', [])) if data.get('hashtags') else '',
            num_comments=comments_count,
            num_shares=self._safe_int(data.get('shares', 0)),
            likes=self._safe_int(data.get('likes', 0)),
            video_view_count=self._safe_int(data.get('views', 0)),
            date_posted=timestamp,
            post_id=data.get('post_url', '').split('/')[-1] if data.get('post_url') else f"scraped_{result.id}",
            discovery_input=result.source_url,
            folder=folder,
            content_type='post',
            platform_type='facebook'
        )
        
        # Process comments if available
        if isinstance(comments_data, list) and comments_data:
            await self._create_facebook_comments(comments_data, post, folder)
        
        logger.info(f"Created Facebook post {post.id} for user {data.get('username', 'unknown')} with {comments_count} comments")
        return post
    
    async def _create_facebook_comments(self, comments_data, facebook_post, folder):
        """Create Facebook comments from scraped data"""
        
        from facebook_data.models import FacebookComment
        create_comment = sync_to_async(FacebookComment.objects.create)
        
        for comment_data in comments_data:
            try:
                # Parse comment timestamp
                comment_timestamp = self._parse_timestamp(comment_data.get('date', ''))
                
                # Generate unique comment ID if not provided
                comment_id = comment_data.get('comment_id') or comment_data.get('id') or f"{facebook_post.post_id}_{hash(comment_data.get('text', ''))}"
                
                # Check if comment already exists
                try:
                    get_comment = sync_to_async(FacebookComment.objects.get)
                    await get_comment(comment_id=comment_id)
                    logger.info(f"Comment {comment_id} already exists, skipping")
                    continue
                except Exception:
                    # Comment doesn't exist, create it
                    pass
                
                # Create Facebook comment with flexible field mapping
                await create_comment(
                    folder=folder,
                    facebook_post=facebook_post,
                    url=facebook_post.url,
                    post_id=facebook_post.post_id,
                    post_url=facebook_post.url,
                    comment_id=str(comment_id),
                    user_name=(comment_data.get('author') or 
                              comment_data.get('user_name') or 
                              comment_data.get('commenter_name') or ''),
                    user_id=(comment_data.get('author_id') or 
                            comment_data.get('user_id') or 
                            comment_data.get('commenter_id') or ''),
                    user_url=(comment_data.get('author_url') or 
                             comment_data.get('user_url') or 
                             comment_data.get('profile_url') or ''),
                    comment_text=(comment_data.get('text') or 
                                 comment_data.get('comment') or 
                                 comment_data.get('content') or ''),
                    date_created=comment_timestamp,
                    comment_link=(comment_data.get('comment_url') or 
                                 comment_data.get('url') or 
                                 comment_data.get('link') or ''),
                    num_likes=self._safe_int(comment_data.get('likes') or 
                                           comment_data.get('like_count') or 
                                           comment_data.get('reactions') or 0),
                    num_replies=self._safe_int(comment_data.get('replies') or 
                                             comment_data.get('reply_count') or 
                                             comment_data.get('comments_count') or 0)
                )
                
                logger.info(f"Created Facebook comment {comment_id} for post {facebook_post.post_id}")
                
            except Exception as e:
                logger.error(f"Error creating Facebook comment: {str(e)}")
                logger.error(f"Comment data: {comment_data}")
    
    async def _create_tiktok_comments(self, comments_data, tiktok_post, folder):
        """Create TikTok comments from scraped data"""
        
        from tiktok_data.models import TikTokComment
        create_comment = sync_to_async(TikTokComment.objects.create)
        
        for comment_data in comments_data:
            try:
                # Parse comment timestamp
                comment_timestamp = self._parse_timestamp(comment_data.get('date', ''))
                
                # Generate unique comment ID if not provided
                comment_id = comment_data.get('comment_id') or comment_data.get('id') or f"{tiktok_post.post_id}_{hash(comment_data.get('text', ''))}"
                
                # Check if comment already exists
                try:
                    get_comment = sync_to_async(TikTokComment.objects.get)
                    await get_comment(comment_id=comment_id)
                    logger.info(f"TikTok Comment {comment_id} already exists, skipping")
                    continue
                except Exception:
                    # Comment doesn't exist, create it
                    pass
                
                # Create TikTok comment with flexible field mapping
                await create_comment(
                    folder=folder,
                    tiktok_post=tiktok_post,
                    post_id=tiktok_post.post_id,
                    comment_id=str(comment_id),
                    user_name=(comment_data.get('author') or 
                              comment_data.get('user_name') or 
                              comment_data.get('username') or 
                              comment_data.get('commenter_name') or ''),
                    user_id=(comment_data.get('author_id') or 
                            comment_data.get('user_id') or 
                            comment_data.get('commenter_id') or ''),
                    user_url=(comment_data.get('author_url') or 
                             comment_data.get('user_url') or 
                             comment_data.get('profile_url') or ''),
                    comment_text=(comment_data.get('text') or 
                                 comment_data.get('comment') or 
                                 comment_data.get('content') or ''),
                    comment_date=comment_timestamp,
                    num_likes=self._safe_int(comment_data.get('likes') or 
                                           comment_data.get('like_count') or 
                                           comment_data.get('reactions') or 0),
                    num_replies=self._safe_int(comment_data.get('replies') or 
                                             comment_data.get('reply_count') or 
                                             comment_data.get('comments_count') or 0)
                )
                
                logger.info(f"Created TikTok comment {comment_id} for post {tiktok_post.post_id}")
                
            except Exception as e:
                logger.error(f"Error creating TikTok comment: {str(e)}")
                logger.error(f"Comment data: {comment_data}")
    
    async def _create_instagram_post(self, result, data, folder):
        """Create Instagram post from scraped data"""
        
        create_post = sync_to_async(InstagramPost.objects.create)
        
        # Parse timestamp
        timestamp = self._parse_timestamp(data.get('timestamp', ''))
        
        # Map data to Instagram model fields
        post = await create_post(
            url=data.get('post_url', result.source_url),
            user_posted=data.get('username', ''),
            description=data.get('text', ''),
            hashtags=data.get('hashtags', []),
            num_comments=self._safe_int(data.get('comments_count', 0)),
            likes=self._safe_int(data.get('likes', 0)),
            views=self._safe_int(data.get('views', 0)),
            date_posted=timestamp,
            post_id=data.get('post_url', '').split('/')[-1] if data.get('post_url') else f"scraped_{result.id}",
            photos=data.get('images', []),
            videos=data.get('videos', []),
            folder=folder,
            content_type='post' if data.get('media_type') != 'video' else 'reel',
            platform_type='instagram'
        )
        
        logger.info(f"Created Instagram post {post.id} for user {data.get('username', 'unknown')}")
        return post
    
    def _parse_timestamp(self, timestamp_str):
        """Parse timestamp string to datetime"""
        
        if not timestamp_str:
            return timezone.now()
            
        # Handle different timestamp formats
        formats = [
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%Y-%m-%dT%H:%M:%SZ', 
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d',
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(timestamp_str, fmt)
                return timezone.make_aware(dt) if timezone.is_naive(dt) else dt
            except (ValueError, TypeError):
                continue
                
        # If all parsing fails, return current time
        logger.warning(f"Could not parse timestamp: {timestamp_str}")
        return timezone.now()
    
    def _safe_int(self, value):
        """Safely convert value to int"""
        try:
            return int(value) if value is not None else 0
        except (ValueError, TypeError):
            return 0