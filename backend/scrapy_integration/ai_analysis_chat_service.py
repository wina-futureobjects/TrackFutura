import os
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from openai import OpenAI
import httpx
from django.conf import settings
from django.db.models import Q, Count, Avg, Sum
from datetime import datetime, timedelta
from collections import Counter, defaultdict
import re

from .models import ScrapyJob, ScrapyResult, ScrapyConfig
from users.models import Project

# Import platform-specific models
try:
    from instagram_data.models import InstagramPost, InstagramComment
except ImportError:
    InstagramPost = None
    InstagramComment = None

try:
    from facebook_data.models import FacebookPost, FacebookComment
except ImportError:
    FacebookPost = None
    FacebookComment = None

try:
    from linkedin_data.models import LinkedInPost
except ImportError:
    LinkedInPost = None

try:
    from tiktok_data.models import TikTokPost
except ImportError:
    TikTokPost = None

logger = logging.getLogger(__name__)

# Configure OpenAI - Use settings API key
OPENAI_API_KEY = getattr(settings, 'OPENAI_API_KEY', None)

# Only initialize OpenAI client if API key is available
if OPENAI_API_KEY and OPENAI_API_KEY != "your-openai-api-key-here":
    try:
        # Create custom HTTP client to avoid proxy issues
        http_client = httpx.Client(
            timeout=60.0,
            follow_redirects=True
        )

        # Initialize with custom http client
        client = OpenAI(
            api_key=OPENAI_API_KEY,
            http_client=http_client
        )
        logger.info("OpenAI client initialized successfully with custom HTTP client")
    except Exception as e:
        logger.error(f"OpenAI client initialization failed: {e}")
        client = None
else:
    client = None
    logger.warning("OpenAI API key not configured. AI features will be disabled.")

