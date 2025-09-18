"""
TikTok URL Scraping Services

This module provides services for scraping TikTok posts from URLs
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

from .models import TikTokPost, Folder
from brightdata_integration.models import BrightdataConfig

logger = logging.getLogger(__name__)

class TikTokScraper:
    """
    Service class for scraping TikTok posts using BrightData
    """
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
    
    def scrape_posts_from_urls(self, post_urls: List[str], result_folder_name: str = None, 
                              project_id: int = None, num_of_posts: int = 10,
                              start_date: str = None, end_date: str = None) -> Dict:
        """
        Scrape TikTok posts from a list of URLs
        
        Args:
            post_urls: List of TikTok post/profile URLs to scrape
            result_folder_name: Name for the result folder
            project_id: Project ID for the folder
            num_of_posts: Number of posts to scrape per URL
            start_date: Start date for scraping (YYYY-MM-DD)
            end_date: End date for scraping (YYYY-MM-DD)
            
        Returns:
            Dict with success status and results
        """
        try:
            # Get TikTok configuration
            config = self._get_tiktok_config()
            if not config:
                return {
                    'success': False,
                    'error': "No active TikTok configuration found"
                }
            
            # Create result folder if specified
            result_folder = None
            if result_folder_name:
                result_folder = Folder.objects.create(
                    name=result_folder_name,
                    description=f"TikTok posts scraped from {len(post_urls)} URLs",
                    category='posts',
                    project_id=project_id
                )
                self.logger.info(f"Created result folder: {result_folder_name} (ID: {result_folder.id})")
            
            # Prepare BrightData request payload
            payload = []
            for url in post_urls:
                # TikTok API expects uppercase "URL" field
                item = {
                    "URL": url,
                }
                
                # Add optional parameters
                if num_of_posts:
                    item['num_of_posts'] = num_of_posts
                if start_date:
                    item['start_date'] = start_date
                if end_date:
                    item['end_date'] = end_date
                    
                payload.append(item)
            
            # Make BrightData API request
            success, response_data = self._make_brightdata_request(config, payload)
            
            if success:
                self.logger.info(f"Successfully submitted TikTok scraping for {len(post_urls)} URLs")
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
            self.logger.error(f"Error scraping TikTok posts: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_tiktok_config(self) -> Optional[BrightdataConfig]:
        """
        Get the active TikTok configuration
        """
        try:
            return BrightdataConfig.objects.get(platform='tiktok_posts', is_active=True)
        except BrightdataConfig.DoesNotExist:
            return None
    
    def _make_brightdata_request(self, config: BrightdataConfig, payload: List[Dict]) -> Tuple[bool, Dict]:
        """
        Make a BrightData API request for TikTok scraping
        """
        try:
            url = "https://api.brightdata.com/datasets/v3/trigger"
            headers = {
                "Authorization": f"Bearer {config.api_token}",
                "Content-Type": "application/json",
            }
            
            # Get webhook base URL from settings
            webhook_base_url = getattr(settings, 'BRIGHTDATA_WEBHOOK_BASE_URL')
            if not webhook_base_url:
                raise ValueError("BRIGHTDATA_WEBHOOK_BASE_URL setting is not configured")
            
            params = {
                "dataset_id": config.dataset_id,
                "endpoint": f"{webhook_base_url}/api/brightdata/webhook/",
                "notify": f"{webhook_base_url}/api/brightdata/notify/",
                "format": "json",
                "uncompressed_webhook": "true",
                "include_errors": "true",
                "type": "discover_new",
                "discover_by": "url",
            }
            
            self.logger.info(f"Submitting {len(payload)} TikTok URLs for scraping")
            
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
    
    def process_webhook_data(self, webhook_data: List[Dict], folder_id: int = None) -> Dict:
        """
        Process webhook data from BrightData and save TikTok posts to database
        """
        result = {
            'success': True,
            'posts_processed': 0,
            'posts_created': 0,
            'posts_updated': 0,
            'errors': []
        }
        
        try:
            # Get the result folder if provided
            result_folder = None
            if folder_id:
                try:
                    result_folder = Folder.objects.get(id=folder_id)
                except Folder.DoesNotExist:
                    self.logger.warning(f"Folder with ID {folder_id} not found")
            
            with transaction.atomic():
                for post_data in webhook_data:
                    try:
                        self._process_single_tiktok_post(post_data, result, result_folder)
                    except Exception as e:
                        error_msg = f"Error processing post {post_data.get('post_id', 'unknown')}: {str(e)}"
                        self.logger.error(error_msg)
                        result['errors'].append(error_msg)
                        continue
            
            self.logger.info(f"Processed {result['posts_processed']} TikTok posts. "
                           f"Created: {result['posts_created']}, Updated: {result['posts_updated']}")
            
        except Exception as e:
            result['success'] = False
            error_msg = f"Error processing TikTok webhook data: {str(e)}"
            result['errors'].append(error_msg)
            self.logger.error(error_msg)
        
        return result
    
    def _process_single_tiktok_post(self, post_data: Dict, result: Dict, result_folder: Folder = None):
        """
        Process a single TikTok post from webhook data
        """
        result['posts_processed'] += 1
        
        # Extract post data
        post_id = post_data.get('post_id') or post_data.get('id')
        if not post_id:
            raise ValueError("Missing post_id in webhook data")
        
        # Parse date
        date_posted = None
        if post_data.get('date_posted') or post_data.get('create_time'):
            date_str = post_data.get('date_posted') or post_data.get('create_time')
            try:
                date_posted = date_parser.parse(date_str)
            except (ValueError, TypeError) as e:
                self.logger.warning(f"Could not parse date: {date_str}")
        
        # Create or update TikTok post
        post, created = TikTokPost.objects.update_or_create(
            post_id=post_id,
            defaults={
                'folder': result_folder,
                'url': post_data.get('url', ''),
                'user_posted': post_data.get('profile_username', ''),
                'description': post_data.get('description', ''),
                'hashtags': post_data.get('hashtags', ''),
                'likes': post_data.get('digg_count', 0),
                'num_comments': post_data.get('comment_count', 0),
                'date_posted': date_posted,
                'videos': post_data.get('video_url', ''),
                'thumbnail': post_data.get('preview_image', ''),
                'profile_image_link': post_data.get('profile_avatar', ''),
                'content_type': post_data.get('post_type', 'video'),
                'discovery_input': post_data.get('discovery_input', ''),
                'is_verified': post_data.get('is_verified', False),
                'followers': post_data.get('profile_followers', 0),
                'location': post_data.get('region', '') or post_data.get('country', ''),
                'tagged_users': post_data.get('tagged_user', ''),
            }
        )
        
        if created:
            result['posts_created'] += 1
            self.logger.debug(f"Created new TikTok post: {post_id}")
        else:
            result['posts_updated'] += 1
            self.logger.debug(f"Updated existing TikTok post: {post_id}")


def scrape_tiktok_posts_from_urls(post_urls: List[str], result_folder_name: str = None, 
                                 project_id: int = None, **kwargs) -> Tuple[Dict, bool]:
    """
    Scrape TikTok posts from URLs and return result
    """
    scraper = TikTokScraper()
    result = scraper.scrape_posts_from_urls(post_urls, result_folder_name, project_id, **kwargs)
    return result, result['success']
