from django.shortcuts import render, get_object_or_404
import csv
import json
import io
import datetime
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny
from django.http import HttpResponse
from .models import TikTokPost, Folder
from .serializers import TikTokPostSerializer, FolderSerializer
from django.db.models import Q

# Try to import dateparser, but provide a fallback if it's not available
try:
    import dateparser
    HAS_DATEPARSER = True
except ImportError:
    HAS_DATEPARSER = False
    print("Warning: dateparser module not available. Using basic date parsing.")

# Create your views here.

class FolderViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing TikTok data folders
    """
    serializer_class = FolderSerializer
    permission_classes = [AllowAny]  # For testing, use proper permissions in production
    
    def get_queryset(self):
        """
        Filter folders by project if project parameter is provided.
        Require project parameter to prevent cross-project data leakage.
        """
        # Get project ID from query parameters
        project_id = self.request.query_params.get('project')
        
        # If no project ID is provided, return empty queryset to prevent data leakage
        if not project_id:
            return Folder.objects.none()
        
        # Validate project ID format
        try:
            project_id = int(project_id)
        except (ValueError, TypeError):
            return Folder.objects.none()
        
        # Filter by project
        queryset = Folder.objects.filter(project_id=project_id)
        
        # Filter by parent folder if specified
        parent_folder = self.request.query_params.get('parent_folder')
        if parent_folder:
            try:
                parent_folder_id = int(parent_folder)
                queryset = queryset.filter(parent_folder_id=parent_folder_id)
            except (ValueError, TypeError):
                return Folder.objects.none()
        
        # Check if hierarchical data is requested
        include_hierarchy = self.request.query_params.get('include_hierarchy', 'false').lower() == 'true'
        
        if include_hierarchy:
            # Prefetch related subfolders for hierarchical display
            queryset = queryset.prefetch_related('subfolders')
        
        return queryset
    
    def get_object(self):
        """
        Override get_object to handle detail endpoints without requiring project parameter
        """
        # For detail endpoints, get the object directly by ID
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            folder_id = self.kwargs.get('pk')
            try:
                folder_id_int = int(folder_id)
                
                # First, try to find a TikTok folder with this ID
                try:
                    return Folder.objects.get(id=folder_id_int)
                except Folder.DoesNotExist:
                    # It might be a UnifiedRunFolder ID, try to find the linked TikTok folder
                    from track_accounts.models import UnifiedRunFolder
                    try:
                        unified_folder = UnifiedRunFolder.objects.get(id=folder_id_int)
                        
                        # Find TikTok folders linked to this UnifiedRunFolder
                        linked_tiktok_folders = Folder.objects.filter(unified_job_folder=unified_folder)
                        
                        if linked_tiktok_folders.exists():
                            # Use the first linked TikTok folder
                            return linked_tiktok_folders.first()
                        else:
                            from rest_framework.exceptions import NotFound
                            raise NotFound(f"No TikTok folder linked to UnifiedRunFolder {folder_id_int}")
                    except UnifiedRunFolder.DoesNotExist:
                        from rest_framework.exceptions import NotFound
                        raise NotFound("No Folder matches the given query.")
                        
            except (ValueError, TypeError):
                from rest_framework.exceptions import NotFound
                raise NotFound("Invalid folder ID format.")
        
        # For list endpoints, use the filtered queryset
        return super().get_object()
    
    def create(self, request, *args, **kwargs):
        """
        Override create method to ensure project ID is saved
        """
        # Explicitly get project ID from request data
        project_id = request.data.get('project')
        
        # Validate and save using serializer
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Save with project ID explicitly set
        folder = serializer.save()
        
        # Double check the project ID is set correctly
        if project_id and not folder.project_id:
            folder.project_id = project_id
            folder.save()
            
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """
        Override update method to ensure project ID is preserved
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Get project ID from request or use existing
        project_id = request.data.get('project', instance.project_id)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Save with project ID explicitly set
        updated_instance = serializer.save()
        
        # Double check the project ID is preserved
        if project_id and updated_instance.project_id != project_id:
            updated_instance.project_id = project_id
            updated_instance.save()
        
        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}
        
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to handle folder deletion properly without requiring project parameter
        """
        try:
            # Get the folder instance directly by ID to avoid queryset filtering issues
            folder_id = kwargs.get('pk')
            if not folder_id:
                return Response({'error': 'Folder ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                folder = Folder.objects.get(id=folder_id)
            except Folder.DoesNotExist:
                return Response({'error': 'Folder not found'}, status=status.HTTP_404_NOT_FOUND)
            
            print(f"=== TIKTOK FOLDER DELETE DEBUG ===")
            print(f"Deleting folder: {folder.name} (ID: {folder.id})")
            
            # Move all content in this folder to uncategorized (folder=None) before deletion
            posts_moved = TikTokPost.objects.filter(folder=folder).update(folder=None)
            print(f"Moved {posts_moved} posts to uncategorized")
            
            # Delete the folder
            folder.delete()
            print(f"Folder deleted successfully")
            print(f"=== END TIKTOK FOLDER DELETE DEBUG ===")
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            print(f"Error deleting folder: {str(e)}")
            return Response({'error': f'Failed to delete folder: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TikTokPostViewSet(viewsets.ModelViewSet):
    """
    API endpoint for TikTok Posts
    """
    serializer_class = TikTokPostSerializer
    permission_classes = [AllowAny]  # Allow any user to access these endpoints for testing
    
    def get_queryset(self):
        """
        Filter posts by folder if folder_id is provided
        """
        queryset = TikTokPost.objects.all()
        
        # Filter by folder if specified
        folder_id = self.request.query_params.get('folder_id')
        if folder_id:
            try:
                folder_id_int = int(folder_id)
                
                # First, try to find a TikTok folder with this ID
                from .models import Folder
                tiktok_folder = Folder.objects.filter(id=folder_id_int).first()
                
                if tiktok_folder:
                    # It's a direct TikTok folder ID
                    queryset = queryset.filter(folder_id=folder_id_int)
                else:
                    # It might be a UnifiedRunFolder ID, try to find the linked TikTok folder
                    from track_accounts.models import UnifiedRunFolder
                    unified_folder = UnifiedRunFolder.objects.filter(id=folder_id_int).first()
                    
                    if unified_folder:
                        # Find TikTok folders linked to this UnifiedRunFolder
                        linked_tiktok_folders = Folder.objects.filter(unified_job_folder=unified_folder)
                        
                        if linked_tiktok_folders.exists():
                            # Use the first linked TikTok folder
                            tiktok_folder_ids = [f.id for f in linked_tiktok_folders]
                            queryset = queryset.filter(folder_id__in=tiktok_folder_ids)
                        else:
                            # No linked TikTok folder found, return empty queryset
                            queryset = TikTokPost.objects.none()
                    else:
                        # Neither TikTok folder nor UnifiedRunFolder found, return empty queryset
                        queryset = TikTokPost.objects.none()
                        
            except (ValueError, TypeError):
                # Invalid folder_id format, return empty queryset
                queryset = TikTokPost.objects.none()
        
        # Filter by content type if specified
        content_type = self.request.query_params.get('content_type')
        if content_type:
            queryset = queryset.filter(content_type=content_type)
        
        # Add search functionality
        search_query = self.request.query_params.get('search', '')
        if search_query:
            queryset = queryset.filter(
                Q(user_posted__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(hashtags__icontains=search_query) |
                Q(content_type__icontains=search_query) |
                Q(post_id__icontains=search_query)
            )
        
        return queryset

    def _safe_int_convert(self, value):
        """
        Safely convert a value to integer, returning 0 if conversion fails
        """
        try:
            if value is None or value == '' or value == '""':
                return 0
            return int(value)
        except (ValueError, TypeError):
            return 0
    
    def _safe_float_convert(self, value):
        """
        Safely convert a value to float, returning 0.0 if conversion fails
        """
        try:
            if value is None or value == '' or value == '""':
                return 0.0
            return float(value)
        except (ValueError, TypeError):
            return 0.0
            
    def _safe_bool_convert(self, value):
        """
        Safely convert a value to boolean
        """
        if value is None or value == '' or value == '""':
            return False
        
        if isinstance(value, bool):
            return value
        
        # Convert string values
        if isinstance(value, str):
            value = value.strip().lower()
            return value in ('true', 'yes', '1', 't', 'y')
        
        # Try to convert numbers to bool
        try:
            return bool(int(value))
        except (ValueError, TypeError):
            return False

    def _parse_date(self, date_str):
        """
        Parse a date string using dateparser if available, otherwise use basic parsing
        """
        if not date_str or not date_str.strip() or date_str.strip() == '""':
            return None
            
        # Remove any quotes that might be in the CSV data
        clean_date = date_str.strip().strip('"\'')
        if not clean_date:
            return None
        
        # Special handling for ISO format dates (like 2025-04-14T08:27:06.000Z)
        if 'T' in clean_date and (clean_date.endswith('Z') or '+' in clean_date):
            try:
                # Use Python's built-in ISO parser for efficiency
                from datetime import datetime
                return datetime.fromisoformat(clean_date.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                # If that fails, continue with the regular parsing methods
                print(f"ISO format detection failed for: {clean_date}")
                pass
            
        # Detect and fix common TikTok date formats
        # If it's a Unix timestamp (all digits)
        if clean_date.isdigit() and len(clean_date) >= 10:
            try:
                # Convert Unix timestamp to datetime
                timestamp = int(clean_date)
                # Check if it's in milliseconds (13 digits) or seconds (10 digits)
                if len(clean_date) >= 13:
                    timestamp = timestamp // 1000  # Convert from milliseconds to seconds
                return datetime.datetime.fromtimestamp(timestamp)
            except (ValueError, OverflowError):
                pass  # If conversion fails, continue with other methods
            
        try:
            if HAS_DATEPARSER:
                # Use dateparser if available with specific settings for TikTok
                return dateparser.parse(
                    clean_date,
                    settings={
                        'TIMEZONE': 'UTC',
                        'RETURN_AS_TIMEZONE_AWARE': False,
                        'DATE_ORDER': 'YMD',  # Prefer Year-Month-Day format
                    }
                )
            else:
                # Basic parsing for common formats
                formats_to_try = [
                    '%Y-%m-%dT%H:%M:%S.%fZ', # 2025-04-14T08:27:06.000Z
                    '%Y-%m-%dT%H:%M:%SZ',    # 2025-04-14T08:27:06Z
                    '%Y-%m-%dT%H:%M:%S.%f',  # 2025-04-14T08:27:06.000
                    '%Y-%m-%dT%H:%M:%S',     # 2025-04-14T08:27:06
                    '%Y-%m-%d',              # 2023-01-31
                    '%Y-%m-%d %H:%M:%S',     # 2023-01-31 12:30:45
                    '%Y-%m-%d %H:%M',        # 2023-01-31 12:30
                    '%d/%m/%Y',              # 31/01/2023
                    '%m/%d/%Y',              # 01/31/2023
                    '%Y/%m/%d',              # 2023/01/31
                    '%d-%m-%Y',              # 31-01-2023
                    '%m-%d-%Y',              # 01-31-2023
                    '%d.%m.%Y',              # 31.01.2023
                    '%m.%d.%Y',              # 01.31.2023
                    '%b %d, %Y',             # Jan 31, 2023
                    '%d %b %Y',              # 31 Jan 2023
                    '%B %d, %Y',             # January 31, 2023
                    '%d %B %Y',              # 31 January 2023
                ]
                
                for fmt in formats_to_try:
                    try:
                        return datetime.datetime.strptime(clean_date, fmt)
                    except ValueError:
                        continue
                        
                # If we get here, no format worked
                return None
        except Exception as e:
            print(f"Date parsing error: {str(e)} for value: '{clean_date}'")
            return None

    @action(detail=False, methods=['POST'])
    def upload_csv(self, request):
        """
        Upload CSV file and parse the data
        """
        try:
            csv_file = request.FILES.get('file')
            if not csv_file:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            folder_id = request.data.get('folder_id')
            folder = None
            if folder_id:
                try:
                    folder = Folder.objects.get(id=folder_id)
                except Folder.DoesNotExist:
                    return Response(
                        {'error': f'Folder with id {folder_id} does not exist'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Read the CSV file
            try:
                decoded_file = csv_file.read().decode('utf-8-sig')
            except UnicodeDecodeError:
                try:
                    # Try with a fallback encoding if UTF-8 fails
                    decoded_file = csv_file.read().decode('latin-1')
                except Exception as e:
                    return Response(
                        {'error': f'Failed to decode file: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            csv_data = csv.DictReader(io.StringIO(decoded_file))
            
            # Check if there are any rows in the CSV
            rows = list(csv_data)
            if not rows:
                return Response(
                    {'error': 'The CSV file is empty or improperly formatted'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Count how many rows were successfully created
            created_count = 0
            failed_rows = []
            
            for row in rows:
                try:
                    # Map CSV columns to model fields based on GE Tracker TikTok CSV format
                    post_data = {
                        'url': row.get('url', ''),
                        'post_id': row.get('post_id', ''),
                        'user_posted': row.get('profile_username', ''),
                        'description': row.get('description', ''),
                        'hashtags': row.get('hashtags', ''),
                        'likes': self._safe_int_convert(row.get('digg_count', 0)),
                        'num_comments': self._safe_int_convert(row.get('comment_count', 0)),
                        'date_posted': self._parse_date(row.get('create_time', None)),
                        'videos': row.get('video_url', ''),
                        'thumbnail': row.get('preview_image', ''),
                        'profile_image_link': row.get('profile_avatar', ''),
                        'content_type': row.get('post_type', 'video'),
                        'discovery_input': row.get('discovery_input', ''),
                        'is_verified': self._safe_bool_convert(row.get('is_verified', False)),
                        'followers': self._safe_int_convert(row.get('profile_followers', 0)),
                        'location': row.get('region', '') or row.get('country', ''),
                        'tagged_users': row.get('tagged_user', ''),
                    }
                    
                    # Calculate an engagement score based on various metrics
                    likes = self._safe_int_convert(row.get('digg_count', 0))
                    comments = self._safe_int_convert(row.get('comment_count', 0))
                    shares = self._safe_int_convert(row.get('share_count', 0))
                    collects = self._safe_int_convert(row.get('collect_count', 0))
                    plays = self._safe_int_convert(row.get('play_count', 0))
                    
                    # Weight different engagement types
                    post_data['engagement_score'] = (
                        likes + 
                        (comments * 2) + 
                        (shares * 3) + 
                        (collects * 2) + 
                        (plays * 0.1)  # Views/plays weighted less
                    )
                    
                    # Skip if no post_id or URL is provided
                    if not post_data['post_id'] and not post_data['url']:
                        failed_rows.append({
                            'row': row,
                            'error': 'Missing post_id and URL'
                        })
                        continue
                    
                    # Set folder if provided
                    if folder:
                        post_data['folder'] = folder
                    
                    # Create or update the post
                    if post_data['post_id']:
                        post, created = TikTokPost.objects.update_or_create(
                            post_id=post_data['post_id'],
                            folder=folder,
                            defaults=post_data
                        )
                    else:
                        post, created = TikTokPost.objects.update_or_create(
                            url=post_data['url'],
                            folder=folder,
                            defaults=post_data
                        )
                    
                    created_count += 1
                    
                except Exception as e:
                    failed_rows.append({
                        'row': row,
                        'error': str(e)
                    })
            
            return Response({
                'success': True,
                'created_count': created_count,
                'failed_count': len(failed_rows),
                'failed_rows': failed_rows[:10] if failed_rows else []  # Limit to first 10 for readability
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to process file: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['GET'])
    def download_csv(self, request):
        """
        Download posts as CSV file
        """
        try:
            # Get query parameters
            folder_id = request.query_params.get('folder_id')
            content_type = request.query_params.get('content_type')
            
            # Build the filtered queryset
            queryset = self.get_queryset()
            
            # Create a CSV response
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="tiktok_posts.csv"'
            
            # Customize filename if we have folder or content type
            filename_parts = ['tiktok_posts']
            if folder_id:
                try:
                    folder = Folder.objects.get(id=folder_id)
                    filename_parts.append(folder.name.replace(' ', '_').lower())
                except Folder.DoesNotExist:
                    pass
            
            if content_type:
                filename_parts.append(content_type)
                
            response['Content-Disposition'] = f'attachment; filename="{"-".join(filename_parts)}.csv"'
            
            # Create CSV writer
            writer = csv.writer(response)
            
            # Write header row
            writer.writerow([
                'Post ID', 'User Name', 'URL', 'Date Posted', 'Likes', 'Comments',
                'Description', 'Hashtags', 'Is Verified', 'Is Paid Partnership',
                'Followers', 'Posts Count', 'Content Type'
            ])
            
            # Write data rows
            for post in queryset:
                writer.writerow([
                    post.post_id,
                    post.user_posted,
                    post.url,
                    post.date_posted.isoformat() if post.date_posted else '',
                    post.likes,
                    post.num_comments,
                    post.description,
                    post.hashtags,
                    'Yes' if post.is_verified else 'No',
                    'Yes' if post.is_paid_partnership else 'No',
                    post.followers,
                    post.posts_count,
                    post.content_type
                ])
                
            return response
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'])
    def move_to_folder(self, request):
        """
        Move posts to a specified folder
        """
        try:
            folder_id = request.data.get('folder_id')
            post_ids = request.data.get('post_ids', [])
            
            if not folder_id or not post_ids:
                return Response({
                    'error': 'Both folder_id and post_ids are required'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Check if folder exists
            try:
                folder = Folder.objects.get(id=folder_id)
            except Folder.DoesNotExist:
                return Response({
                    'error': f'Folder with ID {folder_id} does not exist'
                }, status=status.HTTP_404_NOT_FOUND)
                
            # Update the posts
            posts_updated = 0
            for post_id in post_ids:
                try:
                    post = TikTokPost.objects.get(id=post_id)
                    post.folder = folder
                    post.save()
                    posts_updated += 1
                except TikTokPost.DoesNotExist:
                    continue
                    
            return Response({
                'success': True,
                'posts_updated': posts_updated,
                'folder': {
                    'id': folder.id,
                    'name': folder.name
                }
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'])
    def scrape_from_urls(self, request):
        """
        Scrape TikTok posts from URLs using Apify
        """
        try:
            import asyncio
            from apify_integration.services import ApifyScrapingService
            
            urls = request.data.get('urls', [])
            folder_name = request.data.get('folder_name', 'TikTok Scraped Data')
            project_id = request.data.get('project_id', 1)
            num_of_posts = request.data.get('num_of_posts', 10)
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            
            if not urls:
                return Response({
                    'error': 'URLs list is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create source names from URLs
            source_names = [f"TikTok Source {i+1}" for i in range(len(urls))]
            
            async def create_and_start_job():
                service = ApifyScrapingService()
                
                # Create the job
                job = await service.create_scraping_job(
                    name=f"TikTok URL Scrape - {folder_name}",
                    project_id=project_id,
                    platform='tiktok',
                    content_type='posts',
                    target_urls=urls,
                    source_names=source_names,
                    num_of_posts=num_of_posts,
                    start_date=start_date,
                    end_date=end_date,
                    auto_create_folders=True
                )
                
                # Start the job
                success = await service.start_scraping_job(job.id)
                return job, success
            
            # Run the async function
            job, success = asyncio.run(create_and_start_job())
            
            if success:
                return Response({
                    'success': True,
                    'message': 'TikTok scraping job started successfully',
                    'job_id': job.id,
                    'job_name': job.name,
                    'status': job.status,
                    'urls_count': len(urls)
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': 'Failed to start TikTok scraping job'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error starting TikTok scrape: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST) 