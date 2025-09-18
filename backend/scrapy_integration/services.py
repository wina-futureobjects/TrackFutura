"""
Scrapy-based Social Media Scraping Services

This module provides services for scraping social media data using Scrapy + Playwright
as a free alternative to BrightData.
"""

import asyncio
import logging
import json
import uuid
import subprocess
import os
import tempfile
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from urllib.parse import urlparse
from playwright.async_api import async_playwright
import scrapy
from scrapy.crawler import CrawlerRunner
from scrapy.utils.project import get_project_settings
from twisted.internet import reactor, defer
from multiprocessing import Process
from asgiref.sync import sync_to_async

# Import models for type hints but avoid actual usage at module level
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import ScrapyConfig, ScrapyJob, ScrapyResult
    from track_accounts.models import TrackSource

logger = logging.getLogger(__name__)


class SocialMediaScrapingService:
    """Main service for managing social media scraping with Scrapy + Playwright"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        # Platform folder models will be loaded when needed to avoid import issues

    def create_scraping_job(self, name: str, project_id: int, platform: str, 
                           content_type: str, target_urls: List[str],
                           source_names: List[str] = None,
                           num_of_posts: int = 10,
                           start_date: str = None, end_date: str = None,
                           output_folder_id: int = None,
                           auto_create_folders: bool = True):
        """Create a new Scrapy scraping job"""
        
        # Import Django models when needed
        from .models import ScrapyConfig, ScrapyJob, ScrapyResult
        
        try:
            # Get or create configuration for platform and content type
            config, created = ScrapyConfig.objects.get_or_create(
                platform=platform,
                content_type=content_type,
                defaults={'name': f"{platform.title()} {content_type.title()} Config"}
            )
            
            # Create the job
            job = ScrapyJob.objects.create(
                name=name,
                project_id=project_id,
                config=config,
                target_urls=target_urls,
                source_names=source_names or [],
                num_of_posts=num_of_posts,
                start_date=start_date,
                end_date=end_date,
                output_folder_id=output_folder_id,
                auto_create_folders=auto_create_folders,
                total_urls=len(target_urls),
                status='pending'
            )
            
            self.logger.info(f"Created scraping job: {job.name} (ID: {job.id})")
            return job
            
        except Exception as e:
            self.logger.error(f"Error creating scraping job: {str(e)}")
            raise

    def start_scraping_job(self, job_id: int) -> bool:
        """Start a scraping job"""
        
        try:
            from .models import ScrapyJob
            job = ScrapyJob.objects.get(id=job_id)
            
            if job.status != 'pending':
                self.logger.warning(f"Job {job_id} is not in pending status")
                return False
            
            # Update job status
            job.status = 'running'
            job.started_at = timezone.now()
            job.save()
            
            # Start scraping process based on platform
            if job.config.platform == 'facebook':
                success = self._scrape_facebook(job)
            elif job.config.platform == 'instagram':
                success = self._scrape_instagram(job)
            elif job.config.platform == 'linkedin':
                success = self._scrape_linkedin(job)
            elif job.config.platform == 'tiktok':
                success = self._scrape_tiktok(job)
            else:
                self.logger.error(f"Unsupported platform: {job.config.platform}")
                job.status = 'failed'
                job.error_log = f"Unsupported platform: {job.config.platform}"
                job.save()
                return False
            
            return success
            
        except ScrapyJob.DoesNotExist:
            self.logger.error(f"Job {job_id} not found")
            return False
        except Exception as e:
            self.logger.error(f"Error starting job {job_id}: {str(e)}")
            return False

    def _scrape_facebook(self, job: 'ScrapyJob') -> bool:
        """Scrape Facebook data using Playwright"""
        
        try:
            # Run Facebook scraping in separate process
            process = Process(target=self._run_facebook_scraper, args=(job.id,))
            process.start()
            
            # Store process reference
            job.scrapy_process_id = str(process.pid)
            job.save()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error scraping Facebook for job {job.id}: {str(e)}")
            job.status = 'failed'
            job.error_log = str(e)
            job.completed_at = timezone.now()
            job.save()
            return False

    def _run_facebook_scraper(self, job_id: int):
        """Run Facebook scraper in separate process"""
        
        # Setup Django in the subprocess
        import os
        import django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        django.setup()
        
        asyncio.run(self._async_facebook_scraper(job_id))

    async def _async_facebook_scraper(self, job_id: int):
        """Async Facebook scraper using Playwright"""
        
        from .models import ScrapyJob, ScrapyResult
        
        # Create async wrappers for database operations
        get_job = sync_to_async(ScrapyJob.objects.get)
        save_job = sync_to_async(lambda j: j.save())
        create_result = sync_to_async(ScrapyResult.objects.create)
        
        job = await get_job(id=job_id)
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=job.config.headless,
                    args=['--no-sandbox', '--disable-dev-shm-usage']
                )
                
                context = await browser.new_context(
                    viewport={'width': job.config.viewport_width, 'height': job.config.viewport_height},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                )
                
                for i, url in enumerate(job.target_urls):
                    try:
                        page = await context.new_page()
                        
                        # Navigate to Facebook page
                        await page.goto(url, wait_until='networkidle')
                        
                        # Wait for content to load
                        await page.wait_for_timeout(3000)
                        
                        # Scrape posts based on content type
                        if job.config.content_type == 'posts':
                            posts_data = await self._scrape_facebook_posts(page, job.num_of_posts)
                        elif job.config.content_type == 'reels':
                            posts_data = await self._scrape_facebook_reels(page, job.num_of_posts)
                        elif job.config.content_type == 'comments':
                            posts_data = await self._scrape_facebook_comments(page, job.num_of_posts)
                        else:
                            posts_data = []
                        
                        # Save results
                        source_name = job.source_names[i] if i < len(job.source_names) else f"Source {i+1}"
                        
                        await create_result(
                            job=job,
                            source_url=url,
                            source_name=source_name,
                            scraped_data=posts_data,
                            success=True
                        )
                        
                        job.successful_scrapes += 1
                        job.processed_urls += 1
                        await save_job(job)
                        
                        await page.close()
                        
                        # Add delay between requests
                        await asyncio.sleep(2)
                        
                    except Exception as e:
                        self.logger.error(f"Error scraping {url}: {str(e)}")
                        
                        await create_result(
                            job=job,
                            source_url=url,
                            source_name=job.source_names[i] if i < len(job.source_names) else f"Source {i+1}",
                            scraped_data={},
                            success=False,
                            error_message=str(e)
                        )
                        
                        job.failed_scrapes += 1
                        job.processed_urls += 1
                        await save_job(job)
                
                await browser.close()
                
                # Update job status
                job.status = 'completed'
                job.completed_at = timezone.now()
                await save_job(job)
                
                # Process results and import to platform tables
                await self._process_scraping_results(job)
                
        except Exception as e:
            self.logger.error(f"Error in Facebook scraper: {str(e)}")
            job.status = 'failed'
            job.error_log = str(e)
            job.completed_at = timezone.now()
            await save_job(job)

    async def _scrape_facebook_posts(self, page, num_posts: int) -> List[Dict]:
        """Scrape Facebook posts from a page"""
        
        posts_data = []
        
        try:
            # Scroll to load more posts
            for _ in range(min(num_posts // 5, 10)):  # Scroll max 10 times
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await page.wait_for_timeout(2000)
            
            # Find post elements (this is a simplified selector - would need refinement)
            posts = await page.query_selector_all('[data-pagelet="FeedUnit_0"], [role="article"]')
            
            for i, post in enumerate(posts[:num_posts]):
                try:
                    # Extract post data
                    post_data = {}
                    
                    # Get post text
                    text_element = await post.query_selector('[data-ad-preview="message"], [data-testid="post_message"]')
                    if text_element:
                        post_data['text'] = await text_element.text_content()
                    
                    # Get timestamp (simplified)
                    time_element = await post.query_selector('time, [data-testid="story-subtitle"]')
                    if time_element:
                        post_data['timestamp'] = await time_element.get_attribute('datetime')
                    
                    # Get engagement metrics (simplified)
                    likes_element = await post.query_selector('[aria-label*="like"], [aria-label*="reaction"]')
                    if likes_element:
                        post_data['likes'] = await likes_element.text_content()
                    
                    # Get images/media
                    images = await post.query_selector_all('img')
                    if images:
                        post_data['images'] = []
                        for img in images[:3]:  # Limit to 3 images
                            src = await img.get_attribute('src')
                            if src and 'facebook.com' in src:
                                post_data['images'].append(src)
                    
                    post_data['platform'] = 'facebook'
                    post_data['content_type'] = 'post'
                    post_data['scraped_at'] = datetime.now().isoformat()
                    
                    posts_data.append(post_data)
                    
                except Exception as e:
                    self.logger.error(f"Error extracting post data: {str(e)}")
                    continue
            
        except Exception as e:
            self.logger.error(f"Error scraping Facebook posts: {str(e)}")
        
        return posts_data

    async def _scrape_facebook_reels(self, page, num_posts: int) -> List[Dict]:
        """Scrape Facebook Reels (simplified implementation)"""
        # This would be implemented similar to posts but targeting reel-specific selectors
        return []

    async def _scrape_facebook_comments(self, page, num_posts: int) -> List[Dict]:
        """Scrape Facebook comments (simplified implementation)"""
        # This would be implemented to scrape comments from posts
        return []

    def _scrape_instagram(self, job: 'ScrapyJob') -> bool:
        """Scrape Instagram data using Playwright"""
        
        try:
            # Run Instagram scraping in separate process
            process = Process(target=self._run_instagram_scraper, args=(job.id,))
            process.start()
            
            # Store process reference
            job.scrapy_process_id = str(process.pid)
            job.save()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error scraping Instagram for job {job.id}: {str(e)}")
            job.status = 'failed'
            job.error_log = str(e)
            job.completed_at = timezone.now()
            job.save()
            return False

    def _run_instagram_scraper(self, job_id: int):
        """Run Instagram scraper in separate process"""
        
        # Setup Django in the subprocess
        import os
        import django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        django.setup()
        
        asyncio.run(self._async_instagram_scraper(job_id))

    async def _async_instagram_scraper(self, job_id: int):
        """Async Instagram scraper using Playwright"""
        
        # Import Django models after Django setup
        from .models import ScrapyConfig, ScrapyJob, ScrapyResult
        from instagram_data.models import Folder as InstagramFolder
        
        # Create async wrappers for database operations
        get_job_with_config = sync_to_async(lambda: ScrapyJob.objects.select_related('config').get(id=job_id))
        save_job = sync_to_async(lambda j: j.save())
        create_result = sync_to_async(ScrapyResult.objects.create)
        
        job = await get_job_with_config()
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=job.config.headless,
                    args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
                )
                
                context = await browser.new_context(
                    viewport={'width': job.config.viewport_width, 'height': job.config.viewport_height},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                )
                
                # Add stealth settings
                await context.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined,
                    });
                """)
                
                for i, url in enumerate(job.target_urls):
                    try:
                        page = await context.new_page()
                        
                        # Navigate to Instagram profile
                        await page.goto(url, wait_until='networkidle')
                        
                        # Wait for content to load
                        await page.wait_for_timeout(5000)
                        
                        # Scrape posts based on content type
                        if job.config.content_type == 'posts':
                            posts_data = await self._scrape_instagram_posts(page, job.num_of_posts)
                        elif job.config.content_type == 'reels':
                            posts_data = await self._scrape_instagram_reels(page, job.num_of_posts)
                        elif job.config.content_type == 'profile':
                            posts_data = await self._scrape_instagram_profile(page)
                        else:
                            posts_data = []
                        
                        # Save results
                        source_name = job.source_names[i] if i < len(job.source_names) else f"Source {i+1}"
                        
                        await create_result(
                            job=job,
                            source_url=url,
                            source_name=source_name,
                            scraped_data=posts_data,
                            success=True
                        )
                        
                        job.successful_scrapes += 1
                        job.processed_urls += 1
                        await save_job(job)
                        
                        await page.close()
                        
                        # Add delay between requests
                        await asyncio.sleep(3)
                        
                    except Exception as e:
                        self.logger.error(f"Error scraping {url}: {str(e)}")
                        
                        await create_result(
                            job=job,
                            source_url=url,
                            source_name=job.source_names[i] if i < len(job.source_names) else f"Source {i+1}",
                            scraped_data={},
                            success=False,
                            error_message=str(e)
                        )
                        
                        job.failed_scrapes += 1
                        job.processed_urls += 1
                        await save_job(job)
                
                await browser.close()
                
                # Update job status
                job.status = 'completed'
                job.completed_at = timezone.now()
                await save_job(job)
                
                # Process results and import to platform tables
                await self._process_scraping_results(job)
                
        except Exception as e:
            self.logger.error(f"Error in Instagram scraper: {str(e)}")
            job.status = 'failed'
            job.error_log = str(e)
            job.completed_at = timezone.now()
            await save_job(job)

    async def _scrape_instagram_posts(self, page, num_posts: int) -> List[Dict]:
        """Scrape Instagram posts from a profile"""
        
        posts_data = []
        
        try:
            # Wait for posts to load
            await page.wait_for_selector('article', timeout=10000)
            
            # Scroll to load more posts
            for _ in range(min(num_posts // 12, 5)):  # Instagram loads ~12 posts per scroll
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await page.wait_for_timeout(3000)
            
            # Find post links
            post_links = await page.query_selector_all('article a[href*="/p/"]')
            
            for i, link in enumerate(post_links[:num_posts]):
                try:
                    # Get post URL
                    post_url = await link.get_attribute('href')
                    if not post_url.startswith('http'):
                        post_url = f"https://www.instagram.com{post_url}"
                    
                    # Open post in new tab
                    post_page = await page.context.new_page()
                    await post_page.goto(post_url, wait_until='networkidle')
                    await post_page.wait_for_timeout(2000)
                    
                    # Extract post data
                    post_data = {}
                    
                    # Get post text/caption
                    try:
                        caption_element = await post_page.query_selector('article h1 + div, article [data-testid="post-caption"]')
                        if caption_element:
                            post_data['caption'] = await caption_element.text_content()
                    except:
                        post_data['caption'] = ''
                    
                    # Get timestamp
                    try:
                        time_element = await post_page.query_selector('time')
                        if time_element:
                            post_data['timestamp'] = await time_element.get_attribute('datetime')
                    except:
                        post_data['timestamp'] = None
                    
                    # Get engagement metrics
                    try:
                        likes_element = await post_page.query_selector('[data-testid="like-count"], button[class*="like"] span')
                        if likes_element:
                            likes_text = await likes_element.text_content()
                            post_data['likes'] = self._parse_number(likes_text)
                    except:
                        post_data['likes'] = 0
                    
                    try:
                        comments_element = await post_page.query_selector('[data-testid="comment-count"], a[href*="/comments/"] span')
                        if comments_element:
                            comments_text = await comments_element.text_content()
                            post_data['comments'] = self._parse_number(comments_text)
                    except:
                        post_data['comments'] = 0
                    
                    # Get images
                    try:
                        images = await post_page.query_selector_all('article img[src*="instagram"]')
                        if images:
                            post_data['images'] = []
                            for img in images[:3]:  # Limit to 3 images
                                src = await img.get_attribute('src')
                                if src and 'instagram' in src:
                                    post_data['images'].append(src)
                    except:
                        post_data['images'] = []
                    
                    # Get post type
                    is_video = await post_page.query_selector('video')
                    post_data['media_type'] = 'video' if is_video else 'photo'
                    
                    post_data['platform'] = 'instagram'
                    post_data['content_type'] = 'post'
                    post_data['post_url'] = post_url
                    post_data['scraped_at'] = datetime.now().isoformat()
                    
                    posts_data.append(post_data)
                    
                    await post_page.close()
                    
                    # Add delay between posts
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    self.logger.error(f"Error extracting post data: {str(e)}")
                    continue
            
        except Exception as e:
            self.logger.error(f"Error scraping Instagram posts: {str(e)}")
        
        return posts_data

    async def _scrape_instagram_reels(self, page, num_posts: int) -> List[Dict]:
        """Scrape Instagram Reels"""
        
        reels_data = []
        
        try:
            # Navigate to reels tab
            reels_tab = await page.query_selector('a[href*="/reels/"]')
            if reels_tab:
                await reels_tab.click()
                await page.wait_for_timeout(3000)
            
            # Find reel links
            reel_links = await page.query_selector_all('a[href*="/reel/"]')
            
            for i, link in enumerate(reel_links[:num_posts]):
                try:
                    # Get reel URL
                    reel_url = await link.get_attribute('href')
                    if not reel_url.startswith('http'):
                        reel_url = f"https://www.instagram.com{reel_url}"
                    
                    # Open reel in new tab
                    reel_page = await page.context.new_page()
                    await reel_page.goto(reel_url, wait_until='networkidle')
                    await reel_page.wait_for_timeout(2000)
                    
                    # Extract reel data
                    reel_data = {}
                    
                    # Get caption
                    try:
                        caption_element = await reel_page.query_selector('article h1 + div')
                        if caption_element:
                            reel_data['caption'] = await caption_element.text_content()
                    except:
                        reel_data['caption'] = ''
                    
                    # Get video URL
                    try:
                        video_element = await reel_page.query_selector('video')
                        if video_element:
                            reel_data['video_url'] = await video_element.get_attribute('src')
                    except:
                        reel_data['video_url'] = ''
                    
                    reel_data['platform'] = 'instagram'
                    reel_data['content_type'] = 'reel'
                    reel_data['post_url'] = reel_url
                    reel_data['scraped_at'] = datetime.now().isoformat()
                    
                    reels_data.append(reel_data)
                    
                    await reel_page.close()
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    self.logger.error(f"Error extracting reel data: {str(e)}")
                    continue
            
        except Exception as e:
            self.logger.error(f"Error scraping Instagram reels: {str(e)}")
        
        return reels_data

    async def _scrape_instagram_profile(self, page) -> List[Dict]:
        """Scrape Instagram profile information"""
        
        profile_data = {}
        
        try:
            # Get profile info
            try:
                username_element = await page.query_selector('header h2')
                if username_element:
                    profile_data['username'] = await username_element.text_content()
            except:
                profile_data['username'] = ''
            
            try:
                bio_element = await page.query_selector('header section div span')
                if bio_element:
                    profile_data['bio'] = await bio_element.text_content()
            except:
                profile_data['bio'] = ''
            
            try:
                followers_element = await page.query_selector('a[href*="/followers/"] span')
                if followers_element:
                    followers_text = await followers_element.text_content()
                    profile_data['followers'] = self._parse_number(followers_text)
            except:
                profile_data['followers'] = 0
            
            try:
                following_element = await page.query_selector('a[href*="/following/"] span')
                if following_element:
                    following_text = await following_element.text_content()
                    profile_data['following'] = self._parse_number(following_text)
            except:
                profile_data['following'] = 0
            
            try:
                posts_element = await page.query_selector('header section ul li span')
                if posts_element:
                    posts_text = await posts_element.text_content()
                    profile_data['posts_count'] = self._parse_number(posts_text)
            except:
                profile_data['posts_count'] = 0
            
            profile_data['platform'] = 'instagram'
            profile_data['content_type'] = 'profile'
            profile_data['scraped_at'] = datetime.now().isoformat()
            
        except Exception as e:
            self.logger.error(f"Error scraping Instagram profile: {str(e)}")
        
        return [profile_data]

    def _scrape_linkedin(self, job: 'ScrapyJob') -> bool:
        """Scrape LinkedIn data using Playwright"""
        
        try:
            # Run LinkedIn scraping in separate process
            process = Process(target=self._run_linkedin_scraper, args=(job.id,))
            process.start()
            
            # Store process reference
            job.scrapy_process_id = str(process.pid)
            job.save()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error scraping LinkedIn for job {job.id}: {str(e)}")
            job.status = 'failed'
            job.error_log = str(e)
            job.completed_at = timezone.now()
            job.save()
            return False

    def _run_linkedin_scraper(self, job_id: int):
        """Run LinkedIn scraper in separate process"""
        
        # Setup Django in the subprocess
        import os
        import django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        django.setup()
        
        asyncio.run(self._async_linkedin_scraper(job_id))

    async def _async_linkedin_scraper(self, job_id: int):
        """Async LinkedIn scraper using Playwright"""
        
        from .models import ScrapyJob, ScrapyResult
        
        # Create async wrappers for database operations
        get_job = sync_to_async(ScrapyJob.objects.get)
        save_job = sync_to_async(lambda j: j.save())
        create_result = sync_to_async(ScrapyResult.objects.create)
        
        job = await get_job(id=job_id)
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=job.config.headless,
                    args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
                )
                
                context = await browser.new_context(
                    viewport={'width': job.config.viewport_width, 'height': job.config.viewport_height},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                )
                
                # Add stealth settings
                await context.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined,
                    });
                """)
                
                for i, url in enumerate(job.target_urls):
                    try:
                        page = await context.new_page()
                        
                        # Navigate to LinkedIn profile/company page
                        await page.goto(url, wait_until='networkidle')
                        
                        # Wait for content to load
                        await page.wait_for_timeout(5000)
                        
                        # Check if we need to handle login wall
                        if "authwall" in page.url or "login" in page.url:
                            self.logger.warning(f"LinkedIn login wall detected for {url}")
                            # Try to extract public information only
                        
                        # Scrape posts based on content type
                        if job.config.content_type == 'posts':
                            posts_data = await self._scrape_linkedin_posts(page, job.num_of_posts)
                        elif job.config.content_type == 'profile':
                            posts_data = await self._scrape_linkedin_profile(page)
                        else:
                            posts_data = []
                        
                        # Save results
                        source_name = job.source_names[i] if i < len(job.source_names) else f"Source {i+1}"
                        
                        await create_result(
                            job=job,
                            source_url=url,
                            source_name=source_name,
                            scraped_data=posts_data,
                            success=True
                        )
                        
                        job.successful_scrapes += 1
                        job.processed_urls += 1
                        await save_job(job)
                        
                        await page.close()
                        
                        # Add delay between requests
                        await asyncio.sleep(4)  # Longer delay for LinkedIn
                        
                    except Exception as e:
                        self.logger.error(f"Error scraping {url}: {str(e)}")
                        
                        await create_result(
                            job=job,
                            source_url=url,
                            source_name=job.source_names[i] if i < len(job.source_names) else f"Source {i+1}",
                            scraped_data={},
                            success=False,
                            error_message=str(e)
                        )
                        
                        job.failed_scrapes += 1
                        job.processed_urls += 1
                        await save_job(job)
                
                await browser.close()
                
                # Update job status
                job.status = 'completed'
                job.completed_at = timezone.now()
                await save_job(job)
                
                # Process results and import to platform tables
                await self._process_scraping_results(job)
                
        except Exception as e:
            self.logger.error(f"Error in LinkedIn scraper: {str(e)}")
            job.status = 'failed'
            job.error_log = str(e)
            job.completed_at = timezone.now()
            await save_job(job)

    async def _scrape_linkedin_posts(self, page, num_posts: int) -> List[Dict]:
        """Scrape LinkedIn posts from a profile or company page"""
        
        posts_data = []
        
        try:
            # Wait for posts to load
            await page.wait_for_timeout(3000)
            
            # Scroll to load more posts
            for _ in range(min(num_posts // 5, 3)):  # LinkedIn loads ~5 posts per scroll
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await page.wait_for_timeout(3000)
            
            # Find post elements (LinkedIn has complex structure)
            posts = await page.query_selector_all('div[data-id], .feed-shared-update-v2, article')
            
            for i, post in enumerate(posts[:num_posts]):
                try:
                    # Extract post data
                    post_data = {}
                    
                    # Get post text
                    try:
                        text_element = await post.query_selector('.break-words, .feed-shared-text, .attributed-text-segment-list__content')
                        if text_element:
                            post_data['text'] = await text_element.text_content()
                    except:
                        post_data['text'] = ''
                    
                    # Get author info
                    try:
                        author_element = await post.query_selector('.feed-shared-actor__name, .update-components-actor__name')
                        if author_element:
                            post_data['author'] = await author_element.text_content()
                    except:
                        post_data['author'] = ''
                    
                    # Get timestamp
                    try:
                        time_element = await post.query_selector('time, .feed-shared-actor__sub-description')
                        if time_element:
                            post_data['timestamp'] = await time_element.get_attribute('datetime')
                    except:
                        post_data['timestamp'] = None
                    
                    # Get engagement metrics
                    try:
                        likes_element = await post.query_selector('.social-counts-reactions__count')
                        if likes_element:
                            likes_text = await likes_element.text_content()
                            post_data['likes'] = self._parse_number(likes_text)
                    except:
                        post_data['likes'] = 0
                    
                    try:
                        comments_element = await post.query_selector('[data-test-id="social-action-comments"] span')
                        if comments_element:
                            comments_text = await comments_element.text_content()
                            post_data['comments'] = self._parse_number(comments_text)
                    except:
                        post_data['comments'] = 0
                    
                    # Get images/media
                    try:
                        images = await post.query_selector_all('img[src*="media.licdn.com"]')
                        if images:
                            post_data['images'] = []
                            for img in images[:2]:  # Limit to 2 images
                                src = await img.get_attribute('src')
                                if src and 'media.licdn.com' in src:
                                    post_data['images'].append(src)
                    except:
                        post_data['images'] = []
                    
                    post_data['platform'] = 'linkedin'
                    post_data['content_type'] = 'post'
                    post_data['scraped_at'] = datetime.now().isoformat()
                    
                    if post_data['text'] or post_data['images']:  # Only add posts with content
                        posts_data.append(post_data)
                    
                except Exception as e:
                    self.logger.error(f"Error extracting LinkedIn post data: {str(e)}")
                    continue
            
        except Exception as e:
            self.logger.error(f"Error scraping LinkedIn posts: {str(e)}")
        
        return posts_data

    async def _scrape_linkedin_profile(self, page) -> List[Dict]:
        """Scrape LinkedIn profile information"""
        
        profile_data = {}
        
        try:
            # Get profile info
            try:
                name_element = await page.query_selector('h1, .text-heading-xlarge')
                if name_element:
                    profile_data['name'] = await name_element.text_content()
            except:
                profile_data['name'] = ''
            
            try:
                headline_element = await page.query_selector('.text-body-medium, .pv-text-details__left-panel h2')
                if headline_element:
                    profile_data['headline'] = await headline_element.text_content()
            except:
                profile_data['headline'] = ''
            
            try:
                location_element = await page.query_selector('.pv-text-details__left-panel .t-black--light')
                if location_element:
                    profile_data['location'] = await location_element.text_content()
            except:
                profile_data['location'] = ''
            
            try:
                connections_element = await page.query_selector('[href*="connections"] span')
                if connections_element:
                    connections_text = await connections_element.text_content()
                    profile_data['connections'] = self._parse_number(connections_text.replace('connections', ''))
            except:
                profile_data['connections'] = 0
            
            profile_data['platform'] = 'linkedin'
            profile_data['content_type'] = 'profile'
            profile_data['scraped_at'] = datetime.now().isoformat()
            
        except Exception as e:
            self.logger.error(f"Error scraping LinkedIn profile: {str(e)}")
        
        return [profile_data]

    def _scrape_tiktok(self, job: 'ScrapyJob') -> bool:
        """Scrape TikTok data using Playwright"""
        
        self.logger.info(f"Starting TikTok scraping for job {job.id}")
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self._async_scrape_tiktok(job))
            return True
            
        except Exception as e:
            self.logger.error(f"Error in TikTok scraper: {str(e)}")
            job.status = 'failed'
            job.error_log = str(e)
            job.completed_at = timezone.now()
            job.save()
            return False
        
        finally:
            loop.close()
    
    async def _async_scrape_tiktok(self, job: 'ScrapyJob'):
        """Async TikTok scraping implementation"""
        
        from .models import ScrapyResult
        
        # Create async wrappers for database operations
        save_job = sync_to_async(lambda j: j.save())
        create_result = sync_to_async(ScrapyResult.objects.create)
        
        try:
            job.status = 'running'
            job.started_at = timezone.now()
            job.processed_urls = 0
            job.successful_scrapes = 0
            job.failed_scrapes = 0
            await save_job(job)
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    ]
                )
                
                for i, url in enumerate(job.target_urls):
                    try:
                        self.logger.info(f"Scraping TikTok URL: {url}")
                        
                        page = await browser.new_page()
                        
                        # Set additional headers to avoid detection
                        await page.set_extra_http_headers({
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        })
                        
                        await page.goto(url, wait_until='networkidle', timeout=30000)
                        await page.wait_for_timeout(5000)  # Wait for dynamic content
                        
                        scraped_data = []
                        
                        # Determine content type and scrape accordingly
                        if job.config.content_type == 'posts':
                            if '/@' in url:
                                # Profile URL - scrape posts from profile
                                scraped_data = await self._scrape_tiktok_posts(page, job.num_of_posts or 10)
                            elif '/video/' in url:
                                # Individual video URL
                                scraped_data = await self._scrape_tiktok_video(page)
                        elif job.config.content_type == 'profile':
                            scraped_data = await self._scrape_tiktok_profile(page)
                        
                        # Save results
                        if scraped_data:
                            await create_result(
                                job=job,
                                source_url=url,
                                source_name=job.source_names[i] if i < len(job.source_names) else f"Source {i+1}",
                                scraped_data=scraped_data,
                                success=True
                            )
                            job.successful_scrapes += 1
                        else:
                            await create_result(
                                job=job,
                                source_url=url,
                                source_name=job.source_names[i] if i < len(job.source_names) else f"Source {i+1}",
                                scraped_data=[],
                                success=False,
                                error_message="No data found"
                            )
                            job.failed_scrapes += 1
                        
                        job.processed_urls += 1
                        await save_job(job)
                        
                        await page.close()
                        
                        # Add delay between requests
                        await asyncio.sleep(5)  # Longer delay for TikTok
                        
                    except Exception as e:
                        self.logger.error(f"Error scraping TikTok URL {url}: {str(e)}")
                        
                        await create_result(
                            job=job,
                            source_url=url,
                            source_name=job.source_names[i] if i < len(job.source_names) else f"Source {i+1}",
                            scraped_data=[],
                            success=False,
                            error_message=str(e)
                        )
                        
                        job.failed_scrapes += 1
                        job.processed_urls += 1
                        await save_job(job)
                
                await browser.close()
                
                # Update job status
                job.status = 'completed'
                job.completed_at = timezone.now()
                await save_job(job)
                
                # Process results and import to platform tables
                await self._process_scraping_results(job)
                
        except Exception as e:
            self.logger.error(f"Error in TikTok scraper: {str(e)}")
            job.status = 'failed'
            job.error_log = str(e)
            job.completed_at = timezone.now()
            await save_job(job)

    async def _scrape_tiktok_posts(self, page, num_posts: int) -> List[Dict]:
        """Scrape TikTok posts from a profile"""
        
        posts_data = []
        
        try:
            # Wait for videos to load
            await page.wait_for_selector('[data-e2e="user-post-item"]', timeout=15000)
            
            # Scroll to load more videos
            for _ in range(min(num_posts // 10, 3)):  # TikTok loads ~10-15 videos per scroll
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await page.wait_for_timeout(4000)
            
            # Find video elements
            video_elements = await page.query_selector_all('[data-e2e="user-post-item"]')
            
            for i, video_element in enumerate(video_elements[:num_posts]):
                try:
                    post_data = {}
                    
                    # Get video URL
                    video_link = await video_element.query_selector('a')
                    if video_link:
                        video_url = await video_link.get_attribute('href')
                        if not video_url.startswith('http'):
                            video_url = f"https://www.tiktok.com{video_url}"
                        post_data['post_url'] = video_url
                    
                    # Get video thumbnail/image
                    try:
                        img_element = await video_element.query_selector('img')
                        if img_element:
                            post_data['thumbnail_url'] = await img_element.get_attribute('src')
                    except:
                        post_data['thumbnail_url'] = ''
                    
                    # Get view count if available
                    try:
                        views_element = await video_element.query_selector('[data-e2e="video-views"]')
                        if views_element:
                            views_text = await views_element.text_content()
                            post_data['views'] = self._parse_number(views_text)
                    except:
                        post_data['views'] = 0
                    
                    # Visit individual video page for more details
                    if post_data.get('post_url'):
                        video_page = await page.context.new_page()
                        try:
                            await video_page.goto(post_data['post_url'], wait_until='networkidle', timeout=15000)
                            await video_page.wait_for_timeout(3000)
                            
                            # Get video description/caption
                            try:
                                desc_element = await video_page.query_selector('[data-e2e="browse-video-desc"]')
                                if desc_element:
                                    post_data['description'] = await desc_element.text_content()
                            except:
                                post_data['description'] = ''
                            
                            # Get engagement metrics
                            try:
                                likes_element = await video_page.query_selector('[data-e2e="like-count"]')
                                if likes_element:
                                    likes_text = await likes_element.text_content()
                                    post_data['likes'] = self._parse_number(likes_text)
                            except:
                                post_data['likes'] = 0
                            
                            try:
                                comments_element = await video_page.query_selector('[data-e2e="comment-count"]')
                                if comments_element:
                                    comments_text = await comments_element.text_content()
                                    post_data['comments'] = self._parse_number(comments_text)
                            except:
                                post_data['comments'] = 0
                            
                            try:
                                shares_element = await video_page.query_selector('[data-e2e="share-count"]')
                                if shares_element:
                                    shares_text = await shares_element.text_content()
                                    post_data['shares'] = self._parse_number(shares_text)
                            except:
                                post_data['shares'] = 0
                            
                            # Get author info
                            try:
                                author_element = await video_page.query_selector('[data-e2e="video-author-uniqueid"]')
                                if author_element:
                                    post_data['author'] = await author_element.text_content()
                            except:
                                post_data['author'] = ''
                            
                        except Exception as e:
                            self.logger.error(f"Error getting TikTok video details: {str(e)}")
                        
                        finally:
                            await video_page.close()
                    
                    post_data['platform'] = 'tiktok'
                    post_data['content_type'] = 'video'
                    post_data['scraped_at'] = datetime.now().isoformat()
                    
                    posts_data.append(post_data)
                    
                except Exception as e:
                    self.logger.error(f"Error scraping TikTok post {i}: {str(e)}")
                    continue
            
        except Exception as e:
            self.logger.error(f"Error scraping TikTok posts: {str(e)}")
        
        return posts_data

    async def _scrape_tiktok_video(self, page) -> List[Dict]:
        """Scrape individual TikTok video"""
        
        video_data = {}
        
        try:
            # Get video description
            try:
                desc_element = await page.query_selector('[data-e2e="browse-video-desc"]')
                if desc_element:
                    video_data['description'] = await desc_element.text_content()
            except:
                video_data['description'] = ''
            
            # Get engagement metrics
            try:
                likes_element = await page.query_selector('[data-e2e="like-count"]')
                if likes_element:
                    likes_text = await likes_element.text_content()
                    video_data['likes'] = self._parse_number(likes_text)
            except:
                video_data['likes'] = 0
            
            try:
                comments_element = await page.query_selector('[data-e2e="comment-count"]')
                if comments_element:
                    comments_text = await comments_element.text_content()
                    video_data['comments'] = self._parse_number(comments_text)
            except:
                video_data['comments'] = 0
            
            try:
                shares_element = await page.query_selector('[data-e2e="share-count"]')
                if shares_element:
                    shares_text = await shares_element.text_content()
                    video_data['shares'] = self._parse_number(shares_text)
            except:
                video_data['shares'] = 0
            
            # Get author info
            try:
                author_element = await page.query_selector('[data-e2e="video-author-uniqueid"]')
                if author_element:
                    video_data['author'] = await author_element.text_content()
            except:
                video_data['author'] = ''
            
            # Get video URL
            video_data['post_url'] = page.url
            
            video_data['platform'] = 'tiktok'
            video_data['content_type'] = 'video'
            video_data['scraped_at'] = datetime.now().isoformat()
            
        except Exception as e:
            self.logger.error(f"Error scraping TikTok video: {str(e)}")
        
        return [video_data]

    async def _scrape_tiktok_profile(self, page) -> List[Dict]:
        """Scrape TikTok profile information"""
        
        profile_data = {}
        
        try:
            # Get username
            try:
                username_element = await page.query_selector('[data-e2e="user-title"]')
                if username_element:
                    profile_data['username'] = await username_element.text_content()
            except:
                profile_data['username'] = ''
            
            # Get display name
            try:
                name_element = await page.query_selector('[data-e2e="user-subtitle"]')
                if name_element:
                    profile_data['display_name'] = await name_element.text_content()
            except:
                profile_data['display_name'] = ''
            
            # Get bio/description
            try:
                bio_element = await page.query_selector('[data-e2e="user-bio"]')
                if bio_element:
                    profile_data['bio'] = await bio_element.text_content()
            except:
                profile_data['bio'] = ''
            
            # Get follower/following counts
            try:
                stats_elements = await page.query_selector_all('[data-e2e="followers-count"], [data-e2e="following-count"]')
                for element in stats_elements:
                    text = await element.text_content()
                    data_attr = await element.get_attribute('data-e2e')
                    if 'followers' in data_attr:
                        profile_data['followers'] = self._parse_number(text)
                    elif 'following' in data_attr:
                        profile_data['following'] = self._parse_number(text)
            except:
                profile_data['followers'] = 0
                profile_data['following'] = 0
            
            # Get likes count
            try:
                likes_element = await page.query_selector('[data-e2e="likes-count"]')
                if likes_element:
                    likes_text = await likes_element.text_content()
                    profile_data['total_likes'] = self._parse_number(likes_text)
            except:
                profile_data['total_likes'] = 0
            
            profile_data['platform'] = 'tiktok'
            profile_data['content_type'] = 'profile'
            profile_data['scraped_at'] = datetime.now().isoformat()
            
        except Exception as e:
            self.logger.error(f"Error scraping TikTok profile: {str(e)}")
        
        return [profile_data]

    async def _process_scraping_results(self, job: 'ScrapyJob'):
        """Process scraping results and import to platform-specific tables"""
        
        from .models import ScrapyResult
        
        # Create async wrappers for database operations
        filter_results = sync_to_async(lambda: list(ScrapyResult.objects.filter(job=job, success=True)))
        save_result = sync_to_async(lambda r: r.save())
        
        try:
            results = await filter_results()
            
            for result in results:
                if job.config.platform == 'facebook':
                    await self._import_facebook_data(result)
                elif job.config.platform == 'instagram':
                    await self._import_instagram_data(result)
                elif job.config.platform == 'linkedin':
                    await self._import_linkedin_data(result)
                elif job.config.platform == 'tiktok':
                    await self._import_tiktok_data(result)
                
                result.imported_to_platform = True
                await save_result(result)
            
        except Exception as e:
            self.logger.error(f"Error processing scraping results: {str(e)}")

    async def _import_facebook_data(self, result):
        """Import Facebook data to FacebookPost model"""
        
        try:
            from facebook_data.models import FacebookPost
            
            for post_data in result.scraped_data:
                FacebookPost.objects.get_or_create(
                    post_id=post_data.get('post_id', f"scrapy_{uuid.uuid4().hex[:8]}"),
                    defaults={
                        'text': post_data.get('text', ''),
                        'date_posted': post_data.get('timestamp'),
                        'likes': self._parse_number(post_data.get('likes', '0')),
                        'comments_count': self._parse_number(post_data.get('comments', '0')),
                        'shares': self._parse_number(post_data.get('shares', '0')),
                        'source_url': result.source_url,
                        'platform_type': 'facebook',
                        'scraped_by': 'scrapy'
                    }
                )
            
        except Exception as e:
            self.logger.error(f"Error importing Facebook data: {str(e)}")

    async def _import_instagram_data(self, result):
        """Import Instagram data to InstagramPost model"""
        
        try:
            from instagram_data.models import InstagramPost
            import uuid
            
            for post_data in result.scraped_data:
                # Extract post ID from URL or generate one
                post_id = post_data.get('post_url', '').split('/')[-2] if '/p/' in post_data.get('post_url', '') else f"scrapy_{uuid.uuid4().hex[:8]}"
                
                InstagramPost.objects.get_or_create(
                    post_id=post_id,
                    defaults={
                        'text': post_data.get('caption', ''),
                        'date_posted': post_data.get('timestamp'),
                        'likes': post_data.get('likes', 0),
                        'comments_count': post_data.get('comments', 0),
                        'shares': post_data.get('shares', 0),
                        'source_url': result.source_url,
                        'platform_type': 'instagram',
                        'content_type': post_data.get('media_type', 'photo'),
                        'scraped_by': 'scrapy',
                        'post_url': post_data.get('post_url', ''),
                        'username': post_data.get('username', result.source_name),
                        'bio': post_data.get('bio', ''),
                        'followers_count': post_data.get('followers', 0),
                        'following_count': post_data.get('following', 0),
                        'posts_count': post_data.get('posts_count', 0),
                    }
                )
            
        except Exception as e:
            self.logger.error(f"Error importing Instagram data: {str(e)}")

    async def _import_linkedin_data(self, result):
        """Import LinkedIn data to LinkedInPost model (placeholder)"""
        pass

    async def _import_tiktok_data(self, result):
        """Import TikTok data to TikTokPost model"""
        
        try:
            from tiktok_data.models import TikTokPost
            import uuid
            
            for post_data in result.scraped_data:
                # Extract post ID from URL or generate one
                post_id = post_data.get('post_url', '').split('/')[-1] if '/video/' in post_data.get('post_url', '') else f"scrapy_{uuid.uuid4().hex[:8]}"
                
                TikTokPost.objects.get_or_create(
                    post_id=post_id,
                    defaults={
                        'text': post_data.get('description', ''),
                        'date_posted': post_data.get('timestamp'),
                        'likes': post_data.get('likes', 0),
                        'comments_count': post_data.get('comments', 0),
                        'shares': post_data.get('shares', 0),
                        'views': post_data.get('views', 0),
                        'source_url': result.source_url,
                        'platform_type': 'tiktok',
                        'content_type': post_data.get('content_type', 'video'),
                        'scraped_by': 'scrapy',
                        'post_url': post_data.get('post_url', ''),
                        'username': post_data.get('author', result.source_name),
                        'thumbnail_url': post_data.get('thumbnail_url', ''),
                        'bio': post_data.get('bio', ''),
                        'followers_count': post_data.get('followers', 0),
                        'following_count': post_data.get('following', 0),
                        'total_likes': post_data.get('total_likes', 0),
                    }
                )
            
        except ImportError:
            self.logger.warning("TikTokPost model not found - TikTok data will remain in ScrapyResult table")
        except Exception as e:
            self.logger.error(f"Error importing TikTok data: {str(e)}")

    def _parse_number(self, text: str) -> int:
        """Parse engagement numbers (e.g., '1.2K' -> 1200)"""
        
        if not text:
            return 0
        
        text = text.strip().upper()
        
        try:
            if 'K' in text:
                return int(float(text.replace('K', '')) * 1000)
            elif 'M' in text:
                return int(float(text.replace('M', '')) * 1000000)
            else:
                return int(text.replace(',', ''))
        except:
            return 0

    def get_job_status(self, job_id: int) -> Dict:
        """Get status of a scraping job"""
        
        try:
            from .models import ScrapyJob
            job = ScrapyJob.objects.get(id=job_id)
            
            return {
                'id': job.id,
                'name': job.name,
                'status': job.status,
                'progress': {
                    'total_urls': job.total_urls,
                    'processed_urls': job.processed_urls,
                    'successful_scrapes': job.successful_scrapes,
                    'failed_scrapes': job.failed_scrapes,
                    'percentage': (job.processed_urls / job.total_urls * 100) if job.total_urls > 0 else 0
                },
                'timestamps': {
                    'created_at': job.created_at,
                    'started_at': job.started_at,
                    'completed_at': job.completed_at
                },
                'error_log': job.error_log
            }
            
        except ScrapyJob.DoesNotExist:
            return {'error': f'Job {job_id} not found'}

    def cancel_job(self, job_id: int) -> bool:
        """Cancel a running scraping job"""
        
        try:
            from .models import ScrapyJob
            job = ScrapyJob.objects.get(id=job_id)
            
            if job.status not in ['running', 'pending']:
                return False
            
            # Kill the process if it's running
            if job.scrapy_process_id:
                try:
                    import psutil
                    process = psutil.Process(int(job.scrapy_process_id))
                    process.terminate()
                except:
                    pass
            
            job.status = 'cancelled'
            job.completed_at = timezone.now()
            job.save()
            
            return True
            
        except ScrapyJob.DoesNotExist:
            return False