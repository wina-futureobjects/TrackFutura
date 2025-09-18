"""
Facebook Comment Scraping Services

This module provides services for scraping Facebook comments from posts
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

from .models import FacebookPost, FacebookComment, CommentScrapingJob, Folder
from brightdata_integration.models import BrightdataConfig

logger = logging.getLogger(__name__)

class FacebookCommentScraper:
    """
    Service class for scraping Facebook comments using BrightData
    """
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
    
    def create_comment_scraping_job(self, name: str, project_id: int, 
                                  selected_folders: List[int], comment_limit: int = 10,
                                  get_all_replies: bool = False, result_folder_name: str = None) -> CommentScrapingJob:
        """
        Create a new comment scraping job with an optional result folder
        """
        # Create a folder for storing the comment results if folder name is provided
        result_folder = None
        if result_folder_name:
            result_folder = Folder.objects.create(
                name=result_folder_name,
                description=f"Comments scraped from job: {name}",
                category='comments',  # Specify this is a comments folder
                project_id=project_id
            )
            self.logger.info(f"Created result folder: {result_folder_name} (ID: {result_folder.id})")
        
        job = CommentScrapingJob.objects.create(
            name=name,
            project_id=project_id,
            selected_folders=selected_folders,
            comment_limit=comment_limit,
            get_all_replies=get_all_replies,
            result_folder=result_folder,
            status='pending'
        )
        
        self.logger.info(f"Created comment scraping job: {job.name} (ID: {job.id})")
        return job
    
    def execute_comment_scraping_job(self, job_id: int) -> bool:
        """
        Execute a comment scraping job
        """
        try:
            job = CommentScrapingJob.objects.get(id=job_id)
            
            with transaction.atomic():
                job.status = 'processing'
                job.started_at = timezone.now()
                job.save()
            
            self.logger.info(f"Starting execution of comment scraping job: {job.name}")
            
            # Get Facebook configuration
            config = self._get_facebook_config()
            if not config:
                error_msg = "No active Facebook configuration found"
                self.logger.error(error_msg)
                job.status = 'failed'
                job.error_log = error_msg
                job.completed_at = timezone.now()
                job.save()
                return False
            
            # Get all Facebook posts from selected folders
            posts = self._get_posts_from_folders(job.selected_folders)
            job.total_posts = len(posts)
            job.save()
            
            if not posts:
                self.logger.warning(f"No posts found in selected folders for job {job.name}")
                job.status = 'completed'
                job.completed_at = timezone.now()
                job.save()
                return True
            
            # Prepare BrightData request payload
            payload = []
            for post in posts:
                post_payload = {
                    "url": post.url,
                    "limit_records": job.comment_limit if job.comment_limit > 0 else "",
                    "get_all_replies": job.get_all_replies
                }
                payload.append(post_payload)
            
            # Make BrightData API request
            success = self._make_brightdata_request(job, config, payload)
            
            if success:
                job.status = 'completed'
                self.logger.info(f"Successfully submitted comment scraping job: {job.name}")
            else:
                job.status = 'failed'
                self.logger.error(f"Failed to submit comment scraping job: {job.name}")
            
            job.completed_at = timezone.now()
            job.save()
            return success
            
        except Exception as e:
            self.logger.error(f"Error executing comment scraping job {job_id}: {str(e)}")
            try:
                job = CommentScrapingJob.objects.get(id=job_id)
                job.status = 'failed'
                job.error_log = str(e)
                job.completed_at = timezone.now()
                job.save()
            except:
                pass
            return False
    
    def _get_facebook_config(self) -> Optional[BrightdataConfig]:
        """
        Get the active Facebook Comments configuration for comment scraping
        """
        try:
            return BrightdataConfig.objects.get(platform='facebook_comments', is_active=True)
        except BrightdataConfig.DoesNotExist:
            return None
    
    def _get_posts_from_folders(self, folder_ids: List[int]) -> List[FacebookPost]:
        """
        Get all Facebook posts from the selected folders
        """
        posts = FacebookPost.objects.filter(folder_id__in=folder_ids).exclude(url__isnull=True).exclude(url__exact='')
        self.logger.info(f"Found {posts.count()} posts in selected folders")
        return list(posts)
    
    def _make_brightdata_request(self, job: CommentScrapingJob, config: BrightdataConfig, payload: List[Dict]) -> bool:
        """
        Make the BrightData API request for comment scraping
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
            
            self.logger.info(f"Submitting {len(payload)} posts for comment scraping")
            
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
    
    def process_comment_webhook_data(self, webhook_data: List[Dict]) -> Dict:
        """
        Process webhook data from BrightData and save comments to database
        """
        result = {
            'success': True,
            'comments_processed': 0,
            'comments_created': 0,
            'comments_updated': 0,
            'errors': []
        }
        
        try:
            with transaction.atomic():
                for comment_data in webhook_data:
                    try:
                        self._process_single_comment(comment_data, result, job_id=None)
                    except Exception as e:
                        error_msg = f"Error processing comment {comment_data.get('comment_id', 'unknown')}: {str(e)}"
                        self.logger.error(error_msg)
                        result['errors'].append(error_msg)
                        continue
            
            self.logger.info(f"Processed {result['comments_processed']} comments. "
                           f"Created: {result['comments_created']}, Updated: {result['comments_updated']}")
            
        except Exception as e:
            result['success'] = False
            error_msg = f"Error processing comment webhook data: {str(e)}"
            result['errors'].append(error_msg)
            self.logger.error(error_msg)
        
        return result
    
    def _process_single_comment(self, comment_data: Dict, result: Dict, job_id: int = None):
        """
        Process a single comment from webhook data
        """
        result['comments_processed'] += 1
        
        # Extract comment data
        comment_id = comment_data.get('comment_id')
        if not comment_id:
            raise ValueError("Missing comment_id in webhook data")
        
        # Try to find related Facebook post
        post_id = comment_data.get('post_id')
        facebook_post = None
        if post_id:
            try:
                facebook_post = FacebookPost.objects.get(post_id=post_id)
            except FacebookPost.DoesNotExist:
                self.logger.debug(f"No matching Facebook post found for post_id: {post_id}")
        
        # Get the result folder from the job if available
        result_folder = None
        if job_id:
            try:
                job = CommentScrapingJob.objects.get(id=job_id)
                result_folder = job.result_folder
            except CommentScrapingJob.DoesNotExist:
                pass
        
        # Parse date
        date_created = None
        if comment_data.get('date_created'):
            try:
                date_created = date_parser.parse(comment_data['date_created'])
            except (ValueError, TypeError) as e:
                self.logger.warning(f"Could not parse date_created: {comment_data.get('date_created')}")
        
        # Create or update comment
        comment, created = FacebookComment.objects.update_or_create(
            comment_id=comment_id,
            defaults={
                'folder': result_folder,  # Link to the result folder
                'facebook_post': facebook_post,
                'url': comment_data.get('url', ''),
                'post_id': comment_data.get('post_id', ''),
                'post_url': comment_data.get('post_url', ''),
                'user_name': comment_data.get('user_name', ''),
                'user_id': comment_data.get('user_id', ''),
                'user_url': comment_data.get('user_url', ''),
                'commentator_profile': comment_data.get('commentator_profile', ''),
                'comment_text': comment_data.get('comment_text', ''),
                'date_created': date_created,
                'comment_link': comment_data.get('comment_link', ''),
                'num_likes': comment_data.get('num_likes', 0),
                'num_replies': comment_data.get('num_replies', 0),
                'attached_files': comment_data.get('attached_files'),
                'video_length': comment_data.get('video_length'),
                'source_type': comment_data.get('source_type', ''),
                'subtype': comment_data.get('subtype', ''),
                'type': comment_data.get('type', ''),
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
            self.logger.debug(f"Created new comment: {comment_id}")
        else:
            result['comments_updated'] += 1
            self.logger.debug(f"Updated existing comment: {comment_id}")

    def scrape_comments_from_urls(self, post_urls: List[str], comment_limit: int = 10,
                                get_all_replies: bool = False, result_folder_name: str = None, 
                                project_id: int = None) -> Dict:
        """
        Scrape comments from a list of Facebook post URLs (alternative to folder-based scraping)
        """
        try:
            # Get Facebook Comments configuration
            config = self._get_facebook_config()
            if not config:
                return {
                    'success': False,
                    'error': "No active Facebook Comments configuration found"
                }
            
            # Create result folder if specified
            result_folder = None
            if result_folder_name:
                result_folder = Folder.objects.create(
                    name=result_folder_name,
                    description=f"Facebook comments scraped from {len(post_urls)} posts",
                    category='comments',
                    project_id=project_id
                )
                self.logger.info(f"Created result folder: {result_folder_name} (ID: {result_folder.id})")
            
            # Prepare BrightData request payload
            payload = []
            for url in post_urls:
                post_payload = {
                    "url": url,
                    "limit_records": comment_limit if comment_limit > 0 else "",
                    "get_all_replies": get_all_replies
                }
                payload.append(post_payload)
            
            # Make BrightData API request
            success, response_data = self._make_direct_brightdata_request(config, payload)
            
            if success:
                self.logger.info(f"Successfully submitted Facebook comment scraping for {len(post_urls)} URLs")
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
            self.logger.error(f"Error scraping Facebook comments from URLs: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
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
            
            self.logger.info(f"Submitting {len(payload)} Facebook URLs for comment scraping")
            
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


def create_and_execute_comment_scraping_job(name: str, project_id: int, 
                                           selected_folders: List[int], 
                                           comment_limit: int = 10,
                                           get_all_replies: bool = False,
                                           result_folder_name: str = None) -> Tuple[CommentScrapingJob, bool]:
    """
    Create and execute a Facebook comment scraping job
    """
    scraper = FacebookCommentScraper()
    job = scraper.create_comment_scraping_job(name, project_id, selected_folders, comment_limit, get_all_replies, result_folder_name)
    success = scraper.execute_comment_scraping_job(job.id)
    return job, success

def scrape_facebook_comments_from_urls(post_urls: List[str], comment_limit: int = 10,
                                     get_all_replies: bool = False, result_folder_name: str = None, 
                                     project_id: int = None) -> Tuple[Dict, bool]:
    """
    Scrape Facebook comments from URLs and return result (convenience function for cross-platform endpoint)
    """
    scraper = FacebookCommentScraper()
    result = scraper.scrape_comments_from_urls(post_urls, comment_limit, get_all_replies, result_folder_name, project_id)
    return result, result['success'] 