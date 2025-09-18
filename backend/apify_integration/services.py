import asyncio
import logging
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

from apify_client import ApifyClient
from django.utils import timezone
from asgiref.sync import sync_to_async

from scrapy_integration.models import ScrapyJob, ScrapyResult, ScrapyConfig
from users.models import Project
from .data_transformer import DataTransformer

logger = logging.getLogger(__name__)


class ApifyScrapingService:
    """Service for handling social media scraping using Apify"""
    
    APIFY_USER_ID = os.getenv('APIFY_USER_ID', 'your-apify-user-id')
    APIFY_TOKEN = os.getenv('APIFY_TOKEN', 'your-apify-api-token')
    
    # Apify actor IDs for different platforms
    ACTORS = {
        'instagram': 'shu8hvrXbJbY3Eb9W',          # Instagram Posts Scraper
        'facebook': 'apify/facebook-posts-scraper',  # Facebook Posts Scraper  
        'linkedin': 'dev_fusion/linkedin-profile-scraper', # Mass LinkedIn Profile Scraper (No Cookies)
        'tiktok': 'clockworks/free-tiktok-scraper'    # Free TikTok Scraper
    }
    
    def __init__(self):
        self.client = ApifyClient(self.APIFY_TOKEN)
        self.data_transformer = DataTransformer()
        logger.info("ApifyScrapingService initialized")

    async def create_scraping_job(self, name: str, project_id: int, platform: str, 
                                content_type: str = 'posts', target_urls: List[str] = None, 
                                source_names: List[str] = None, num_of_posts: int = 10,
                                start_date: str = None, end_date: str = None,
                                output_folder_id: int = None, auto_create_folders: bool = True) -> ScrapyJob:
        """Create a new scraping job using Apify"""
        
        try:
            # Create async wrappers for database operations
            get_project = sync_to_async(lambda: Project.objects.get(id=project_id))
            get_or_create_config = sync_to_async(
                lambda: ScrapyConfig.objects.get_or_create(
                    platform=platform,
                    content_type=content_type,
                    defaults={
                        'name': f'Apify {platform.title()} Config',
                        'description': f'Apify configuration for {platform} {content_type}'
                    }
                )[0]
            )
            create_job = sync_to_async(ScrapyJob.objects.create)
            
            # Get or create project and config
            project = await get_project()
            config = await get_or_create_config()
            
            # Prepare source names
            if not source_names:
                source_names = [f"Source {i+1}" for i in range(len(target_urls or []))]
            
            # Create the job
            job = await create_job(
                name=name,
                project=project,
                config=config,
                target_urls=target_urls or [],
                source_names=source_names,
                num_of_posts=num_of_posts,
                start_date=start_date,
                end_date=end_date,
                output_folder_id=output_folder_id,
                auto_create_folders=auto_create_folders,
                status='pending',
                total_urls=len(target_urls or [])
            )
            
            logger.info(f"Created Apify scraping job: {job.id} - {name}")
            return job
            
        except Exception as e:
            logger.error(f"Error creating Apify scraping job: {str(e)}")
            raise

    async def start_scraping_job(self, job_id: int) -> bool:
        """Start an Apify scraping job"""
        
        try:
            # Create async wrappers for database operations
            get_job_with_config = sync_to_async(lambda: ScrapyJob.objects.select_related('config').get(id=job_id))
            save_job = sync_to_async(lambda j: j.save())
            
            job = await get_job_with_config()
            platform = job.config.platform
            
            if platform not in self.ACTORS:
                raise ValueError(f"Unsupported platform: {platform}")
            
            # Update job status
            job.status = 'running'
            job.started_at = timezone.now()
            await save_job(job)
            
            # Start the appropriate scraper based on platform
            if platform == 'instagram':
                success = await self._start_instagram_scraper(job)
            elif platform == 'facebook':
                success = await self._start_facebook_scraper(job)
            elif platform == 'linkedin':
                success = await self._start_linkedin_scraper(job)
            elif platform == 'tiktok':
                success = await self._start_tiktok_scraper(job)
            else:
                success = False
                
            if not success:
                job.status = 'failed'
                job.error_log = f"Failed to start {platform} scraper"
                await save_job(job)
                
            return success
            
        except Exception as e:
            logger.error(f"Error starting Apify scraping job {job_id}: {str(e)}")
            return False

    async def _start_instagram_scraper(self, job: ScrapyJob) -> bool:
        """Start Instagram scraping using Apify"""
        
        try:
            # Create async wrappers for database operations
            save_job = sync_to_async(lambda j: j.save())
            create_result = sync_to_async(ScrapyResult.objects.create)
            
            actor_id = self.ACTORS['instagram']
            
            # Process each URL
            for i, url in enumerate(job.target_urls):
                try:
                    logger.info(f"Starting Instagram scrape for: {url}")
                    
                    # Prepare input for Apify Instagram actor
                    run_input = {
                        "directUrls": [url],
                        "resultsType": "posts",
                        "resultsLimit": job.num_of_posts,
                        "searchType": "hashtag",  # or "user"
                        "searchLimit": job.num_of_posts,
                        "includeComments": True,  # Enable comment scraping
                        "commentsLimit": 50,      # Limit comments per post
                        "includeCommentsData": True,
                        "extendedOutput": True    # Get more detailed data
                    }
                    
                    # Start the Apify actor run
                    run = self.client.actor(actor_id).start(run_input=run_input)
                    run_id = run['id']
                    
                    logger.info(f"Started Apify run: {run_id} for URL: {url}")
                    
                    # Store run ID for tracking
                    job.scrapy_process_id = run_id
                    await save_job(job)
                    
                    # Poll for completion
                    max_wait_time = 300  # 5 minutes max wait
                    start_time = time.time()
                    
                    while time.time() - start_time < max_wait_time:
                        run_info = self.client.run(run_id).get()
                        status = run_info.get('status')
                        
                        logger.info(f"Run {run_id} status: {status}")
                        
                        if status == 'SUCCEEDED':
                            # Get the results
                            dataset_id = run_info.get('defaultDatasetId')
                            if dataset_id:
                                items = list(self.client.dataset(dataset_id).iterate_items())
                                
                                logger.info(f"Retrieved {len(items)} items from dataset {dataset_id}")
                                
                                # Process and save results
                                for item in items:
                                    processed_data = self._process_instagram_data(item)
                                    
                                    await create_result(
                                        job=job,
                                        source_url=url,
                                        source_name=job.source_names[i] if i < len(job.source_names) else f"Source {i+1}",
                                        scraped_data=processed_data,
                                        success=True,
                                        scrape_timestamp=timezone.now()
                                    )
                                
                                # Update job progress
                                job.processed_urls = i + 1
                                job.successful_scrapes += len(items)
                                await save_job(job)
                                
                                logger.info(f"Successfully processed {len(items)} Instagram posts from {url}")
                            break
                            
                        elif status in ['FAILED', 'ABORTED', 'TIMED_OUT']:
                            logger.error(f"Apify run {run_id} failed with status: {status}")
                            job.failed_scrapes += 1
                            await save_job(job)
                            break
                            
                        # Wait before next check
                        await asyncio.sleep(10)
                    
                except Exception as url_error:
                    logger.error(f"Error processing URL {url}: {str(url_error)}")
                    job.failed_scrapes += 1
                    await save_job(job)
            
            # Mark job as completed
            job.status = 'completed'
            job.completed_at = timezone.now()
            await save_job(job)
            
            # Transform scraped data to platform-specific models
            await self.data_transformer.transform_scrapy_results_to_platform_data(job.id)
            
            logger.info(f"Completed Instagram scraping job {job.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error in Instagram scraper: {str(e)}")
            job.status = 'failed'
            job.error_log = str(e)
            await save_job(job)
            return False

    def _process_instagram_data(self, raw_data: Dict) -> Dict:
        """Process raw Instagram data from Apify into our format"""
        
        try:
            processed = {
                'post_url': raw_data.get('url', ''),
                'caption': raw_data.get('caption', ''),
                'likes': raw_data.get('likesCount', 0),
                'comments_count': raw_data.get('commentsCount', 0),
                'timestamp': raw_data.get('timestamp', ''),
                'media_type': raw_data.get('type', 'photo'),
                'images': [],
                'videos': [],
                'username': raw_data.get('ownerUsername', ''),
                'user_full_name': raw_data.get('ownerFullName', ''),
                'hashtags': raw_data.get('hashtags', []),
                'mentions': raw_data.get('mentions', []),
                'comments': [],  # Detailed comments array
                'shares': raw_data.get('sharesCount', 0),
                'views': raw_data.get('viewsCount', 0)
            }
            
            # Extract media URLs
            if 'displayUrl' in raw_data:
                processed['images'].append(raw_data['displayUrl'])
            
            if 'videoUrl' in raw_data:
                processed['videos'].append(raw_data['videoUrl'])
            
            # Handle multiple media items
            if 'childPosts' in raw_data:
                for child in raw_data['childPosts']:
                    if 'displayUrl' in child:
                        processed['images'].append(child['displayUrl'])
                    if 'videoUrl' in child:
                        processed['videos'].append(child['videoUrl'])
            
            # Process detailed comments
            if 'comments' in raw_data and isinstance(raw_data['comments'], list):
                for comment in raw_data['comments']:
                    if isinstance(comment, dict):
                        comment_data = {
                            'username': comment.get('ownerUsername', ''),
                            'user_full_name': comment.get('ownerFullName', ''),
                            'text': comment.get('text', ''),
                            'likes': comment.get('likesCount', 0),
                            'timestamp': comment.get('timestamp', ''),
                            'is_verified': comment.get('isVerified', False)
                        }
                        processed['comments'].append(comment_data)
            
            # Also check for latestComments field (some actors use this)
            if 'latestComments' in raw_data and isinstance(raw_data['latestComments'], list):
                for comment in raw_data['latestComments']:
                    if isinstance(comment, dict):
                        comment_data = {
                            'username': comment.get('ownerUsername', ''),
                            'user_full_name': comment.get('ownerFullName', ''),
                            'text': comment.get('text', ''),
                            'likes': comment.get('likesCount', 0),
                            'timestamp': comment.get('timestamp', ''),
                            'is_verified': comment.get('isVerified', False)
                        }
                        processed['comments'].append(comment_data)
            
            # Backward compatibility - keep 'comments' field as count
            processed['comments_count'] = len(processed['comments']) if processed['comments'] else processed['comments_count']
            
            return processed
            
        except Exception as e:
            logger.error(f"Error processing Instagram data: {str(e)}")
            return raw_data

    def _process_facebook_data(self, raw_data: Dict) -> Dict:
        """Process raw Facebook data from Apify into our format"""
        
        try:
            processed = {
                'post_url': raw_data.get('postUrl', raw_data.get('url', '')),
                'text': raw_data.get('text', raw_data.get('message', '')),
                'likes': raw_data.get('likes', raw_data.get('likesCount', 0)),
                'comments_count': len(raw_data.get('comments', [])) if isinstance(raw_data.get('comments', []), list) else raw_data.get('comments', 0),
                'shares': raw_data.get('shares', raw_data.get('sharesCount', 0)),
                'timestamp': raw_data.get('time', raw_data.get('timestamp', '')),
                'media_type': raw_data.get('mediaType', 'post'),
                'images': raw_data.get('images', []),
                'videos': raw_data.get('videos', []),
                'username': raw_data.get('pageUsername', ''),
                'user_full_name': raw_data.get('pageName', ''),
                'comments': [],
                'views': raw_data.get('views', 0)
            }
            
            # Process comments
            if 'comments' in raw_data and isinstance(raw_data['comments'], list):
                for comment in raw_data['comments']:
                    if isinstance(comment, dict):
                        comment_data = {
                            'username': comment.get('profileName', ''),
                            'user_full_name': comment.get('profileName', ''),
                            'text': comment.get('text', ''),
                            'likes': comment.get('likesCount', 0),
                            'timestamp': comment.get('publishedTime', ''),
                            'replies': comment.get('replies', [])
                        }
                        processed['comments'].append(comment_data)
            
            return processed
            
        except Exception as e:
            logger.error(f"Error processing Facebook data: {str(e)}")
            return raw_data

    def _process_linkedin_data(self, raw_data: Dict) -> Dict:
        """Process raw LinkedIn data from Apify into our format"""
        
        try:
            processed = {
                'post_url': raw_data.get('postUrl', raw_data.get('url', '')),
                'text': raw_data.get('text', raw_data.get('commentary', '')),
                'likes': raw_data.get('numLikes', raw_data.get('likesCount', 0)),
                'comments_count': raw_data.get('numComments', raw_data.get('commentsCount', 0)),
                'shares': raw_data.get('numShares', raw_data.get('sharesCount', 0)),
                'timestamp': raw_data.get('publishedDate', raw_data.get('timestamp', '')),
                'media_type': raw_data.get('postType', 'post'),
                'images': raw_data.get('images', []),
                'videos': raw_data.get('videos', []),
                'username': raw_data.get('authorUsername', raw_data.get('companyName', '')),
                'user_full_name': raw_data.get('authorName', raw_data.get('companyName', '')),
                'comments': [],
                'views': raw_data.get('views', 0)
            }
            
            # Process comments if available
            if 'comments' in raw_data and isinstance(raw_data['comments'], list):
                for comment in raw_data['comments']:
                    if isinstance(comment, dict):
                        comment_data = {
                            'username': comment.get('authorUsername', ''),
                            'user_full_name': comment.get('authorName', ''),
                            'text': comment.get('text', ''),
                            'likes': comment.get('numLikes', 0),
                            'timestamp': comment.get('publishedDate', ''),
                            'replies': comment.get('replies', [])
                        }
                        processed['comments'].append(comment_data)
            
            return processed
            
        except Exception as e:
            logger.error(f"Error processing LinkedIn data: {str(e)}")
            return raw_data

    def _process_tiktok_data(self, raw_data: Dict) -> Dict:
        """Process raw TikTok data from Apify into our format"""
        
        try:
            processed = {
                'post_url': raw_data.get('webVideoUrl', raw_data.get('url', '')),
                'text': raw_data.get('text', raw_data.get('desc', '')),
                'likes': raw_data.get('diggCount', raw_data.get('likesCount', 0)),
                'comments_count': raw_data.get('commentCount', raw_data.get('commentsCount', 0)),
                'shares': raw_data.get('shareCount', raw_data.get('sharesCount', 0)),
                'timestamp': raw_data.get('createTime', raw_data.get('timestamp', '')),
                'media_type': 'video',
                'images': [],
                'videos': [],
                'username': raw_data.get('authorMeta', {}).get('name', ''),
                'user_full_name': raw_data.get('authorMeta', {}).get('nickName', ''),
                'comments': [],
                'views': raw_data.get('playCount', raw_data.get('viewsCount', 0))
            }
            
            # Extract video URLs
            if 'videoUrl' in raw_data:
                processed['videos'].append(raw_data['videoUrl'])
            elif 'videoMeta' in raw_data and 'downloadAddr' in raw_data['videoMeta']:
                processed['videos'].append(raw_data['videoMeta']['downloadAddr'])
            
            # Extract cover image
            if 'covers' in raw_data and raw_data['covers']:
                processed['images'] = raw_data['covers']
            elif 'videoMeta' in raw_data and 'cover' in raw_data['videoMeta']:
                processed['images'].append(raw_data['videoMeta']['cover'])
            
            # Process hashtags
            if 'hashtags' in raw_data:
                processed['hashtags'] = raw_data['hashtags']
            
            # Process comments
            if 'comments' in raw_data and isinstance(raw_data['comments'], list):
                for comment in raw_data['comments']:
                    if isinstance(comment, dict):
                        comment_data = {
                            'username': comment.get('uniqueId', comment.get('user', comment.get('author', ''))),
                            'user_full_name': comment.get('nickname', comment.get('name', '')),
                            'text': comment.get('text', comment.get('comment', '')),
                            'likes': comment.get('diggCount', comment.get('likesCount', 0)),
                            'timestamp': comment.get('createTime', comment.get('date', '')),
                            'replies': comment.get('replies', [])
                        }
                        processed['comments'].append(comment_data)
            
            return processed
            
        except Exception as e:
            logger.error(f"Error processing TikTok data: {str(e)}")
            return raw_data

    async def _start_facebook_scraper(self, job: ScrapyJob) -> bool:
        """Start Facebook scraping using Apify"""
        
        try:
            # Create async wrappers for database operations
            save_job = sync_to_async(lambda j: j.save())
            create_result = sync_to_async(ScrapyResult.objects.create)
            
            actor_id = self.ACTORS['facebook']
            
            # Process each URL
            for i, url in enumerate(job.target_urls):
                try:
                    logger.info(f"Starting Facebook scrape for: {url}")
                    
                    # Prepare input for Apify Facebook actor
                    run_input = {
                        "startUrls": [{"url": url}],
                        "maxPosts": job.num_of_posts,
                        "extendOutputFunction": "",
                        "customMapFunction": "",
                        "language": "en-US",
                        "proxy": {"useApifyProxy": True, "apifyProxyGroups": ["RESIDENTIAL"]},
                        "onlyPostsNewerThan": "",
                        "onlyPostsOlderThan": "",
                        "scrollWaitSecs": 2,
                        "commentsMode": "RANKED_UNFILTERED",  # Always enable comments for sentiment analysis
                        "maxComments": 100,  # Increase for better sentiment analysis
                        "maxCommentDepth": 2,  # Reasonable depth for performance
                        "scrapeNestedComments": True  # Always scrape nested comments
                    }
                    
                    # Start the Apify actor run
                    run = self.client.actor(actor_id).start(run_input=run_input)
                    run_id = run['id']
                    
                    logger.info(f"Started Apify run: {run_id} for URL: {url}")
                    
                    # Store run ID for tracking
                    job.scrapy_process_id = run_id
                    await save_job(job)
                    
                    # Poll for completion
                    max_wait_time = 300  # 5 minutes max wait
                    start_time = time.time()
                    
                    while time.time() - start_time < max_wait_time:
                        run_info = self.client.run(run_id).get()
                        status = run_info.get('status')
                        
                        logger.info(f"Run {run_id} status: {status}")
                        
                        if status == 'SUCCEEDED':
                            # Get the results
                            dataset_id = run_info.get('defaultDatasetId')
                            if dataset_id:
                                items = list(self.client.dataset(dataset_id).iterate_items())
                                
                                logger.info(f"Retrieved {len(items)} items from dataset {dataset_id}")
                                
                                # Process and save results
                                for item in items:
                                    processed_data = self._process_facebook_data(item)
                                    
                                    await create_result(
                                        job=job,
                                        source_url=url,
                                        source_name=job.source_names[i] if i < len(job.source_names) else f"Source {i+1}",
                                        scraped_data=processed_data,
                                        success=True,
                                        scrape_timestamp=timezone.now()
                                    )
                                
                                # Update job progress
                                job.processed_urls = i + 1
                                job.successful_scrapes += len(items)
                                await save_job(job)
                                
                                logger.info(f"Successfully processed {len(items)} Facebook posts from {url}")
                            break
                            
                        elif status in ['FAILED', 'ABORTED', 'TIMED_OUT']:
                            logger.error(f"Apify run {run_id} failed with status: {status}")
                            job.failed_scrapes += 1
                            await save_job(job)
                            break
                            
                        # Wait before next check
                        await asyncio.sleep(10)
                    
                except Exception as url_error:
                    logger.error(f"Error processing URL {url}: {str(url_error)}")
                    job.failed_scrapes += 1
                    await save_job(job)
            
            # Mark job as completed
            job.status = 'completed'
            job.completed_at = timezone.now()
            await save_job(job)
            
            # Transform scraped data to platform-specific models
            await self.data_transformer.transform_scrapy_results_to_platform_data(job.id)
            
            logger.info(f"Completed Facebook scraping job {job.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error in Facebook scraper: {str(e)}")
            job.status = 'failed'
            job.error_log = str(e)
            await save_job(job)
            return False

    async def _start_linkedin_scraper(self, job: ScrapyJob) -> bool:
        """Start LinkedIn scraping using Apify"""
        
        try:
            # Create async wrappers for database operations
            save_job = sync_to_async(lambda j: j.save())
            create_result = sync_to_async(ScrapyResult.objects.create)
            
            actor_id = self.ACTORS['linkedin']
            
            # Process each URL
            for i, url in enumerate(job.target_urls):
                try:
                    logger.info(f"Starting LinkedIn scrape for: {url}")
                    
                    # Prepare input for Apify LinkedIn profile scraper
                    run_input = {
                        "profiles": [url],
                        "maxResults": job.num_of_posts or 10,
                        "proxy": {
                            "useApifyProxy": True,
                            "apifyProxyCountry": "US"
                        }
                    }
                    
                    # Start the Apify actor run
                    run = self.client.actor(actor_id).start(run_input=run_input)
                    run_id = run['id']
                    
                    logger.info(f"Started Apify run: {run_id} for URL: {url}")
                    
                    # Store run ID for tracking
                    job.scrapy_process_id = run_id
                    await save_job(job)
                    
                    # Poll for completion
                    max_wait_time = 300  # 5 minutes max wait
                    start_time = time.time()
                    
                    while time.time() - start_time < max_wait_time:
                        run_info = self.client.run(run_id).get()
                        status = run_info.get('status')
                        
                        logger.info(f"Run {run_id} status: {status}")
                        
                        if status == 'SUCCEEDED':
                            # Get the results
                            dataset_id = run_info.get('defaultDatasetId')
                            if dataset_id:
                                items = list(self.client.dataset(dataset_id).iterate_items())
                                
                                logger.info(f"Retrieved {len(items)} items from dataset {dataset_id}")
                                
                                # Process and save results
                                for item in items:
                                    processed_data = self._process_linkedin_data(item)
                                    
                                    await create_result(
                                        job=job,
                                        source_url=url,
                                        source_name=job.source_names[i] if i < len(job.source_names) else f"Source {i+1}",
                                        scraped_data=processed_data,
                                        success=True,
                                        scrape_timestamp=timezone.now()
                                    )
                                
                                # Update job progress
                                job.processed_urls = i + 1
                                job.successful_scrapes += len(items)
                                await save_job(job)
                                
                                logger.info(f"Successfully processed {len(items)} LinkedIn posts from {url}")
                            break
                            
                        elif status in ['FAILED', 'ABORTED', 'TIMED_OUT']:
                            logger.error(f"Apify run {run_id} failed with status: {status}")
                            job.failed_scrapes += 1
                            await save_job(job)
                            break
                            
                        # Wait before next check
                        await asyncio.sleep(10)
                    
                except Exception as url_error:
                    logger.error(f"Error processing URL {url}: {str(url_error)}")
                    job.failed_scrapes += 1
                    await save_job(job)
            
            # Mark job as completed
            job.status = 'completed'
            job.completed_at = timezone.now()
            await save_job(job)
            
            # Transform scraped data to platform-specific models
            await self.data_transformer.transform_scrapy_results_to_platform_data(job.id)
            
            logger.info(f"Completed LinkedIn scraping job {job.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error in LinkedIn scraper: {str(e)}")
            job.status = 'failed'
            job.error_log = str(e)
            await save_job(job)
            return False

    async def _start_tiktok_scraper(self, job: ScrapyJob) -> bool:
        """Start TikTok scraping using Apify"""
        
        try:
            # Create async wrappers for database operations
            save_job = sync_to_async(lambda j: j.save())
            create_result = sync_to_async(ScrapyResult.objects.create)
            
            actor_id = self.ACTORS['tiktok']
            
            # Process each URL
            for i, url in enumerate(job.target_urls):
                try:
                    logger.info(f"Starting TikTok scrape for: {url}")
                    
                    # Prepare input for Apify TikTok actor with comment extraction enabled
                    run_input = {
                        "profiles": [url],
                        "resultsPerPage": job.num_of_posts,
                        "shouldDownloadCovers": False,
                        "shouldDownloadSlideshowImages": False,
                        "shouldDownloadSubtitles": False,
                        "shouldDownloadVideos": False,
                        # Enable comment extraction for sentiment analysis
                        "shouldDownloadComments": True,
                        "maxComments": 50,  # Extract up to 50 comments per video
                        "proxy": {"useApifyProxy": True, "apifyProxyGroups": ["RESIDENTIAL"]},
                        "extendOutputFunction": ""
                    }
                    
                    # Start the Apify actor run
                    run = self.client.actor(actor_id).start(run_input=run_input)
                    run_id = run['id']
                    
                    logger.info(f"Started Apify run: {run_id} for URL: {url}")
                    
                    # Store run ID for tracking
                    job.scrapy_process_id = run_id
                    await save_job(job)
                    
                    # Poll for completion
                    max_wait_time = 300  # 5 minutes max wait
                    start_time = time.time()
                    
                    while time.time() - start_time < max_wait_time:
                        run_info = self.client.run(run_id).get()
                        status = run_info.get('status')
                        
                        logger.info(f"Run {run_id} status: {status}")
                        
                        if status == 'SUCCEEDED':
                            # Get the results
                            dataset_id = run_info.get('defaultDatasetId')
                            if dataset_id:
                                items = list(self.client.dataset(dataset_id).iterate_items())
                                
                                logger.info(f"Retrieved {len(items)} items from dataset {dataset_id}")
                                
                                # Process and save results
                                for item in items:
                                    processed_data = self._process_tiktok_data(item)
                                    
                                    await create_result(
                                        job=job,
                                        source_url=url,
                                        source_name=job.source_names[i] if i < len(job.source_names) else f"Source {i+1}",
                                        scraped_data=processed_data,
                                        success=True,
                                        scrape_timestamp=timezone.now()
                                    )
                                
                                # Update job progress
                                job.processed_urls = i + 1
                                job.successful_scrapes += len(items)
                                await save_job(job)
                                
                                logger.info(f"Successfully processed {len(items)} TikTok posts from {url}")
                            break
                            
                        elif status in ['FAILED', 'ABORTED', 'TIMED_OUT']:
                            logger.error(f"Apify run {run_id} failed with status: {status}")
                            job.failed_scrapes += 1
                            await save_job(job)
                            break
                            
                        # Wait before next check
                        await asyncio.sleep(10)
                    
                except Exception as url_error:
                    logger.error(f"Error processing URL {url}: {str(url_error)}")
                    job.failed_scrapes += 1
                    await save_job(job)
            
            # Mark job as completed
            job.status = 'completed'
            job.completed_at = timezone.now()
            await save_job(job)
            
            # Transform scraped data to platform-specific models
            await self.data_transformer.transform_scrapy_results_to_platform_data(job.id)
            
            logger.info(f"Completed TikTok scraping job {job.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error in TikTok scraper: {str(e)}")
            job.status = 'failed'
            job.error_log = str(e)
            await save_job(job)
            return False

    async def get_job_status(self, job_id: int) -> Dict:
        """Get the current status of a scraping job"""
        
        try:
            get_job = sync_to_async(lambda: ScrapyJob.objects.get(id=job_id))
            job = await get_job()
            
            # Calculate progress percentage
            progress_percentage = 0
            if job.total_urls > 0:
                progress_percentage = round((job.processed_urls / job.total_urls) * 100, 2)
            
            return {
                'id': job.id,
                'name': job.name,
                'status': job.status,
                'progress': {
                    'percentage': progress_percentage,
                    'processed_urls': job.processed_urls,
                    'total_urls': job.total_urls,
                    'successful_scrapes': job.successful_scrapes,
                    'failed_scrapes': job.failed_scrapes
                },
                'timestamps': {
                    'created_at': job.created_at.isoformat() if job.created_at else None,
                    'started_at': job.started_at.isoformat() if job.started_at else None,
                    'completed_at': job.completed_at.isoformat() if job.completed_at else None
                },
                'error_log': job.error_log
            }
            
        except Exception as e:
            logger.error(f"Error getting job status for {job_id}: {str(e)}")
            raise

    async def cancel_job(self, job_id: int) -> bool:
        """Cancel a running scraping job"""
        
        try:
            get_job = sync_to_async(lambda: ScrapyJob.objects.get(id=job_id))
            save_job = sync_to_async(lambda j: j.save())
            
            job = await get_job()
            
            if job.status == 'running' and job.scrapy_process_id:
                # Try to abort the Apify run
                try:
                    self.client.run(job.scrapy_process_id).abort()
                    logger.info(f"Aborted Apify run: {job.scrapy_process_id}")
                except Exception as e:
                    logger.warning(f"Could not abort Apify run {job.scrapy_process_id}: {str(e)}")
            
            job.status = 'cancelled'
            job.completed_at = timezone.now()
            await save_job(job)
            
            logger.info(f"Cancelled job {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error cancelling job {job_id}: {str(e)}")
            return False