class AIAnalysisChatService:
    """
    Enhanced AI Analysis Chat Service with real-time access to all scraped data
    Provides intelligent responses about scraped social media data with full context
    """
    
    def __init__(self):
        self.client = client
        self.max_context_posts = 100  # Maximum number of posts to include in context
        self.max_response_tokens = 4000
        
    def get_comprehensive_project_data(self, project_id: int, platforms: Optional[List[str]] = None,
                                       limit: Optional[int] = None) -> Dict[str, Any]:
        """Get comprehensive data from all platform-specific models AND ScrapyResult models"""

        all_data = {'platforms': {}, 'all_posts': [], 'statistics': {}}

        # Get data from platform-specific models
        platform_models = {
            'instagram': (InstagramPost, InstagramComment),
            'facebook': (FacebookPost, FacebookComment),
            'linkedin': (LinkedInPost, None),
            'tiktok': (TikTokPost, None)
        }

        for platform_name, (PostModel, CommentModel) in platform_models.items():
            if platforms and platform_name not in platforms:
                continue

            if PostModel is None:
                continue

            try:
                # Get posts for this project via folder relationship
                # First get folders for this project, then posts in those folders
                from users.models import Folder
                folders = Folder.objects.filter(project_id=project_id)
                folder_ids = [folder.id for folder in folders]

                if not folder_ids:
                    continue  # No folders for this project, skip this platform

                posts_query = PostModel.objects.filter(folder_id__in=folder_ids)
                if limit:
                    posts_query = posts_query[:limit // len(platform_models)]

                posts = list(posts_query)
                standardized_posts = []

                for post in posts:
                    if platform_name == 'instagram':
                        standardized_post = self._standardize_instagram_post(post)
                    elif platform_name == 'facebook':
                        standardized_post = self._standardize_facebook_post(post)
                    elif platform_name == 'linkedin':
                        standardized_post = self._standardize_linkedin_post(post)
                    elif platform_name == 'tiktok':
                        standardized_post = self._standardize_tiktok_post(post)
                    else:
                        continue

                    if standardized_post:
                        standardized_posts.append(standardized_post)
                        all_data['all_posts'].append(standardized_post)

                if standardized_posts:
                    all_data['platforms'][platform_name] = {
                        'posts': standardized_posts,
                        'total_posts': len(standardized_posts),
                        'source': 'platform_models'
                    }

            except Exception as e:
                logger.error(f"Error getting {platform_name} data: {str(e)}")

        # Also get data from ScrapyResult models (for additional data)
        scrapy_data = self.get_project_scraped_data(project_id, platforms, limit)

        # Merge ScrapyResult data
        for platform_name, platform_data in scrapy_data.get('platforms', {}).items():
            if platform_name in all_data['platforms']:
                # Append scrapy posts to existing platform data
                all_data['platforms'][platform_name]['posts'].extend(platform_data['posts'])
                all_data['platforms'][platform_name]['total_posts'] += platform_data['total_posts']
            else:
                # Add new platform data from scrapy
                all_data['platforms'][platform_name] = platform_data
                all_data['platforms'][platform_name]['source'] = 'scrapy_models'

        # Add scrapy posts to all_posts
        all_data['all_posts'].extend(scrapy_data.get('all_posts', []))

        # Calculate comprehensive statistics
        total_posts = len(all_data['all_posts'])
        total_likes = sum(post.get('likes', 0) for post in all_data['all_posts'])
        total_comments = sum(post.get('comments_count', 0) for post in all_data['all_posts'])
        total_shares = sum(post.get('shares', 0) for post in all_data['all_posts'])

        all_data['statistics'] = {
            'total_posts': total_posts,
            'total_likes': total_likes,
            'total_comments': total_comments,
            'total_shares': total_shares,
            'total_engagement': total_likes + total_comments + total_shares,
            'platforms_count': len(all_data['platforms']),
            'avg_engagement_per_post': (total_likes + total_comments + total_shares) / max(total_posts, 1),
            'platform_breakdown': {
                platform: {
                    'posts': len(data['posts']),
                    'avg_likes': sum(p.get('likes', 0) for p in data['posts']) / max(len(data['posts']), 1),
                    'avg_comments': sum(p.get('comments_count', 0) for p in data['posts']) / max(len(data['posts']), 1),
                    'avg_shares': sum(p.get('shares', 0) for p in data['posts']) / max(len(data['posts']), 1)
                } for platform, data in all_data['platforms'].items()
            },
            'top_posts': sorted(
                all_data['all_posts'],
                key=lambda x: x.get('total_engagement', 0),
                reverse=True
            )[:10]
        }

        return all_data

    def get_project_scraped_data(self, project_id: int, platforms: Optional[List[str]] = None,
                                 limit: Optional[int] = None) -> Dict[str, Any]:
        """Get comprehensive scraped data for a project from ScrapyResult models (simplified version)"""
        
        try:
            # Get data from ScrapyResult models
            query = Q(job__project_id=project_id, success=True)
            if platforms:
                query &= Q(job__config__platform__in=platforms)
            
            results = ScrapyResult.objects.filter(query).select_related('job', 'job__config')
            if limit:
                results = results[:limit]
            
            posts_with_metrics = []
            platform_data = {}
            
            for result in results:
                try:
                    platform = result.job.config.platform
                    job_name = result.job.name
                    
                    # Process scraped data
                    scraped_data = result.scraped_data
                    if isinstance(scraped_data, dict):
                        posts = [scraped_data]
                    elif isinstance(scraped_data, list):
                        posts = scraped_data
                    else:
                        continue
                    
                    for post in posts:
                        if isinstance(post, dict):
                            # Enhanced data extraction with comments processing
                            comments = post.get('comments', [])
                            processed_comments = []
                            
                            # Process comments for sentiment analysis
                            if isinstance(comments, list):
                                for comment in comments[:20]:  # Limit to 20 comments per post for performance
                                    if isinstance(comment, dict):
                                        comment_text = comment.get('text', '')
                                        processed_comments.append({
                                            'username': comment.get('username', ''),
                                            'text': comment_text,
                                            'likes': self._safe_int(comment.get('likes', 0))
                                        })
                                    elif isinstance(comment, str):
                                        processed_comments.append({
                                            'username': '',
                                            'text': comment,
                                            'likes': 0
                                        })
                            
                            standardized_post = {
                                'platform': platform,
                                'job_name': f"Scrapy-{job_name}",
                                'text_content': post.get('caption', post.get('text', post.get('description', ''))),
                                'likes': self._safe_int(post.get('likes', post.get('num_likes', 0))),
                                'comments_count': self._safe_int(post.get('comments_count', post.get('num_comments', 0))),
                                'shares': self._safe_int(post.get('shares', post.get('num_shares', 0))),
                                'username': post.get('username', post.get('user', '')),
                                'timestamp': post.get('timestamp', post.get('date', '')),
                                'hashtags': post.get('hashtags', []),
                                'post_url': post.get('url', result.source_url),
                                'comments': processed_comments,
                                'comment_sentiment_sample': [c['text'] for c in processed_comments[:5]],  # Sample for AI analysis
                                'raw_data': post
                            }
                            standardized_post['total_engagement'] = (
                                standardized_post['likes'] + 
                                standardized_post['comments_count'] + 
                                standardized_post['shares']
                            )
                            
                            posts_with_metrics.append(standardized_post)
                            
                            # Track platform data
                            if platform not in platform_data:
                                platform_data[platform] = {
                                    'posts': 0, 'likes': 0, 'comments': 0, 'shares': 0, 'jobs': []
                                }
                            platform_data[platform]['posts'] += 1
                            platform_data[platform]['likes'] += standardized_post['likes']
                            platform_data[platform]['comments'] += standardized_post['comments_count']  
                            platform_data[platform]['shares'] += standardized_post['shares']
                            if job_name not in platform_data[platform]['jobs']:
                                platform_data[platform]['jobs'].append(job_name)
                                
                except Exception as e:
                    logger.warning(f"Error processing result from {result.job.name}: {str(e)}")
                    continue
            
            # Calculate simple statistics
            total_posts = len(posts_with_metrics)
            total_likes = sum(post['likes'] for post in posts_with_metrics)
            total_comments = sum(post['comments_count'] for post in posts_with_metrics)
            total_shares = sum(post['shares'] for post in posts_with_metrics)
            total_engagement = total_likes + total_comments + total_shares
            
            # Build final data structure
            data_summary = {
                'total_results': total_posts,
                'platforms': {},
                'jobs': {},
                'all_posts': posts_with_metrics,
                'statistics': {
                    'total_posts': total_posts,
                    'total_likes': total_likes,
                    'total_comments': total_comments,
                    'total_shares': total_shares,
                    'total_engagement': total_engagement,
                    'platform_breakdown': {},
                    'engagement_metrics': {
                        'avg_likes': total_likes / max(total_posts, 1),
                        'avg_comments': total_comments / max(total_posts, 1), 
                        'avg_shares': total_shares / max(total_posts, 1),
                        'avg_total_engagement': total_engagement / max(total_posts, 1)
                    },
                    'top_performing_posts': [
                        {
                            'text_preview': post['text_content'][:100] + '...' if len(post.get('text_content', '')) > 100 else post.get('text_content', ''),
                            'platform': post['platform'],
                            'username': post.get('username', ''),
                            'likes': post['likes'],
                            'comments': post['comments_count'],
                            'shares': post['shares'],
                            'total_engagement': post['total_engagement'],
                            'post_url': post.get('post_url', '')
                        } for post in sorted(posts_with_metrics, key=lambda x: x['total_engagement'], reverse=True)[:10]
                    ]
                }
            }
            
            # Add platform breakdown
            for platform, stats in platform_data.items():
                platform_posts = [p for p in posts_with_metrics if p['platform'] == platform]
                data_summary['platforms'][platform] = {
                    'posts': platform_posts,
                    'total_posts': stats['posts'],
                    'metrics': {
                        'likes': stats['likes'],
                        'comments': stats['comments'],
                        'shares': stats['shares']
                    },
                    'job_count': len(stats['jobs'])
                }
                data_summary['statistics']['platform_breakdown'][platform] = {
                    'posts': stats['posts'],
                    'likes': stats['likes'],
                    'comments': stats['comments'],
                    'shares': stats['shares'],
                    'avg_engagement': (stats['likes'] + stats['comments'] + stats['shares']) / max(stats['posts'], 1)
                }
            
            return data_summary
            
        except Exception as e:
            logger.error(f"Error getting project scraped data: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'total_results': 0,
                'platforms': {},
                'jobs': {},
                'all_posts': [],
                'statistics': {},
                'error': str(e)
            }
            
    def _safe_int(self, value) -> int:
        """Safely convert value to integer"""
        if isinstance(value, (int, float)):
            return int(value)
        elif isinstance(value, str):
            # Handle strings like "1.2K", "5M" etc.
            try:
                if 'k' in value.lower():
                    return int(float(value.lower().replace('k', '')) * 1000)
                elif 'm' in value.lower():
                    return int(float(value.lower().replace('m', '')) * 1000000)
                else:
                    return int(float(value))
            except:
                return 0
        return 0
    
    def _standardize_post_data(self, post: Dict, platform: str, job_name: str, source_url: str) -> Optional[Dict]:
        """Standardize post data across different platforms"""
        
        try:
            # Extract text content
            text_content = ""
            for field in ['caption', 'text', 'content', 'description', 'post_text', 'body']:
                if field in post and post[field]:
                    text_content = str(post[field]).strip()
                    break
            
            # Extract engagement metrics with multiple field mappings
            likes = self._extract_numeric_value(post, ['likes', 'num_likes', 'like_count', 'reactions'])
            comments_count = self._extract_numeric_value(post, ['comments_count', 'num_comments', 'comment_count'])
            shares = self._extract_numeric_value(post, ['shares', 'num_shares', 'share_count', 'retweets'])
            views = self._extract_numeric_value(post, ['views', 'view_count', 'play_count'])
            
            # Extract user information
            username = post.get('username', post.get('user', post.get('author', '')))
            user_full_name = post.get('user_full_name', post.get('display_name', post.get('name', '')))
            
            # Extract media information
            media_type = post.get('media_type', post.get('type', 'post'))
            images = post.get('images', post.get('image_urls', []))
            videos = post.get('videos', post.get('video_urls', []))
            
            # Extract timestamp
            timestamp = post.get('timestamp', post.get('created_at', post.get('date', '')))
            
            # Extract hashtags and mentions
            hashtags = post.get('hashtags', [])
            if isinstance(hashtags, str):
                hashtags = re.findall(r'#\w+', hashtags)
            mentions = post.get('mentions', [])
            if isinstance(mentions, str):
                mentions = re.findall(r'@\w+', mentions)
            
            # Extract comments
            comments = post.get('comments', [])
            if isinstance(comments, list):
                processed_comments = []
                for comment in comments[:10]:  # Limit to first 10 comments
                    if isinstance(comment, dict):
                        processed_comments.append({
                            'text': comment.get('text', ''),
                            'username': comment.get('username', comment.get('user', '')),
                            'likes': self._extract_numeric_value(comment, ['likes', 'like_count'])
                        })
                    elif isinstance(comment, str):
                        processed_comments.append({'text': comment, 'username': '', 'likes': 0})
                comments = processed_comments
            
            return {
                'platform': platform,
                'job_name': job_name,
                'source_url': source_url,
                'text_content': text_content,
                'likes': likes,
                'comments_count': comments_count,
                'shares': shares,
                'views': views,
                'total_engagement': likes + comments_count + shares,
                'username': username,
                'user_full_name': user_full_name,
                'media_type': media_type,
                'images': images if isinstance(images, list) else [],
                'videos': videos if isinstance(videos, list) else [],
                'timestamp': timestamp,
                'hashtags': hashtags if isinstance(hashtags, list) else [],
                'mentions': mentions if isinstance(mentions, list) else [],
                'comments': comments,
                'post_url': post.get('post_url', post.get('url', source_url)),
                'raw_data': post  # Keep original data for reference
            }
            
        except Exception as e:
            logger.error(f"Error standardizing post data: {str(e)}")
            return None
    
    def _extract_numeric_value(self, data: Dict, fields: List[str]) -> int:
        """Extract numeric value from various possible fields"""
        for field in fields:
            if field in data:
                value = data[field]
                if isinstance(value, (int, float)):
                    return int(value)
                elif isinstance(value, str):
                    # Extract numbers from string (handle "1.2K", "5M" etc.)
                    numbers = re.findall(r'[\d,]+(?:\.\d+)?', value.replace(',', ''))
                    if numbers:
                        try:
                            num = float(numbers[0])
                            if 'k' in value.lower():
                                return int(num * 1000)
                            elif 'm' in value.lower():
                                return int(num * 1000000)
                            return int(num)
                        except:
                            pass
        return 0
    
    def _standardize_instagram_post(self, post) -> Optional[Dict]:
        """Standardize Instagram post data"""
        try:
            return {
                'platform': 'instagram',
                'job_name': 'Instagram Data',
                'source_url': post.url,
                'text_content': post.description or '',
                'likes': post.likes or 0,
                'comments_count': post.num_comments or 0,
                'shares': 0,  # Instagram doesn't have shares
                'views': post.views or post.video_view_count or 0,
                'total_engagement': (post.likes or 0) + (post.num_comments or 0),
                'username': post.user_posted,
                'user_full_name': post.user_posted,
                'media_type': 'video' if post.videos else 'image',
                'images': post.photos or [],
                'videos': post.videos or [],
                'timestamp': post.date_posted.isoformat() if post.date_posted else '',
                'hashtags': post.hashtags or [],
                'mentions': [],
                'comments': [],
                'post_url': post.url,
                'raw_data': {
                    'id': post.id,
                    'post_id': post.post_id,
                    'folder': post.folder.name if post.folder else None
                }
            }
        except Exception as e:
            logger.error(f"Error standardizing Instagram post: {str(e)}")
            return None
    
    def _standardize_facebook_post(self, post) -> Optional[Dict]:
        """Standardize Facebook post data"""
        try:
            return {
                'platform': 'facebook',
                'job_name': 'Facebook Data',
                'source_url': getattr(post, 'url', ''),
                'text_content': getattr(post, 'content', '') or getattr(post, 'description', '') or '',
                'likes': getattr(post, 'likes', 0) or 0,
                'comments_count': getattr(post, 'comments_count', 0) or getattr(post, 'num_comments', 0) or 0,
                'shares': getattr(post, 'shares', 0) or 0,
                'views': getattr(post, 'views', 0) or 0,
                'total_engagement': (getattr(post, 'likes', 0) or 0) + (getattr(post, 'comments_count', 0) or 0) + (getattr(post, 'shares', 0) or 0),
                'username': getattr(post, 'user_posted', '') or getattr(post, 'author', ''),
                'user_full_name': getattr(post, 'user_posted', '') or getattr(post, 'author', ''),
                'media_type': 'post',
                'images': getattr(post, 'images', []) or [],
                'videos': getattr(post, 'videos', []) or [],
                'timestamp': post.date_posted.isoformat() if hasattr(post, 'date_posted') and post.date_posted else '',
                'hashtags': [],
                'mentions': [],
                'comments': [],
                'post_url': getattr(post, 'url', ''),
                'raw_data': {
                    'id': post.id,
                    'folder': post.folder.name if hasattr(post, 'folder') and post.folder else None
                }
            }
        except Exception as e:
            logger.error(f"Error standardizing Facebook post: {str(e)}")
            return None
    
    def _standardize_linkedin_post(self, post) -> Optional[Dict]:
        """Standardize LinkedIn post data"""
        try:
            return {
                'platform': 'linkedin',
                'job_name': 'LinkedIn Data',
                'source_url': getattr(post, 'url', ''),
                'text_content': getattr(post, 'content', '') or getattr(post, 'description', '') or '',
                'likes': getattr(post, 'likes', 0) or 0,
                'comments_count': getattr(post, 'comments_count', 0) or getattr(post, 'num_comments', 0) or 0,
                'shares': getattr(post, 'reposts', 0) or getattr(post, 'shares', 0) or 0,
                'views': getattr(post, 'views', 0) or 0,
                'total_engagement': (getattr(post, 'likes', 0) or 0) + (getattr(post, 'comments_count', 0) or 0) + (getattr(post, 'reposts', 0) or 0),
                'username': getattr(post, 'user_posted', '') or getattr(post, 'author', ''),
                'user_full_name': getattr(post, 'user_posted', '') or getattr(post, 'author', ''),
                'media_type': 'post',
                'images': [],
                'videos': [],
                'timestamp': post.date_posted.isoformat() if hasattr(post, 'date_posted') and post.date_posted else '',
                'hashtags': [],
                'mentions': [],
                'comments': [],
                'post_url': getattr(post, 'url', ''),
                'raw_data': {
                    'id': post.id,
                    'folder': post.folder.name if hasattr(post, 'folder') and post.folder else None
                }
            }
        except Exception as e:
            logger.error(f"Error standardizing LinkedIn post: {str(e)}")
            return None

    def _standardize_tiktok_post(self, post) -> Optional[Dict]:
        """Standardize TikTok post data"""
        try:
            return {
                'platform': 'tiktok',
                'job_name': 'TikTok Data',
                'source_url': getattr(post, 'url', ''),
                'text_content': getattr(post, 'description', '') or getattr(post, 'content', '') or '',
                'likes': getattr(post, 'likes', 0) or 0,
                'comments_count': getattr(post, 'comments_count', 0) or getattr(post, 'num_comments', 0) or 0,
                'shares': getattr(post, 'shares', 0) or 0,
                'views': getattr(post, 'views', 0) or getattr(post, 'play_count', 0) or 0,
                'total_engagement': (getattr(post, 'likes', 0) or 0) + (getattr(post, 'comments_count', 0) or 0) + (getattr(post, 'shares', 0) or 0),
                'username': getattr(post, 'user_posted', '') or getattr(post, 'author', ''),
                'user_full_name': getattr(post, 'user_posted', '') or getattr(post, 'author', ''),
                'media_type': 'video',
                'images': [],
                'videos': [getattr(post, 'video_url', '')] if getattr(post, 'video_url', '') else [],
                'timestamp': post.date_posted.isoformat() if hasattr(post, 'date_posted') and post.date_posted else '',
                'hashtags': getattr(post, 'hashtags', []) or [],
                'mentions': [],
                'comments': [],
                'post_url': getattr(post, 'url', ''),
                'raw_data': {
                    'id': post.id,
                    'folder': post.folder.name if hasattr(post, 'folder') and post.folder else None
                }
            }
        except Exception as e:
            logger.error(f"Error standardizing TikTok post: {str(e)}")
            return None
    
    def _calculate_comprehensive_stats(self, posts: List[Dict], platform_stats: Dict) -> Dict:
        """Calculate comprehensive statistics from posts data"""
        
        if not posts:
            return {}
        
        total_posts = len(posts)
        total_likes = sum(post.get('likes', 0) for post in posts)
        total_comments = sum(post.get('comments_count', 0) for post in posts)
        total_shares = sum(post.get('shares', 0) for post in posts)
        total_engagement = total_likes + total_comments + total_shares
        
        # Find date range
        timestamps = [post.get('timestamp', '') for post in posts if post.get('timestamp')]
        date_range = {'earliest': None, 'latest': None}
        if timestamps:
            try:
                dates = [datetime.fromisoformat(ts.replace('Z', '+00:00')) if 'T' in ts else 
                        datetime.strptime(ts, '%Y-%m-%d') for ts in timestamps if ts]
                if dates:
                    date_range = {
                        'earliest': min(dates).isoformat(),
                        'latest': max(dates).isoformat()
                    }
            except:
                pass
        
        # Top performing posts
        top_posts = sorted(posts, key=lambda x: x.get('total_engagement', 0), reverse=True)[:10]
        
        # Platform breakdown
        platform_breakdown = {}
        for platform, stats in platform_stats.items():
            platform_breakdown[platform] = {
                'posts': stats['posts'],
                'likes': stats['likes'],
                'comments': stats['comments'],
                'shares': stats['shares'],
                'job_count': len(stats['jobs']),
                'avg_engagement': (stats['likes'] + stats['comments'] + stats['shares']) / max(stats['posts'], 1)
            }
        
        # Engagement metrics
        engagement_metrics = {
            'avg_likes': total_likes / total_posts,
            'avg_comments': total_comments / total_posts,
            'avg_shares': total_shares / total_posts,
            'avg_total_engagement': total_engagement / total_posts,
            'engagement_rate': (total_engagement / total_posts) / 100 if total_posts > 0 else 0
        }
        
        # Content type breakdown
        content_types = Counter(post.get('media_type', 'post') for post in posts)
        
        # User/source breakdown
        top_sources = Counter(post.get('username', 'unknown') for post in posts).most_common(10)
        
        return {
            'total_posts': total_posts,
            'total_likes': total_likes,
            'total_comments': total_comments,
            'total_shares': total_shares,
            'total_engagement': total_engagement,
            'platform_breakdown': platform_breakdown,
            'date_range': date_range,
            'top_performing_posts': [
                {
                    'text_preview': post['text_content'][:100] + '...' if len(post['text_content']) > 100 else post['text_content'],
                    'platform': post['platform'],
                    'username': post['username'],
                    'likes': post['likes'],
                    'comments': post['comments_count'],
                    'shares': post['shares'],
                    'total_engagement': post['total_engagement'],
                    'post_url': post['post_url']
                } for post in top_posts
            ],
            'engagement_metrics': engagement_metrics,
            'content_type_breakdown': dict(content_types),
            'top_sources': dict(top_sources)
        }
    
    def generate_context_summary(self, data_summary: Dict[str, Any]) -> str:
        """Generate a concise context summary for OpenAI"""
        
        stats = data_summary.get('statistics', {})
        platforms = list(data_summary.get('platforms', {}).keys())
        jobs = list(data_summary.get('jobs', {}).keys())
        
        context = f"""
SCRAPED DATA CONTEXT:
- Total Posts: {stats.get('total_posts', 0):,}
- Platforms: {', '.join(platforms)} ({len(platforms)} total)
- Jobs/Campaigns: {len(jobs)} active scraping jobs
- Total Engagement: {stats.get('total_engagement', 0):,} (Likes: {stats.get('total_likes', 0):,}, Comments: {stats.get('total_comments', 0):,}, Shares: {stats.get('total_shares', 0):,})
- Average Engagement per Post: {stats.get('engagement_metrics', {}).get('avg_total_engagement', 0):.1f}

PLATFORM BREAKDOWN:
"""
        
        for platform, platform_data in data_summary.get('platforms', {}).items():
            platform_stats = stats.get('platform_breakdown', {}).get(platform, {})
            context += f"- {platform.title()}: {platform_stats.get('posts', 0)} posts, {platform_stats.get('avg_engagement', 0):.1f} avg engagement\n"
        
        # Add top performing content examples
        top_posts = stats.get('top_performing_posts', [])[:5]
        if top_posts:
            context += f"\nTOP PERFORMING CONTENT EXAMPLES:\n"
            for i, post in enumerate(top_posts, 1):
                context += f"{i}. {post['platform'].title()} - {post['text_preview']} (Engagement: {post['total_engagement']:,})\n"
        
        # Add content type breakdown
        content_types = stats.get('content_type_breakdown', {})
        if content_types:
            context += f"\nCONTENT TYPES: {', '.join([f'{k}: {v}' for k, v in content_types.items()])}\n"
        
        return context
    
    def analyze_with_ai(self, user_question: str, project_id: int, context_data: Optional[Dict] = None) -> Dict[str, Any]:
        """Analyze user question with full access to scraped data"""
        
        try:
            # Check if OpenAI client is available
            if not self.client:
                return {
                    'success': False,
                    'error': 'OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable.'
                }
            # Get fresh scraped data if not provided - use ScrapyResult data only for now
            if not context_data:
                context_data = self.get_project_scraped_data(project_id, limit=self.max_context_posts)
            
            if context_data.get('error'):
                return {
                    'success': False,
                    'error': f"Failed to access scraped data: {context_data['error']}"
                }
            
            if context_data.get('total_results', 0) == 0:
                return {
                    'success': False,
                    'error': 'No scraped data available for this project. Please run some scraping jobs first.'
                }
            
            # Generate context summary
            context_summary = self.generate_context_summary(context_data)
            
            # Prepare detailed data for specific questions
            detailed_context = ""
            posts_data = context_data.get('all_posts', [])
            
            # Add specific context based on question type
            question_lower = user_question.lower()
            
            if any(term in question_lower for term in ['sentiment', 'feeling', 'emotion', 'mood']):
                # Add sentiment context
                detailed_context += self._get_sentiment_context(posts_data)
            
            if any(term in question_lower for term in ['hashtag', 'trending', 'popular', 'viral']):
                # Add hashtag/trending context
                detailed_context += self._get_hashtag_context(posts_data)
            
            if any(term in question_lower for term in ['comment', 'discussion', 'conversation']):
                # Add comment context
                detailed_context += self._get_comment_context(posts_data)
            
            if any(term in question_lower for term in ['engagement', 'performance', 'metric']):
                # Add detailed engagement context
                detailed_context += self._get_engagement_context(context_data['statistics'])
            
            # Create conversational prompt
            prompt = f"""
You are a friendly, knowledgeable social media expert who loves helping creators understand their content performance. You have access to real scraped data from their social media accounts and can provide detailed, data-driven insights in a conversational way.

CURRENT DATA CONTEXT:
{context_summary}

{detailed_context}

USER'S QUESTION: "{user_question}"

PERSONALITY & TONE:
- Be conversational, friendly, and enthusiastic about social media insights
- Use natural language like you're chatting with a friend who's genuinely interested in their social media performance
- Include relevant emojis to make the conversation engaging
- Ask follow-up questions when appropriate
- Share insights like you're genuinely excited to help them improve their content

ANALYSIS APPROACH:
- Always start with a warm, personalized greeting acknowledging their specific data
- Provide concrete insights based on their ACTUAL scraped data (not generic advice)
- Include specific numbers, post examples, and engagement metrics from their real content
- When analyzing sentiment, consider both post content AND comment sentiment
- Point out surprising or interesting patterns you notice in their data
- End with actionable next steps or follow-up questions to keep the conversation going

SENTIMENT ANALYSIS FOCUS:
- Analyze both the emotional tone of their posts and the sentiment in comments received
- Look for patterns between content types and audience reactions
- Identify which types of posts generate positive vs negative sentiment in comments
- Consider engagement quality, not just quantity

Remember: You're analyzing their REAL data of {context_data.get('total_results', 0)} actual posts across {len(context_data.get('platforms_covered', []))} platforms, so be specific and personal in your insights!

Respond naturally and conversationally:
"""

            # Call OpenAI API
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert social media data analyst. Provide detailed, data-driven insights based on real scraped social media data. Always reference specific numbers and examples from the provided data."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=self.max_response_tokens,
                temperature=0.7
            )
            
            return {
                'success': True,
                'response': response.choices[0].message.content,
                'data_context': {
                    'total_posts_analyzed': context_data.get('total_results', 0),
                    'platforms_covered': list(context_data.get('platforms', {}).keys()),
                    'total_engagement': context_data.get('statistics', {}).get('total_engagement', 0),
                    'date_range': context_data.get('statistics', {}).get('date_range', {})
                },
                'tokens_used': response.usage.total_tokens if hasattr(response, 'usage') else None
            }
            
        except Exception as e:
            logger.error(f"Error in AI analysis: {str(e)}")
            return {
                'success': False,
                'error': f"AI analysis failed: {str(e)}"
            }
    
    def _get_sentiment_context(self, posts_data: List[Dict]) -> str:
        """Get enhanced sentiment-related context from posts and comments"""
        
        if not posts_data:
            return ""
        
        # Extract post content for sentiment analysis
        post_texts = []
        comment_samples = []
        engagement_patterns = []
        
        for post in posts_data[:30]:  # Analyze more posts for better context
            text_content = post.get('text_content', '')
            if text_content:
                post_texts.append({
                    'text': text_content[:150],
                    'platform': post.get('platform', ''),
                    'likes': post.get('likes', 0),
                    'comments_count': post.get('comments_count', 0),
                    'engagement': post.get('total_engagement', 0)
                })
            
            # Get comment samples with engagement data
            comments = post.get('comments', [])
            if isinstance(comments, list) and len(comments) > 0:
                for comment in comments[:5]:  # Top 5 comments per post
                    if isinstance(comment, dict) and comment.get('text'):
                        comment_samples.append({
                            'text': comment['text'][:120],
                            'post_engagement': post.get('total_engagement', 0),
                            'comment_likes': comment.get('likes', 0)
                        })
        
        # Identify engagement patterns
        high_engagement_posts = [p for p in post_texts if p['engagement'] > 50000]
        low_engagement_posts = [p for p in post_texts if p['engagement'] < 10000]
        
        context = f"""
ENHANCED SENTIMENT ANALYSIS CONTEXT:

📊 POST CONTENT ANALYSIS:
High-performing posts (50k+ engagement):
{chr(10).join([f"- [{p['platform'].upper()}] {p['text']}... ({p['engagement']:,} total engagement)" for p in high_engagement_posts[:5]])}

Lower engagement posts (<10k engagement):
{chr(10).join([f"- [{p['platform'].upper()}] {p['text']}... ({p['engagement']:,} total engagement)" for p in low_engagement_posts[:3]])}

💬 COMMENT SENTIMENT SAMPLES:
Comments from high-engagement posts:
{chr(10).join([f"- '{c['text']}...' (from post with {c['post_engagement']:,} engagement)" for c in comment_samples[:8] if c['post_engagement'] > 20000])}

Comments from various posts:
{chr(10).join([f"- '{c['text']}...' ({c['comment_likes']} likes)" for c in comment_samples[8:15] if c.get('text')])}

📈 SENTIMENT PATTERNS TO ANALYZE:
- Correlation between post tone and engagement levels
- Comment sentiment vs post performance
- Emotional triggers that drive higher engagement
- Platform-specific sentiment differences
- Audience reaction patterns (positive/negative/neutral)
"""
        return context
    
    def _get_hashtag_context(self, posts_data: List[Dict]) -> str:
        """Get hashtag and trending context from posts"""
        
        all_hashtags = []
        for post in posts_data:
            hashtags = post.get('hashtags', [])
            all_hashtags.extend(hashtags)
        
        hashtag_counter = Counter(all_hashtags)
        top_hashtags = hashtag_counter.most_common(20)
        
        context = f"""
HASHTAG & TRENDING ANALYSIS:
Top Hashtags (Total: {len(all_hashtags)} hashtags across {len(posts_data)} posts):
{chr(10).join([f"- {tag}: {count} times" for tag, count in top_hashtags[:15]])}
"""
        return context
    
    def _get_comment_context(self, posts_data: List[Dict]) -> str:
        """Get comment analysis context from posts"""
        
        total_comments = 0
        sample_discussions = []
        
        for post in posts_data[:20]:
            comments = post.get('comments', [])
            total_comments += len(comments)
            
            if comments:
                sample_discussions.append({
                    'post_preview': post.get('text_content', '')[:50] + '...',
                    'comment_count': len(comments),
                    'sample_comments': [c.get('text', '')[:100] for c in comments[:3]]
                })
        
        context = f"""
COMMENT & DISCUSSION ANALYSIS:
Total Comments: {total_comments} across {len(posts_data)} posts
Average Comments per Post: {total_comments / len(posts_data):.1f}

Sample Discussions:
"""
        for disc in sample_discussions[:5]:
            context += f"Post: {disc['post_preview']} ({disc['comment_count']} comments)\n"
            for comment in disc['sample_comments']:
                context += f"  - {comment}...\n"
        
        return context
    
    def _get_engagement_context(self, statistics: Dict) -> str:
        """Get detailed engagement metrics context"""
        
        metrics = statistics.get('engagement_metrics', {})
        platform_breakdown = statistics.get('platform_breakdown', {})
        
        context = f"""
DETAILED ENGAGEMENT METRICS:
Overall Performance:
- Average Likes per Post: {metrics.get('avg_likes', 0):.1f}
- Average Comments per Post: {metrics.get('avg_comments', 0):.1f}
- Average Shares per Post: {metrics.get('avg_shares', 0):.1f}
- Total Engagement Rate: {metrics.get('avg_total_engagement', 0):.1f}

Platform Comparison:
"""
        for platform, stats in platform_breakdown.items():
            context += f"- {platform.title()}: {stats.get('posts', 0)} posts, {stats.get('avg_engagement', 0):.1f} avg engagement\n"
        
        return context


# Initialize the service instance
ai_chat_service = AIAnalysisChatService()