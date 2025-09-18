"""
Instagram Comment Scraping Services

This module provides services for scraping Instagram comments from posts
using BrightData's API.
"""

import logging
import requests
import json
import datetime
from typing import List, Dict, Optional, Tuple
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from dateutil import parser as date_parser

from .models import InstagramPost, InstagramComment, Folder, CommentScrapingJob
from brightdata_integration.models import BrightdataConfig

logger = logging.getLogger(__name__)

class InstagramCommentScraper:
    """
    Service class for scraping Instagram comments using BrightData
    """
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
    
    def create_comment_scraping_job(self, name: str, project_id: int, 
                                  selected_folders: List[int], result_folder_name: str = None) -> CommentScrapingJob:
        """
        Create a new Instagram comment scraping job with an optional result folder
        """
        # Create a folder for storing the comment results if folder name is provided
        result_folder = None
        if result_folder_name:
            result_folder = Folder.objects.create(
                name=result_folder_name,
                description=f"Instagram comments scraped from job: {name}",
                category='comments',  # Specify this is a comments folder
                project_id=project_id
            )
            self.logger.info(f"Created result folder: {result_folder_name} (ID: {result_folder.id})")
        
        job = CommentScrapingJob.objects.create(
            name=name,
            project_id=project_id,
            selected_folders=selected_folders,
            result_folder=result_folder,
            status='pending'
        )
        
        self.logger.info(f"Created Instagram comment scraping job: {job.name} (ID: {job.id})")
        return job
    
    def execute_comment_scraping_job(self, job_id: int) -> bool:
        """
        Execute an Instagram comment scraping job
        """
        try:
            job = CommentScrapingJob.objects.get(id=job_id)
            
            with transaction.atomic():
                job.status = 'processing'
                job.started_at = timezone.now()
                job.save()
            
            self.logger.info(f"Starting execution of Instagram comment scraping job: {job.name}")
            
            # Get Instagram configuration
            config = self._get_instagram_config()
            if not config:
                error_msg = "No active Instagram Comments configuration found"
                self.logger.error(error_msg)
                job.status = 'failed'
                job.error_log = error_msg
                job.completed_at = timezone.now()
                job.save()
                return False
            
            # Get all Instagram posts from selected folders
            posts = self._get_posts_from_folders(job.selected_folders)
            job.total_posts = len(posts)
            job.save()
            
            if not posts:
                self.logger.warning(f"No posts found in selected folders for Instagram job {job.name}")
                job.status = 'completed'
                job.completed_at = timezone.now()
                job.save()
                return True
            
            # Prepare BrightData request payload
            payload = []
            for post in posts:
                post_payload = {
                    "url": post.url
                }
                payload.append(post_payload)
            
            # Make BrightData API request
            success = self._make_brightdata_request(job, config, payload)
            
            if success:
                job.status = 'completed'
                self.logger.info(f"Successfully submitted Instagram comment scraping job: {job.name}")
            else:
                job.status = 'failed'
                self.logger.error(f"Failed to submit Instagram comment scraping job: {job.name}")
            
            job.completed_at = timezone.now()
            job.save()
            return success
            
        except Exception as e:
            self.logger.error(f"Error executing Instagram comment scraping job {job_id}: {str(e)}")
            try:
                job = CommentScrapingJob.objects.get(id=job_id)
                job.status = 'failed'
                job.error_log = str(e)
                job.completed_at = timezone.now()
                job.save()
            except:
                pass
            return False
    
    def _get_posts_from_folders(self, folder_ids: List[int]) -> List[InstagramPost]:
        """
        Get all Instagram posts from the selected folders
        """
        posts = InstagramPost.objects.filter(folder_id__in=folder_ids).exclude(url__isnull=True).exclude(url__exact='')
        self.logger.info(f"Found {posts.count()} Instagram posts in selected folders")
        return list(posts)
    
    def _make_brightdata_request(self, job: CommentScrapingJob, config: BrightdataConfig, payload: List[Dict]) -> bool:
        """
        Make the BrightData API request for Instagram comment scraping
        """
        try:
            url = "https://api.brightdata.com/datasets/v3/trigger"
            headers = {
                "Authorization": f"Bearer {config.api_token}",
                "Content-Type": "application/json",
            }
            params = {
                "dataset_id": config.dataset_id,
                "endpoint": "/webhook",
                "notify": "/notify",
                "format": "json",
                "uncompressed_webhook": "true",
                "include_errors": "true",
            }
            
            self.logger.info(f"Submitting {len(payload)} Instagram posts for comment scraping")
            
            response = requests.post(url, headers=headers, params=params, json=payload, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                job.brightdata_job_id = response_data.get('job_id')
                job.brightdata_response = response_data
                job.save()
                
                self.logger.info(f"BrightData request successful. Job ID: {job.brightdata_job_id}")
                return True
            else:
                error_msg = f"BrightData API error: {response.status_code} - {response.text}"
                self.logger.error(error_msg)
                job.error_log = error_msg
                job.save()
                return False
                
        except requests.exceptions.RequestException as e:
            error_msg = f"Network error making BrightData request: {str(e)}"
            self.logger.error(error_msg)
            job.error_log = error_msg
            job.save()
            return False
        except Exception as e:
            error_msg = f"Unexpected error making BrightData request: {str(e)}"
            self.logger.error(error_msg)
            job.error_log = error_msg
            job.save()
            return False

    def scrape_comments_from_urls(self, post_urls: List[str], result_folder_name: str = None, 
                                project_id: int = None) -> Dict:
        """
        Scrape comments from a list of Instagram post URLs
        """
        try:
            # Get Instagram Comments configuration
            config = self._get_instagram_config()
            if not config:
                return {
                    'success': False,
                    'error': "No active Instagram Comments configuration found"
                }
            
            # Create result folder if specified
            result_folder = None
            if result_folder_name:
                result_folder = Folder.objects.create(
                    name=result_folder_name,
                    description=f"Instagram comments scraped from {len(post_urls)} posts",
                    category='comments',
                    project_id=project_id
                )
                self.logger.info(f"Created result folder: {result_folder_name} (ID: {result_folder.id})")
            
            # Prepare BrightData request payload (Instagram only needs URLs)
            payload = []
            for url in post_urls:
                payload.append({"url": url})
            
            # Make BrightData API request
            success, response_data = self._make_direct_brightdata_request(config, payload)
            
            if success:
                self.logger.info(f"Successfully submitted Instagram comment scraping for {len(post_urls)} URLs")
                return {
                    'success': True,
                    'urls_count': len(post_urls),
                    'result_folder': result_folder.name if result_folder else None,
                    'brightdata_response': response_data
                }
            else:
                return {
                    'success': False,
                    'error': f"Failed to submit to BrightData: {response_data}"
                }
                
        except Exception as e:
            self.logger.error(f"Error scraping Instagram comments: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_instagram_config(self) -> Optional[BrightdataConfig]:
        """
        Get the active Instagram Comments configuration
        """
        try:
            return BrightdataConfig.objects.get(platform='instagram_comments', is_active=True)
        except BrightdataConfig.DoesNotExist:
            return None
    
    def _make_direct_brightdata_request(self, config: BrightdataConfig, payload: List[Dict]) -> Tuple[bool, Dict]:
        """
        Make a direct BrightData API request (without job tracking)
        """
        try:
            url = "https://api.brightdata.com/datasets/v3/trigger"
            headers = {
                "Authorization": f"Bearer {config.api_token}",
                "Content-Type": "application/json",
            }
            params = {
                "dataset_id": config.dataset_id,
                "include_errors": "true",
            }
            
            self.logger.info(f"Submitting {len(payload)} Instagram URLs for comment scraping")
            
            response = requests.post(url, headers=headers, params=params, json=payload, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                self.logger.info(f"BrightData request successful")
                return True, response_data
            else:
                error_msg = f"BrightData API error: {response.status_code} - {response.text}"
                self.logger.error(error_msg)
                return False, {"error": error_msg}
                
        except requests.exceptions.RequestException as e:
            error_msg = f"Network error making BrightData request: {str(e)}"
            self.logger.error(error_msg)
            return False, {"error": error_msg}
        except Exception as e:
            error_msg = f"Unexpected error making BrightData request: {str(e)}"
            self.logger.error(error_msg)
            return False, {"error": error_msg}
    
    def process_comment_webhook_data(self, webhook_data: List[Dict], job_id: int = None) -> Dict:
        """
        Process webhook data from BrightData and save Instagram comments to database
        """
        result = {
            'success': True,
            'comments_processed': 0,
            'comments_created': 0,
            'comments_updated': 0,
            'errors': []
        }
        
        try:
            # Get the result folder from the job if available
            result_folder = None
            if job_id:
                try:
                    job = CommentScrapingJob.objects.get(id=job_id)
                    result_folder = job.result_folder
                except CommentScrapingJob.DoesNotExist:
                    pass
            
            with transaction.atomic():
                for comment_data in webhook_data:
                    try:
                        self._process_single_instagram_comment(comment_data, result, result_folder, job_id)
                    except Exception as e:
                        error_msg = f"Error processing comment {comment_data.get('comment_id', 'unknown')}: {str(e)}"
                        self.logger.error(error_msg)
                        result['errors'].append(error_msg)
                        continue
            
            self.logger.info(f"Processed {result['comments_processed']} Instagram comments. "
                           f"Created: {result['comments_created']}, Updated: {result['comments_updated']}")
            
        except Exception as e:
            result['success'] = False
            error_msg = f"Error processing Instagram comment webhook data: {str(e)}"
            result['errors'].append(error_msg)
            self.logger.error(error_msg)
        
        return result
    
    def _process_single_instagram_comment(self, comment_data: Dict, result: Dict, result_folder: Folder = None, job_id: int = None):
        """
        Process a single Instagram comment from webhook data
        """
        result['comments_processed'] += 1
        
        # Extract comment data
        comment_id = comment_data.get('comment_id')
        if not comment_id:
            raise ValueError("Missing comment_id in webhook data")
        
        # Try to find related Instagram post
        post_id = comment_data.get('post_id')
        instagram_post = None
        if post_id:
            try:
                instagram_post = InstagramPost.objects.get(post_id=post_id)
            except InstagramPost.DoesNotExist:
                self.logger.debug(f"No matching Instagram post found for post_id: {post_id}")
        
        # Parse comment date
        comment_date = None
        if comment_data.get('comment_date'):
            try:
                comment_date = date_parser.parse(comment_data['comment_date'])
            except (ValueError, TypeError) as e:
                self.logger.warning(f"Could not parse comment_date '{comment_data.get('comment_date')}': {str(e)}")
        
        # Create or update Instagram comment
        comment, created = InstagramComment.objects.update_or_create(
            comment_id=comment_id,
            defaults={
                'folder': result_folder,  # Link to the result folder
                'instagram_post': instagram_post,
                'post_id': comment_data.get('post_id', ''),
                'post_url': comment_data.get('post_url', ''),
                'post_user': comment_data.get('post_user', ''),
                'comment': comment_data.get('comment', ''),
                'comment_date': comment_date,
                'comment_user': comment_data.get('comment_user', ''),
                'comment_user_url': comment_data.get('comment_user_url', ''),
                'likes_number': comment_data.get('likes_number', 0),
                'replies_number': comment_data.get('replies_number', 0),
                'replies': comment_data.get('replies'),
                'hashtag_comment': comment_data.get('hashtag_comment'),
                'tagged_users_in_comment': comment_data.get('tagged_users_in_comment'),
                'url': comment_data.get('url', ''),
            }
        )
        
        # If this comment was created as part of a scraping job, update job stats
        if job_id and created:
            try:
                job = CommentScrapingJob.objects.get(id=job_id)
                job.total_comments_scraped += 1
                job.save()
            except CommentScrapingJob.DoesNotExist:
                pass
        
        if created:
            result['comments_created'] += 1
            self.logger.debug(f"Created new Instagram comment: {comment_id}")
        else:
            result['comments_updated'] += 1
            self.logger.debug(f"Updated existing Instagram comment: {comment_id}")


def create_and_execute_instagram_comment_scraping_job(name: str, project_id: int, 
                                                    selected_folders: List[int], 
                                                    result_folder_name: str = None) -> Tuple[CommentScrapingJob, bool]:
    """
    Create and execute an Instagram comment scraping job
    """
    scraper = InstagramCommentScraper()
    job = scraper.create_comment_scraping_job(name, project_id, selected_folders, result_folder_name)
    success = scraper.execute_comment_scraping_job(job.id)
    return job, success

def scrape_instagram_comments_from_urls(post_urls: List[str], result_folder_name: str = None, 
                                      project_id: int = None) -> Tuple[Dict, bool]:
    """
    Scrape Instagram comments from URLs and return result
    """
    scraper = InstagramCommentScraper()
    result = scraper.scrape_comments_from_urls(post_urls, result_folder_name, project_id)
    return result, result['success'] 