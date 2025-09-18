from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, Http404
import csv
import json
import io
import datetime
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny
from .models import InstagramPost, Folder, InstagramComment, CommentScrapingJob
from .serializers import (
    InstagramPostSerializer, 
    FolderSerializer, 
    InstagramCommentSerializer,
    CommentScrapingJobSerializer
)
from django.db.models import Q
from .services import create_and_execute_instagram_comment_scraping_job

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
    API endpoint for managing Instagram data folders
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
        
        print(f"=== FOLDER QUERYSET DEBUG ===")
        print(f"Requested project_id: {project_id}")
        
        # If no project ID is provided, return empty queryset to prevent data leakage
        if not project_id:
            print("No project_id provided - returning empty queryset for security")
            print(f"=== END FOLDER QUERYSET DEBUG ===")
            return Folder.objects.none()
        
        # Validate project ID format
        try:
            project_id = int(project_id)
        except (ValueError, TypeError):
            print(f"Invalid project_id format: {project_id} - returning empty queryset")
            print(f"=== END FOLDER QUERYSET DEBUG ===")
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
        
        print(f"Total folders in DB: {Folder.objects.count()}")
        print(f"Folders for project {project_id}: {queryset.count()}")
        
        # Debug: Show all folders for this project
        print(f"Folders for project {project_id}:")
        for folder in queryset:
            print(f"  - Folder ID: {folder.id}, Name: {folder.name}, Project ID: {folder.project_id}")
        print(f"=== END FOLDER QUERYSET DEBUG ===")
            
        return queryset
    
    def get_object(self):
        """
        Override get_object to allow direct lookup by ID for detail operations (update, delete, retrieve)
        This bypasses the project filtering in get_queryset for individual object operations
        """
        # For detail operations (like update, delete, retrieve), we should allow direct lookup by ID
        # The project filtering is mainly for list operations to prevent data leakage
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        folder_id = self.kwargs.get(lookup_url_kwarg)
        
        if folder_id:
            try:
                folder_id_int = int(folder_id)
                
                # First, try to find an Instagram folder with this ID
                try:
                    folder = Folder.objects.get(id=folder_id_int)
                    print(f"=== FOLDER GET_OBJECT DEBUG ===")
                    print(f"Found Instagram folder by ID: {folder.id}, Name: {folder.name}, Project: {folder.project_id}")
                    print(f"=== END FOLDER GET_OBJECT DEBUG ===")
                    return folder
                except Folder.DoesNotExist:
                    # It might be a UnifiedRunFolder ID, try to find the linked Instagram folder
                    from track_accounts.models import UnifiedRunFolder
                    try:
                        unified_folder = UnifiedRunFolder.objects.get(id=folder_id_int)
                        print(f"=== FOLDER GET_OBJECT DEBUG ===")
                        print(f"Found UnifiedRunFolder by ID: {unified_folder.id}, Name: {unified_folder.name}")
                        
                        # Find Instagram folders linked to this UnifiedRunFolder
                        linked_instagram_folders = Folder.objects.filter(unified_job_folder=unified_folder)
                        
                        if linked_instagram_folders.exists():
                            # Use the first linked Instagram folder
                            instagram_folder = linked_instagram_folders.first()
                            print(f"Found linked Instagram folder: {instagram_folder.id}, Name: {instagram_folder.name}")
                            print(f"=== END FOLDER GET_OBJECT DEBUG ===")
                            return instagram_folder
                        else:
                            print(f"No linked Instagram folder found for UnifiedRunFolder {folder_id_int}")
                            print(f"=== END FOLDER GET_OBJECT DEBUG ===")
                            raise Http404(f"No Instagram folder linked to UnifiedRunFolder {folder_id_int}")
                    except UnifiedRunFolder.DoesNotExist:
                        print(f"=== FOLDER GET_OBJECT DEBUG ===")
                        print(f"Neither Instagram folder nor UnifiedRunFolder with ID {folder_id_int} found")
                        print(f"=== END FOLDER GET_OBJECT DEBUG ===")
                        raise Http404(f"Folder with id {folder_id_int} does not exist")
                        
            except (ValueError, TypeError):
                print(f"=== FOLDER GET_OBJECT DEBUG ===")
                print(f"Invalid folder_id format: {folder_id}")
                print(f"=== END FOLDER GET_OBJECT DEBUG ===")
                raise Http404(f"Invalid folder id format: {folder_id}")
        
        # Fallback to default behavior if no ID is provided
        return super().get_object()
    
    def create(self, request, *args, **kwargs):
        """
        Override create method to ensure project ID is saved
        """
        # Debug logging
        print(f"=== FOLDER CREATION DEBUG ===")
        print(f"Request data: {request.data}")
        print(f"Request method: {request.method}")
        print(f"Request content type: {request.content_type}")
        
        # Explicitly get project ID from request data
        project_id = request.data.get('project')
        print(f"Extracted project_id: {project_id}")
        
        # Validate and save using serializer
        serializer = self.get_serializer(data=request.data)
        print(f"Serializer data before validation: {serializer.initial_data}")
        
        try:
            serializer.is_valid(raise_exception=True)
            print(f"Serializer validated data: {serializer.validated_data}")
        except Exception as e:
            print(f"Serializer validation failed: {e}")
            print(f"Serializer errors: {serializer.errors}")
            raise
        
        # Save with project ID explicitly set
        folder = serializer.save()
        print(f"Folder created - ID: {folder.id}, Name: {folder.name}, Project ID: {folder.project_id}")
        
        # Double check the project ID is set correctly
        if project_id and not folder.project_id:
            print(f"Project ID missing, fixing manually...")
            folder.project_id = project_id
            folder.save()
            print(f"After manual fix - Project ID: {folder.project_id}")
        
        # Verify final state
        folder.refresh_from_db()
        print(f"Final folder state - ID: {folder.id}, Project ID: {folder.project_id}")
        print(f"=== END FOLDER CREATION DEBUG ===")
            
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
            
            print(f"=== FOLDER DELETE DEBUG ===")
            print(f"Deleting folder: {folder.name} (ID: {folder.id}, Category: {folder.category})")
            
            # Move all content in this folder to uncategorized (folder=None) before deletion
            if folder.category == 'posts':
                posts_moved = InstagramPost.objects.filter(folder=folder).update(folder=None)
                print(f"Moved {posts_moved} posts to uncategorized")
            elif folder.category == 'reels':
                reels_moved = InstagramPost.objects.filter(folder=folder, content_type='reel').update(folder=None)
                print(f"Moved {reels_moved} reels to uncategorized")
            elif folder.category == 'comments':
                comments_moved = InstagramComment.objects.filter(folder=folder).update(folder=None)
                print(f"Moved {comments_moved} comments to uncategorized")
            
            # Delete the folder
            folder.delete()
            print(f"Folder deleted successfully")
            print(f"=== END FOLDER DELETE DEBUG ===")
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            print(f"Error deleting folder: {str(e)}")
            return Response({'error': f'Failed to delete folder: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['GET'])
    def contents(self, request, pk=None):
        """
        Get the contents of a folder based on its category
        """
        try:
            folder = self.get_object()
            
            if folder.category == 'posts':
                # Return Instagram posts (excluding reels)
                posts = InstagramPost.objects.filter(folder=folder).exclude(content_type='reel')
                
                # Apply search if provided
                search_query = request.query_params.get('search', '')
                if search_query:
                    search_filter = Q()
                    search_filter |= Q(user_posted__icontains=search_query)
                    search_filter |= Q(description__icontains=search_query) 
                    search_filter |= Q(hashtags__icontains=search_query)
                    posts = posts.filter(search_filter)
                
                # Paginate results
                page = self.paginate_queryset(posts)
                if page is not None:
                    serializer = InstagramPostSerializer(page, many=True)
                    paginated_response = self.get_paginated_response(serializer.data)
                    # Add category to the paginated response for frontend detection
                    response_data = paginated_response.data
                    response_data['category'] = 'posts'
                    return Response(response_data)
                
                serializer = InstagramPostSerializer(posts, many=True)
                return Response({
                    'category': 'posts',
                    'results': serializer.data
                })
                
            elif folder.category == 'reels':
                # Return Instagram reels
                reels = InstagramPost.objects.filter(folder=folder, content_type='reel')
                
                # Apply search if provided
                search_query = request.query_params.get('search', '')
                if search_query:
                    search_filter = Q()
                    search_filter |= Q(user_posted__icontains=search_query)
                    search_filter |= Q(description__icontains=search_query) 
                    search_filter |= Q(hashtags__icontains=search_query)
                    reels = reels.filter(search_filter)
                
                # Paginate results
                page = self.paginate_queryset(reels)
                if page is not None:
                    serializer = InstagramPostSerializer(page, many=True)
                    paginated_response = self.get_paginated_response(serializer.data)
                    # Add category to the paginated response for frontend detection
                    response_data = paginated_response.data
                    response_data['category'] = 'reels'
                    return Response(response_data)
                
                serializer = InstagramPostSerializer(reels, many=True)
                return Response({
                    'category': 'reels',
                    'results': serializer.data
                })
                
            elif folder.category == 'comments':
                # Return Instagram comments
                comments = InstagramComment.objects.filter(folder=folder)
                
                # Apply search if provided
                search_query = request.query_params.get('search', '')
                if search_query:
                    search_filter = Q()
                    search_filter |= Q(comment_user__icontains=search_query)
                    search_filter |= Q(comment__icontains=search_query)
                    search_filter |= Q(post_id__icontains=search_query)
                    comments = comments.filter(search_filter)
                
                # Paginate results
                page = self.paginate_queryset(comments)
                if page is not None:
                    serializer = InstagramCommentSerializer(page, many=True)
                    paginated_response = self.get_paginated_response(serializer.data)
                    # Add category to the paginated response for frontend detection
                    response_data = paginated_response.data
                    response_data['category'] = 'comments'
                    return Response(response_data)
                
                serializer = InstagramCommentSerializer(comments, many=True)
                return Response({
                    'category': 'comments',
                    'results': serializer.data
                })
            
            else:
                return Response({'error': 'Unknown folder category'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class InstagramPostViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Instagram Posts
    """
    serializer_class = InstagramPostSerializer
    permission_classes = [AllowAny]  # Allow any user to access these endpoints for testing
    
    def get_queryset(self):
        """
        Filter posts by folder if folder_id is provided
        """
        queryset = InstagramPost.objects.all()
        
        # Filter by folder if specified
        folder_id = self.request.query_params.get('folder_id')
        if folder_id:
            try:
                folder_id_int = int(folder_id)
                
                # First, try to find an Instagram folder with this ID
                instagram_folder = Folder.objects.filter(id=folder_id_int).first()
                
                if instagram_folder:
                    # It's a direct Instagram folder ID
                    queryset = queryset.filter(folder_id=folder_id_int)
                else:
                    # It might be a UnifiedRunFolder ID, try to find the linked Instagram folder
                    from track_accounts.models import UnifiedRunFolder
                    unified_folder = UnifiedRunFolder.objects.filter(id=folder_id_int).first()
                    
                    if unified_folder:
                        # Find Instagram folders linked to this UnifiedRunFolder
                        linked_instagram_folders = Folder.objects.filter(unified_job_folder=unified_folder)
                        
                        if linked_instagram_folders.exists():
                            # Use the first linked Instagram folder
                            instagram_folder_ids = [f.id for f in linked_instagram_folders]
                            queryset = queryset.filter(folder_id__in=instagram_folder_ids)
                        else:
                            # No linked Instagram folder found, return empty queryset
                            queryset = InstagramPost.objects.none()
                    else:
                        # Neither Instagram folder nor UnifiedRunFolder found, return empty queryset
                        queryset = InstagramPost.objects.none()
                        
            except (ValueError, TypeError):
                # Invalid folder_id format, return empty queryset
                queryset = InstagramPost.objects.none()
        
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
        
        # Add date range filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            try:
                start_datetime = self._parse_date(start_date)
                if start_datetime:
                    queryset = queryset.filter(date_posted__gte=start_datetime)
            except Exception as e:
                print(f"Error parsing start_date {start_date}: {e}")
        
        if end_date:
            try:
                end_datetime = self._parse_date(end_date)
                if end_datetime:
                    queryset = queryset.filter(date_posted__lte=end_datetime)
            except Exception as e:
                print(f"Error parsing end_date {end_date}: {e}")
        
        # Add likes range filtering
        min_likes = self.request.query_params.get('min_likes')
        max_likes = self.request.query_params.get('max_likes')
        
        if min_likes:
            try:
                min_likes_int = int(min_likes)
                queryset = queryset.filter(likes__gte=min_likes_int)
            except (ValueError, TypeError):
                print(f"Error parsing min_likes {min_likes}")
        
        if max_likes:
            try:
                max_likes_int = int(max_likes)
                queryset = queryset.filter(likes__lte=max_likes_int)
            except (ValueError, TypeError):
                print(f"Error parsing max_likes {max_likes}")
        
        # Add sorting
        sort_by = self.request.query_params.get('sort_by', 'date_posted')
        sort_order = self.request.query_params.get('sort_order', 'desc')
        
        # Validate sort_by field to prevent injection
        allowed_sort_fields = {
            'date_posted', 'likes', 'num_comments', 'user_posted', 
            'content_type', 'is_verified', 'is_paid_partnership'
        }
        
        if sort_by not in allowed_sort_fields:
            sort_by = 'date_posted'  # Default to date_posted if invalid field
        
        # Apply sorting
        if sort_order == 'desc':
            queryset = queryset.order_by(f'-{sort_by}')
        else:
            queryset = queryset.order_by(sort_by)
        
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
        """Safe boolean conversion"""
        if value is None or value == '':
            return False
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ['true', '1', 'yes', 'on']
        return bool(value)
    
    def _safe_json_parse(self, value):
        """Safely parse JSON data, return original value if not JSON"""
        if not value:
            return None
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, str):
            try:
                import json
                return json.loads(value)
            except (json.JSONDecodeError, ValueError):
                return value
        return value

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
            
        # Detect and fix common Instagram date formats
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
                # Use dateparser if available with specific settings for Instagram
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
    def scrape_from_urls(self, request):
        """
        Scrape Instagram posts from URLs using Apify
        """
        try:
            import asyncio
            from apify_integration.services import ApifyScrapingService
            
            urls = request.data.get('urls', [])
            folder_name = request.data.get('folder_name', 'Instagram Scraped Data')
            project_id = request.data.get('project_id', 1)
            num_of_posts = request.data.get('num_of_posts', 10)
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            
            if not urls:
                return Response({
                    'error': 'URLs list is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create source names from URLs
            source_names = [f"Instagram Source {i+1}" for i in range(len(urls))]
            
            async def create_and_start_job():
                service = ApifyScrapingService()
                
                # Create the job
                job = await service.create_scraping_job(
                    name=f"Instagram URL Scrape - {folder_name}",
                    project_id=project_id,
                    platform='instagram',
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
                    'message': 'Instagram scraping job started successfully',
                    'job_id': job.id,
                    'job_name': job.name,
                    'status': job.status,
                    'urls_count': len(urls)
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': 'Failed to start Instagram scraping job'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error starting Instagram scrape: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'])
    def upload_csv(self, request):
        """
        Upload CSV file and parse the data
        """
        try:
            csv_file = request.FILES.get('file')
            if not csv_file:
                return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not csv_file.name.endswith('.csv'):
                return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get folder_id from request data
            folder_id = request.data.get('folder_id')
            folder = None
            if folder_id:
                folder = get_object_or_404(Folder, id=folder_id)
            
            # Decode and parse CSV with comprehensive Unicode handling
            try:
                # Read the file content as bytes first
                csv_content_bytes = csv_file.read()
                
                # Try multiple encoding strategies
                decoded_file = None
                encoding_used = None
                
                # Strategy 1: UTF-8 with BOM
                try:
                    decoded_file = csv_content_bytes.decode('utf-8-sig')
                    encoding_used = 'utf-8-sig'
                except UnicodeDecodeError:
                    pass
                
                # Strategy 2: UTF-8
                if decoded_file is None:
                    try:
                        decoded_file = csv_content_bytes.decode('utf-8')
                        encoding_used = 'utf-8'
                    except UnicodeDecodeError:
                        pass
                
                # Strategy 3: Latin-1 (covers most Windows encodings)
                if decoded_file is None:
                    try:
                        decoded_file = csv_content_bytes.decode('latin1')
                        encoding_used = 'latin1'
                    except UnicodeDecodeError:
                        pass
                
                # Strategy 4: CP1252 with error replacement (last resort)
                if decoded_file is None:
                    decoded_file = csv_content_bytes.decode('cp1252', errors='replace')
                    encoding_used = 'cp1252-replace'
                
                print(f"CSV decoded using: {encoding_used}")
                
                # Clean up any problematic characters that might cause issues
                # Replace null bytes and normalize line endings
                decoded_file = decoded_file.replace('\x00', '').replace('\r\n', '\n').replace('\r', '\n')
                
                # Create StringIO object safely
                csv_string_io = io.StringIO(decoded_file)
                csv_data = csv.DictReader(csv_string_io)
                
            except Exception as e:
                safe_error = str(e).encode('ascii', errors='replace').decode('ascii')
                return Response(
                    {'error': f'Error reading CSV file. Please ensure it is properly encoded. Error: {safe_error}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Auto-detect content type based on CSV headers
            headers = set(csv_data.fieldnames or [])
            
            # Define unique fields for each content type based on actual API responses
            # Instagram posts typically have these fields
            post_unique_fields = {'latest_comments', 'engagement_score_view', 'post_content', 'videos_duration', 'images', 'photos_number'}
            # Instagram reels typically have these video-specific fields
            reel_unique_fields = {'video_play_count', 'length', 'video_url', 'audio_url', 'top_comments', 'product_type'}
            
            # Detect content type based on presence of unique fields
            post_matches = len(headers.intersection(post_unique_fields))
            reel_matches = len(headers.intersection(reel_unique_fields))
            
            # Additional detection logic
            # Check for "clips" in product_type or specific video indicators
            has_clips_product_type = any('clips' in str(row.get('product_type', '')).lower() for row in csv.DictReader(io.StringIO(decoded_file)))
            has_video_play_count = 'video_play_count' in headers
            has_audio_url = 'audio_url' in headers
            
            # Reset file pointer for processing
            csv_string_io.seek(0)
            csv_data = csv.DictReader(csv_string_io)
            
            if has_clips_product_type or reel_matches > post_matches or (has_video_play_count and has_audio_url):
                content_type = 'reel'
                detected_reason = f"Detected as reel (found {reel_matches} reel-specific fields: {headers.intersection(reel_unique_fields)}, clips product type: {has_clips_product_type})"
            else:
                content_type = 'post'
                detected_reason = f"Detected as post (found {post_matches} post-specific fields: {headers.intersection(post_unique_fields)})"
            
            print(f"Auto-detection result: {detected_reason}")
            
            # Lists to track created and updated objects
            created_objects = []
            updated_objects = []
            rejected_rows = []
            
            total_rows = 0
            
            # Process each row
            for row in csv_data:
                total_rows += 1
                
                # Debug log every 10 rows
                if total_rows % 10 == 0:
                    print(f"Processing row {total_rows}...")
                
                # Check for empty row
                if not row:
                    rejected_rows.append({
                        'reason': 'Empty row',
                        'row_number': total_rows + 1,
                    })
                    continue
                
                # Extract post_id from different possible sources
                post_id = None
                
                # Try different fields that might contain the post ID
                for field in ['post_id', 'shortcode', 'content_id']:
                    if field in row and row.get(field):
                        post_id = row.get(field)
                        break
                
                # If no post_id found but URL exists, extract from URL
                if not post_id and row.get('url'):
                    url = row.get('url', '')
                    # Extract post ID from Instagram URL (e.g., https://www.instagram.com/p/ABC123/)
                    import re
                    match = re.search(r'/p/([^/]+)/', url)
                    if match:
                        post_id = match.group(1)
                
                if not post_id:
                    rejected_rows.append({
                        'reason': 'Missing post_id',
                        'row_number': total_rows + 1,
                        'data': str(row)[:100] + '...' if len(str(row)) > 100 else str(row)
                    })
                    continue
                
                try:
                    # Parse date fields - handle empty strings 
                    date_posted_raw = row.get('date_posted', None)
                    parsed_date = self._parse_date(date_posted_raw)
                    
                    # If date parsing failed but timestamp is available, try to use that
                    if parsed_date is None and row.get('timestamp'):
                        parsed_date = self._parse_date(row.get('timestamp'))
                    
                    # Prepare the default data dictionary with all new fields
                    default_data = {
                        # Basic fields
                        'url': row.get('url', ''),
                        'user_posted': row.get('user_posted', ''),
                        'description': row.get('description', ''),
                        'num_comments': self._safe_int_convert(row.get('num_comments')),
                        'date_posted': parsed_date,
                        'likes': self._safe_int_convert(row.get('likes')),
                        'post_id': post_id,
                        
                        # Handle hashtags (can be array or string)
                        'hashtags': self._safe_json_parse(row.get('hashtags')) if row.get('hashtags') else None,
                        
                        # Media content fields
                        'photos': self._safe_json_parse(row.get('photos')) if row.get('photos') else None,
                        'videos': self._safe_json_parse(row.get('videos')) if row.get('videos') else None,
                        'thumbnail': row.get('thumbnail', ''),
                        
                        # Video-specific fields (mainly for reels)
                        'views': self._safe_int_convert(row.get('views')),
                        'video_play_count': self._safe_int_convert(row.get('video_play_count')),
                        'video_view_count': self._safe_int_convert(row.get('video_view_count')),
                        'length': row.get('length', ''),
                        'video_url': row.get('video_url', ''),
                        'audio_url': row.get('audio_url', ''),
                        
                        # Instagram-specific identifiers
                        'shortcode': row.get('shortcode', ''),
                        'content_id': row.get('content_id', ''),
                        'instagram_pk': row.get('pk', ''),
                        
                        # Content classification
                        'content_type': row.get('content_type', content_type),
                        'platform_type': 'IG Post' if content_type == 'post' else 'IG Reel',
                        'product_type': row.get('product_type', ''),
                        
                        # User profile information
                        'user_posted_id': row.get('user_posted_id', ''),
                        'followers': self._safe_int_convert(row.get('followers')),
                        'posts_count': self._safe_int_convert(row.get('posts_count')),
                        'following': self._safe_int_convert(row.get('following')),
                        'profile_image_link': row.get('profile_image_link', ''),
                        'user_profile_url': row.get('user_profile_url', ''),
                        'profile_url': row.get('profile_url', ''),
                        'is_verified': self._safe_bool_convert(row.get('is_verified')),
                        
                        # Partnership and collaboration
                        'is_paid_partnership': self._safe_bool_convert(row.get('is_paid_partnership')),
                        'partnership_details': self._safe_json_parse(row.get('partnership_details')) if row.get('partnership_details') else None,
                        'coauthor_producers': self._safe_json_parse(row.get('coauthor_producers')) if row.get('coauthor_producers') else None,
                        
                        # Comments and engagement
                        'location': row.get('location', ''),
                        'latest_comments': self._safe_json_parse(row.get('latest_comments')) if row.get('latest_comments') else None,
                        'top_comments': self._safe_json_parse(row.get('top_comments')) if row.get('top_comments') else None,
                        'engagement_score': self._safe_float_convert(row.get('engagement_score')),
                        'engagement_score_view': self._safe_int_convert(row.get('engagement_score_view')),
                        
                        # Tagged users and content
                        'tagged_users': self._safe_json_parse(row.get('tagged_users')) if row.get('tagged_users') else None,
                        
                        # Audio information (mainly for reels)
                        'audio': self._safe_json_parse(row.get('audio')) if row.get('audio') else None,
                        
                        # Post content structure (for carousel posts)
                        'post_content': self._safe_json_parse(row.get('post_content')) if row.get('post_content') else None,
                        
                        # Video duration details
                        'videos_duration': self._safe_json_parse(row.get('videos_duration')) if row.get('videos_duration') else None,
                        
                        # Image-specific fields
                        'images': self._safe_json_parse(row.get('images')) if row.get('images') else None,
                        'photos_number': self._safe_int_convert(row.get('photos_number')),
                        'alt_text': row.get('alt_text', ''),
                        
                        # Legacy fields (keep for backward compatibility)
                        'discovery_input': row.get('discovery_input', ''),
                        'has_handshake': self._safe_bool_convert(row.get('has_handshake')),
                        
                        # Folder
                        'folder': folder,
                    }
                    
                    # Check if post already exists in this specific folder
                    if folder:
                        existing_post = InstagramPost.objects.filter(post_id=post_id, folder=folder).first()
                    else:
                        existing_post = InstagramPost.objects.filter(post_id=post_id, folder__isnull=True).first()
                    
                    if existing_post:
                        # Update existing post in this folder
                        for key, value in default_data.items():
                            if key != 'folder':  # Preserve the folder
                                setattr(existing_post, key, value)
                        existing_post.save()
                        updated_objects.append(existing_post)
                    else:
                        # Create a new post
                        default_data['post_id'] = post_id
                        new_post = InstagramPost.objects.create(**default_data)
                        created_objects.append(new_post)
                except Exception as e:
                    rejected_rows.append({
                        'reason': str(e),
                        'row_number': total_rows + 1,  # +1 for header
                        'post_id': post_id,
                        'date': row.get('date_posted', 'unknown')
                    })
            
            total_count = len(created_objects) + len(updated_objects)
            content_type_label = "reels" if content_type == "reel" else "posts"
            message = f"Successfully processed {total_count} Instagram {content_type_label}: {len(created_objects)} created, {len(updated_objects)} updated"
            
            if rejected_rows:
                message += f". {len(rejected_rows)} rows were rejected."
            
            # Log summary
            print(f"CSV Import Summary: {message}")
            print(f"Total rows: {total_rows}, Created: {len(created_objects)}, Updated: {len(updated_objects)}, Rejected: {len(rejected_rows)}")
            
            # Add more descriptive information about the import
            return Response({
                'message': message,
                'total_rows_in_csv': total_rows,
                'count': total_count,
                'created': len(created_objects),
                'updated': len(updated_objects),
                'rejected': len(rejected_rows),
                'rejected_details': rejected_rows[:10] if rejected_rows else [],  # Only return first 10 rejected rows
                'content_type': content_type,
                'detected_content_type': content_type,
                'detection_reason': detected_reason,
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import traceback
            print(f"CSV upload error: {str(e)}")
            print(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['GET'])
    def download_csv(self, request):
        """
        Download Instagram posts as CSV
        """
        try:
            # Filter by folder if specified
            folder_id = request.query_params.get('folder_id')
            content_type = request.query_params.get('content_type')
            
            posts = InstagramPost.objects.all()
            
            if folder_id:
                posts = posts.filter(folder_id=folder_id)
            
            if content_type:
                posts = posts.filter(content_type=content_type)
                filename = f"instagram_{content_type}s.csv"
            else:
                filename = "instagram_data.csv"
            
            # Create the HttpResponse object with explicit UTF-8 encoding and BOM
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            # Add UTF-8 BOM for better CSV compatibility
            response.write('\ufeff')
            
            # Create the CSV writer
            writer = csv.writer(response)
            
            # Write the header row
            writer.writerow([
                'url', 'user_posted', 'description', 'hashtags', 'num_comments',
                'date_posted', 'likes', 'photos', 'videos', 'location',
                'latest_comments', 'post_id', 'discovery_input', 'thumbnail',
                'content_type', 'platform_type', 'engagement_score', 'tagged_users', 'followers',
                'posts_count', 'profile_image_link', 'is_verified', 'is_paid_partnership'
            ])
            
            # Write the data rows with proper Unicode handling
            for post in posts:
                # Ensure all text fields are properly encoded
                def safe_text(value):
                    if value is None:
                        return ''
                    try:
                        # Ensure the value is a string and handle Unicode properly
                        text_value = str(value)
                        # Remove any null bytes or control characters that might cause issues
                        text_value = text_value.replace('\x00', '').replace('\r', '').replace('\n', ' ')
                        return text_value
                    except (UnicodeEncodeError, UnicodeDecodeError):
                        # If there are encoding issues, use replace mode
                        return str(value).encode('utf-8', errors='replace').decode('utf-8')
                
                writer.writerow([
                    safe_text(post.url),
                    safe_text(post.user_posted),
                    safe_text(post.description),
                    safe_text(post.hashtags),
                    post.num_comments,
                    post.date_posted,
                    safe_text(post.photos),
                    safe_text(post.videos),
                    safe_text(post.location),
                    safe_text(post.latest_comments),
                    safe_text(post.post_id),
                    safe_text(post.discovery_input),
                    safe_text(post.thumbnail),
                    safe_text(post.content_type),
                    safe_text(post.platform_type),
                    post.engagement_score,
                    safe_text(post.tagged_users),
                    post.followers,
                    post.posts_count,
                    safe_text(post.profile_image_link),
                    post.is_verified,
                    post.is_paid_partnership
                ])
            
            return response
        
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['GET'])
    def stats(self, request):
        """
        Get statistics about posts
        """
        try:
            folder_id = request.query_params.get('folder_id')
            
            # Base queryset
            queryset = self.get_queryset()
            if folder_id:
                queryset = queryset.filter(folder_id=folder_id)
            
            # Calculate statistics
            from django.db import models
            total_posts = queryset.count()
            unique_users = queryset.values('user_posted').distinct().count()
            avg_likes = queryset.aggregate(avg_likes=models.Avg('likes'))['avg_likes'] or 0
            avg_comments = queryset.aggregate(avg_comments=models.Avg('num_comments'))['avg_comments'] or 0
            verified_accounts = queryset.filter(is_verified=True).count()
            
            # Calculate average views for video content
            video_posts = queryset.filter(content_type='reel')
            avg_views = 0
            if video_posts.exists():
                avg_views = video_posts.aggregate(avg_views=models.Avg('views'))['avg_views'] or 0
            
            stats = {
                'totalPosts': total_posts,
                'uniqueUsers': unique_users,
                'avgLikes': round(avg_likes, 2),
                'avgComments': round(avg_comments, 2),
                'verifiedAccounts': verified_accounts,
                'avgViews': round(avg_views, 2),
            }
            
            return Response(stats, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error in posts stats view: {str(e)}")
            return Response(
                {'error': 'An error occurred while retrieving statistics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['POST'])
    def move_to_folder(self, request):
        """
        Move posts to a specific folder
        """
        try:
            post_ids = request.data.get('post_ids', [])
            folder_id = request.data.get('folder_id')
            
            if not post_ids:
                return Response({'error': 'No posts specified'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the target folder (or None for uncategorized)
            folder = None
            if folder_id:
                folder = get_object_or_404(Folder, id=folder_id)
            
            # Move the posts
            posts = InstagramPost.objects.filter(id__in=post_ids)
            count = posts.count()
            
            for post in posts:
                post.folder = folder
                post.save()
            
            folder_name = folder.name if folder else "uncategorized"
            return Response({
                'message': f'Successfully moved {count} posts to {folder_name}',
                'count': count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class InstagramCommentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Instagram Comments
    """
    serializer_class = InstagramCommentSerializer
    permission_classes = [AllowAny]  # For testing, use proper permissions in production
    
    def get_queryset(self):
        """
        Filter comments by post_id, comment_user, or date range
        """
        try:
            queryset = InstagramComment.objects.all()
            
            # Filter by post_id if specified
            post_id = self.request.query_params.get('post_id')
            if post_id:
                queryset = queryset.filter(post_id=post_id)
            
            # Filter by folder_id if specified
            folder_id = self.request.query_params.get('folder_id')
            if folder_id:
                queryset = queryset.filter(folder_id=folder_id)
            
            # Filter by comment_user if specified
            comment_user = self.request.query_params.get('comment_user')
            if comment_user:
                queryset = queryset.filter(comment_user__icontains=comment_user)
            
            # Filter by date range
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            
            if start_date:
                try:
                    start_datetime = self._parse_date(start_date)
                    if start_datetime:
                        queryset = queryset.filter(comment_date__gte=start_datetime)
                except Exception as e:
                    print(f"Error parsing start_date {start_date}: {e}")
            
            if end_date:
                try:
                    end_datetime = self._parse_date(end_date)
                    if end_datetime:
                        queryset = queryset.filter(comment_date__lte=end_datetime)
                except Exception as e:
                    print(f"Error parsing end_date {end_date}: {e}")
            
            # Add likes range filtering for comments
            min_likes = self.request.query_params.get('min_likes')
            max_likes = self.request.query_params.get('max_likes')
            
            if min_likes:
                try:
                    min_likes_int = int(min_likes)
                    queryset = queryset.filter(likes_number__gte=min_likes_int)
                except (ValueError, TypeError):
                    print(f"Error parsing min_likes {min_likes}")
            
            if max_likes:
                try:
                    max_likes_int = int(max_likes)
                    queryset = queryset.filter(likes_number__lte=max_likes_int)
                except (ValueError, TypeError):
                    print(f"Error parsing max_likes {max_likes}")
            
            # Add search functionality
            search_query = self.request.query_params.get('search', '')
            if search_query:
                search_filter = Q()
                search_filter |= Q(comment_user__icontains=search_query)
                search_filter |= Q(comment__icontains=search_query)
                search_filter |= Q(post_id__icontains=search_query)
                queryset = queryset.filter(search_filter)
            
            # Add sorting
            sort_by = self.request.query_params.get('sort_by', 'comment_date')
            sort_order = self.request.query_params.get('sort_order', 'desc')
            
            # Validate sort_by field to prevent injection
            allowed_sort_fields = {
                'comment_date', 'likes_number', 'replies_number', 'comment_user', 
                'post_id', 'comment'
            }
            
            if sort_by not in allowed_sort_fields:
                sort_by = 'comment_date'  # Default to comment_date if invalid field
            
            # Apply sorting
            if sort_order == 'desc':
                queryset = queryset.order_by(f'-{sort_by}')
            else:
                queryset = queryset.order_by(sort_by)
            
            return queryset
        except Exception as e:
            print(f"Error in get_queryset: {str(e)}")
            return InstagramComment.objects.none()
    
    def _parse_date(self, date_str):
        """Parse date string similar to the post viewset"""
        if not date_str or not date_str.strip() or date_str.strip() == '""':
            return None
        
        clean_date = date_str.strip().strip('"\'')
        if not clean_date:
            return None
        
        # Handle ISO format dates (like 2025-05-26T03:49:32.000Z)
        if 'T' in clean_date and (clean_date.endswith('Z') or '+' in clean_date):
            try:
                return datetime.datetime.fromisoformat(clean_date.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                pass
        
        try:
            if HAS_DATEPARSER:
                return dateparser.parse(clean_date, settings={
                    'TIMEZONE': 'UTC',
                    'RETURN_AS_TIMEZONE_AWARE': False,
                    'DATE_ORDER': 'YMD',
                })
            else:
                # Basic parsing for common formats
                formats_to_try = [
                    '%Y-%m-%dT%H:%M:%S.%fZ',
                    '%Y-%m-%dT%H:%M:%SZ',
                    '%Y-%m-%dT%H:%M:%S.%f',
                    '%Y-%m-%dT%H:%M:%S',
                    '%Y-%m-%d',
                    '%Y-%m-%d %H:%M:%S',
                ]
                
                for fmt in formats_to_try:
                    try:
                        return datetime.datetime.strptime(clean_date, fmt)
                    except ValueError:
                        continue
                        
                return None
        except Exception as e:
            print(f"Error parsing date '{clean_date}': {e}")
            return None
    
    @action(detail=False, methods=['GET'])
    def stats(self, request):
        """
        Get statistics about comments
        """
        try:
            post_id = request.query_params.get('post_id')
            folder_id = request.query_params.get('folder_id')
            
            # Base queryset
            queryset = self.get_queryset()
            if post_id:
                queryset = queryset.filter(post_id=post_id)
            if folder_id:
                queryset = queryset.filter(folder_id=folder_id)
            
            # Calculate statistics
            from django.db import models
            total_comments = queryset.count()
            unique_commenters = queryset.values('comment_user').distinct().count()
            avg_likes = queryset.aggregate(avg_likes=models.Avg('likes_number'))['avg_likes'] or 0
            avg_replies = queryset.aggregate(avg_replies=models.Avg('replies_number'))['avg_replies'] or 0
            
            stats = {
                'totalComments': total_comments,
                'uniqueCommenters': unique_commenters,
                'avgLikes': round(avg_likes, 2),
                'avgReplies': round(avg_replies, 2),
            }
            
            return Response(stats, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error in stats view: {str(e)}")
            return Response(
                {'error': 'An error occurred while retrieving statistics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['POST'])
    def upload_csv(self, request):
        """
        Upload CSV file and parse Instagram comment data
        """
        print("Instagram Comments Upload - Method called!")
        print(f"Request data: {dict(request.data)}")
        print(f"Request files: {list(request.FILES.keys())}")
        
        try:
            csv_file = request.FILES.get('file')
            if not csv_file:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            folder_id = request.data.get('folder_id')
            print(f"Folder ID from request: {folder_id}")
            
            folder = None
            if folder_id:
                try:
                    folder = Folder.objects.get(id=folder_id)
                    print(f"Found folder: {folder.name} (ID: {folder.id}, Category: {folder.category})")
                    # Verify this is a comments folder
                    if folder.category != 'comments':
                        print(f"ERROR: Folder category is '{folder.category}', not 'comments'")
                        return Response(
                            {'error': 'Selected folder is not configured for comments'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except Folder.DoesNotExist:
                    print(f"ERROR: Folder with ID {folder_id} does not exist")
                    return Response(
                        {'error': f'Folder with id {folder_id} does not exist'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Decode and parse CSV with comprehensive Unicode handling
            try:
                # Read the file content as bytes first
                csv_content_bytes = csv_file.read()
                
                # Try multiple encoding strategies
                decoded_file = None
                encoding_used = None
                
                # Strategy 1: UTF-8 with BOM
                try:
                    decoded_file = csv_content_bytes.decode('utf-8-sig')
                    encoding_used = 'utf-8-sig'
                except UnicodeDecodeError:
                    pass
                
                # Strategy 2: UTF-8
                if decoded_file is None:
                    try:
                        decoded_file = csv_content_bytes.decode('utf-8')
                        encoding_used = 'utf-8'
                    except UnicodeDecodeError:
                        pass
                
                # Strategy 3: Latin-1 (covers most Windows encodings)
                if decoded_file is None:
                    try:
                        decoded_file = csv_content_bytes.decode('latin1')
                        encoding_used = 'latin1'
                    except UnicodeDecodeError:
                        pass
                
                # Strategy 4: CP1252 with error replacement (last resort)
                if decoded_file is None:
                    decoded_file = csv_content_bytes.decode('cp1252', errors='replace')
                    encoding_used = 'cp1252-replace'
                
                print(f"CSV decoded using: {encoding_used}")
                
                # Clean up any problematic characters that might cause issues
                # Replace null bytes and normalize line endings
                decoded_file = decoded_file.replace('\x00', '').replace('\r\n', '\n').replace('\r', '\n')
                
                # Create StringIO object safely
                csv_string_io = io.StringIO(decoded_file)
                csv_data = csv.DictReader(csv_string_io)
                
            except Exception as e:
                safe_error = str(e).encode('ascii', errors='replace').decode('ascii')
                return Response(
                    {'error': f'Error reading CSV file. Please ensure it is properly encoded. Error: {safe_error}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            rows_processed = 0
            rows_added = 0
            rows_updated = 0
            rows_skipped = 0
            errors = []
            
            # Debug: Check CSV headers
            fieldnames = csv_data.fieldnames
            try:
                # Safe logging of CSV headers
                safe_fieldnames = str(fieldnames).encode('ascii', errors='replace').decode('ascii')
                print(f"CSV Headers: {safe_fieldnames}")
            except Exception as e:
                print(f"CSV Headers: [Unicode content - {len(fieldnames) if fieldnames else 0} columns]")
            
            for row in csv_data:
                # Skip empty rows
                if not row or all(not v for v in row.values()):
                    continue
                
                rows_processed += 1
                
                # Debug: Print first few rows with safe Unicode handling
                if rows_processed <= 3:
                    try:
                        # Create a safe version of row for printing
                        safe_row = {}
                        for key, value in row.items():
                            if isinstance(value, str) and value:
                                # Limit length and convert to ASCII for safe console output
                                safe_value = value[:50] if len(value) > 50 else value
                                safe_value = safe_value.encode('ascii', errors='replace').decode('ascii')
                                safe_row[key] = safe_value
                            else:
                                safe_row[key] = value
                        print(f"Row {rows_processed}: {safe_row}")
                    except Exception as e:
                        print(f"Row {rows_processed}: [Unicode content - unable to display safely]")
                
                # Check if this row has warning or error messages indicating no comments
                warning = row.get('warning', '').strip()
                error = row.get('error', '').strip()
                
                # Skip rows with specific warnings/errors that indicate no actual comment data
                if warning or error:
                    rows_skipped += 1
                    # Safe logging for warnings/errors
                    safe_warning_or_error = (warning or error).encode('ascii', errors='replace').decode('ascii')
                    print(f"Skipping row {rows_processed}: {safe_warning_or_error}")
                    continue
                
                # Extract and validate required fields
                comment_id = ''
                for key in ['comment_id', 'id']:
                    if key in row and row[key]:
                        comment_id = str(row[key]).strip().strip('"').strip("'")
                        break
                
                # Check if comment text exists
                comment_text = ''
                for key in ['comment', 'comment_text', 'text']:
                    if key in row and row[key]:
                        comment_text = str(row[key]).strip().strip('"').strip("'")
                        break
                
                # Skip rows with empty comment text (like njltheawesome row)
                if not comment_text:
                    rows_skipped += 1
                    print(f"Skipping row {rows_processed}: Empty comment text")
                    continue
                
                # Try to extract post_id from multiple possible sources
                post_id = ''
                for key in ['post_id', 'id']:
                    if key in row and row[key]:
                        post_id = str(row[key]).strip().strip('"').strip("'")
                        break
                
                # Debug: Print field extraction
                if rows_processed <= 3:
                    try:
                        # Safely print extracted fields with length limits and Unicode handling
                        safe_comment_id = str(comment_id)[:50] if comment_id else ''
                        safe_comment_preview = str(comment_text)[:50] if comment_text else ''
                        safe_post_id = str(post_id)[:50] if post_id else ''
                        # Remove problematic characters for printing and ensure safe console output
                        safe_comment_id = safe_comment_id.encode('ascii', errors='replace').decode('ascii')
                        safe_comment_preview = safe_comment_preview.encode('ascii', errors='replace').decode('ascii')
                        safe_post_id = safe_post_id.encode('ascii', errors='replace').decode('ascii')
                        print(f"Extracted comment_id: '{safe_comment_id}', comment: '{safe_comment_preview}', post_id: '{safe_post_id}'")
                    except Exception as e:
                        print(f"Debug print error for extracted fields: {e}")
                
                if not comment_id:
                    errors.append(f"Row {rows_processed}: Missing comment_id")
                    rows_skipped += 1
                    print(f"Skipping row {rows_processed}: Missing comment_id")
                    continue
                
                try:
                    # Parse date field - Instagram uses 'comment_date'
                    date_created_raw = row.get('comment_date', None)
                    parsed_date = None
                    if date_created_raw:
                        parsed_date = self._parse_date(date_created_raw)
                    
                    # Safe integer conversion
                    def safe_int(value, default=0):
                        try:
                            if value is None or value == '' or value == '""':
                                return default
                            # Handle string numbers
                            cleaned_value = str(value).strip().strip('"').strip("'")
                            if not cleaned_value:
                                return default
                            return int(float(cleaned_value))  # Convert via float to handle decimal strings
                        except (ValueError, TypeError):
                            return default
                    
                    # Extract fields with flexible key names and safe string handling
                    def get_field(row, *keys):
                        for key in keys:
                            if key in row and row[key] is not None:
                                try:
                                    value = str(row[key]).strip().strip('"').strip("'")
                                    # Clean problematic characters that might cause encoding issues
                                    # Replace null bytes and control characters
                                    value = value.replace('\x00', '').replace('\r', '').replace('\n', ' ')
                                    return value if value else ''
                                except (UnicodeEncodeError, UnicodeDecodeError):
                                    # Handle problematic Unicode characters
                                    try:
                                        value = str(row[key]).encode('utf-8', errors='replace').decode('utf-8').strip().strip('"').strip("'")
                                        # Clean problematic characters
                                        value = value.replace('\x00', '').replace('\r', '').replace('\n', ' ')
                                        return value if value else ''
                                    except:
                                        return ''
                        return ''
                    
                    # Try to find related Instagram post
                    instagram_post = None
                    if post_id:
                        try:
                            instagram_post = InstagramPost.objects.filter(post_id=post_id).first()
                        except:
                            pass
                    
                    # Parse JSON fields safely
                    def safe_json_parse(value):
                        if not value:
                            return None
                        try:
                            return json.loads(value)
                        except (json.JSONDecodeError, TypeError):
                            return value  # Return as string if not valid JSON
                    
                    # Prepare the comment data - map Instagram CSV fields to model fields
                    # Handle Unicode characters properly with comprehensive cleaning
                    def safe_text_processing(text):
                        if not text:
                            return ''
                        try:
                            # First, ensure we have a string
                            text_str = str(text)
                            # Clean null bytes and control characters
                            text_str = text_str.replace('\x00', '').replace('\r', '').replace('\n', ' ')
                            # Handle Unicode properly - keep original Unicode characters
                            return text_str.strip().strip('"').strip("'")
                        except Exception as e:
                            # Fallback: try to extract readable characters only
                            try:
                                safe_chars = ''.join(char for char in str(text) if ord(char) < 127 or ord(char) > 159)
                                return safe_chars.strip().strip('"').strip("'")
                            except:
                                return ''
                    
                    # Apply safe text processing to the comment
                    clean_comment_text = safe_text_processing(comment_text)
                    
                    comment_data = {
                        'comment_id': safe_text_processing(comment_id),
                        'folder': folder,
                        'instagram_post': instagram_post,
                        'post_id': safe_text_processing(post_id),
                        'post_url': safe_text_processing(get_field(row, 'post_url', 'url')),
                        'post_user': safe_text_processing(get_field(row, 'post_user')),
                        'comment': clean_comment_text,  # Already processed
                        'comment_date': parsed_date,
                        'comment_user': safe_text_processing(get_field(row, 'comment_user')),
                        'comment_user_url': safe_text_processing(get_field(row, 'comment_user_url')),
                        'likes_number': safe_int(row.get('likes_number', 0)),
                        'replies_number': safe_int(row.get('replies_number', 0)),
                        'replies': safe_json_parse(row.get('replies')),
                        'hashtag_comment': safe_text_processing(get_field(row, 'hashtag_comment')),
                        'tagged_users_in_comment': safe_json_parse(row.get('tagged_users_in_comment')),
                        'url': safe_text_processing(get_field(row, 'url')),
                    }
                    
                    # Debug: Print comment data for first few rows (with safe Unicode handling)
                    if rows_processed <= 3:
                        try:
                            # Create a safe version of comment_data for printing
                            safe_comment_data = {}
                            for key, value in comment_data.items():
                                if isinstance(value, str):
                                    # Limit length and ensure safe printing by converting to ASCII for console
                                    safe_value = value[:100] if len(value) > 100 else value
                                    safe_value = safe_value.encode('ascii', errors='replace').decode('ascii')
                                    safe_comment_data[key] = safe_value
                                else:
                                    safe_comment_data[key] = value
                            print(f"Comment data for row {rows_processed}: {safe_comment_data}")
                        except Exception as e:
                            print(f"Debug print error for row {rows_processed}: {e}")
                    
                    # Try to find existing comment
                    existing_comment = InstagramComment.objects.filter(
                        comment_id=comment_id,
                        folder=folder
                    ).first()
                    
                    if existing_comment:
                        # Update the existing record
                        for key, value in comment_data.items():
                            if key != 'folder':  # Don't update the folder field
                                setattr(existing_comment, key, value)
                        existing_comment.save()
                        rows_updated += 1
                        # Safe logging without Unicode characters that might cause console issues
                        safe_comment_id_for_log = str(comment_id).encode('ascii', errors='replace').decode('ascii')
                        print(f"Updated comment: {safe_comment_id_for_log}")
                    else:
                        # Create a new record
                        new_comment = InstagramComment.objects.create(**comment_data)
                        rows_added += 1
                        print(f"CREATED NEW COMMENT IN InstagramComment TABLE: ID={new_comment.id}, comment_id={new_comment.comment_id}")
                        # Safe logging without Unicode characters that might cause console issues
                        safe_comment_id_for_log = str(comment_id).encode('ascii', errors='replace').decode('ascii')
                        print(f"Created new comment: {safe_comment_id_for_log}")
                        
                except Exception as e:
                    # Create safe error message that won't cause encoding issues
                    try:
                        error_msg = f"Error processing row {rows_processed}: {str(e)}"
                        # Make the error message safe for both logging and response
                        safe_error_msg = error_msg.encode('ascii', errors='replace').decode('ascii')
                        errors.append(safe_error_msg)
                        rows_skipped += 1
                        print(safe_error_msg)
                    except Exception as encoding_error:
                        # Fallback error handling if even the safe encoding fails
                        safe_error_msg = f"Error processing row {rows_processed}: Unicode encoding error"
                        errors.append(safe_error_msg)
                        rows_skipped += 1
                        print(safe_error_msg)
                    continue
            
            # Prepare response
            response_data = {
                'status': 'success',
                'message': f'CSV processed successfully. {rows_processed} rows processed, {rows_added} added, {rows_updated} updated, {rows_skipped} skipped.',
                'rows_processed': rows_processed,
                'rows_added': rows_added,
                'rows_updated': rows_updated,
                'rows_skipped': rows_skipped,
            }
            
            if errors:
                response_data['errors'] = errors[:10]  # Limit number of errors returned
                response_data['total_errors'] = len(errors)
            
            # Safe logging of upload completion without Unicode characters
            try:
                safe_response_msg = str(response_data['message']).encode('ascii', errors='replace').decode('ascii')
                print(f"Upload completed: {safe_response_msg} (rows_processed: {response_data['rows_processed']}, rows_added: {response_data['rows_added']}, rows_updated: {response_data['rows_updated']}, rows_skipped: {response_data['rows_skipped']})")
            except Exception as e:
                print(f"Upload completed with some Unicode content. Rows processed: {response_data.get('rows_processed', 0)}")
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Create safe error message that won't cause encoding issues
            try:
                error_msg = f'Error processing CSV file: {str(e)}'
                safe_error_msg = error_msg.encode('ascii', errors='replace').decode('ascii')
                print(safe_error_msg)
                return Response(
                    {'error': safe_error_msg},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as encoding_error:
                # Fallback error handling if even the safe encoding fails
                fallback_error_msg = 'Error processing CSV file: Unicode encoding error occurred'
                print(fallback_error_msg)
                return Response(
                    {'error': fallback_error_msg},
                    status=status.HTTP_400_BAD_REQUEST
                )

    @action(detail=False, methods=['GET'])
    def download_csv(self, request):
        """
        Download comments as CSV
        """
        try:
            # Get filtered queryset
            comments = self.get_queryset()
            
            # Filter by folder_id if provided
            folder_id = request.query_params.get('folder_id')
            if folder_id:
                comments = comments.filter(folder_id=folder_id)
            
            # Create CSV response with explicit UTF-8 encoding and BOM
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="instagram_comments_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            
            # Add UTF-8 BOM for better CSV compatibility
            response.write('\ufeff')
            
            # Create CSV writer and write header
            writer = csv.writer(response)
            writer.writerow([
                'comment_id', 'post_id', 'post_url', 'post_user', 'comment_user', 'comment_user_url',
                'comment', 'comment_date', 'likes_number', 'replies_number', 'hashtag_comment',
                'tagged_users_in_comment', 'url'
            ])
            
            # Write data rows with proper Unicode handling
            for comment in comments:
                comment_date_str = comment.comment_date.isoformat() if comment.comment_date else ''
                
                # Convert JSON fields to strings safely
                tagged_users_str = json.dumps(comment.tagged_users_in_comment, ensure_ascii=False) if comment.tagged_users_in_comment else ''
                
                # Ensure all text fields are properly encoded
                def safe_text(value):
                    if value is None:
                        return ''
                    try:
                        # Ensure the value is a string and handle Unicode properly
                        text_value = str(value)
                        # Remove any null bytes or control characters that might cause issues
                        text_value = text_value.replace('\x00', '').replace('\r', '').replace('\n', ' ')
                        return text_value
                    except (UnicodeEncodeError, UnicodeDecodeError):
                        # If there are encoding issues, use replace mode
                        return str(value).encode('utf-8', errors='replace').decode('utf-8')
                
                writer.writerow([
                    safe_text(comment.comment_id),
                    safe_text(comment.post_id),
                    safe_text(comment.post_url),
                    safe_text(comment.post_user),
                    safe_text(comment.comment_user),
                    safe_text(comment.comment_user_url),
                    safe_text(comment.comment),
                    comment_date_str,
                    comment.likes_number,
                    comment.replies_number,
                    safe_text(comment.hashtag_comment),
                    tagged_users_str,
                    safe_text(comment.url)
                ])
            
            return response
        
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CommentScrapingJobViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Instagram Comment Scraping Jobs
    """
    serializer_class = CommentScrapingJobSerializer
    permission_classes = [AllowAny]  # For testing, use proper permissions in production
    
    def get_queryset(self):
        """
        Filter jobs by project if specified
        """
        try:
            queryset = CommentScrapingJob.objects.all()
            
            # Filter by project_id if specified
            project_id = self.request.query_params.get('project')
            if project_id:
                queryset = queryset.filter(project_id=project_id)
            
            return queryset.order_by('-created_at')
        except Exception as e:
            print(f"Error in get_queryset: {str(e)}")
            return CommentScrapingJob.objects.none()
    
    @action(detail=False, methods=['POST'])
    def create_job(self, request):
        """
        Create and execute a new Instagram comment scraping job
        """
        try:
            # Get request data
            name = request.data.get('name')
            project_id = request.data.get('project_id')
            selected_folders = request.data.get('selected_folders', [])
            result_folder_name = request.data.get('result_folder_name')
            
            # Validate required fields
            if not name:
                return Response(
                    {'error': 'Job name is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not result_folder_name:
                return Response(
                    {'error': 'Result folder name is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not selected_folders or not isinstance(selected_folders, list):
                return Response(
                    {'error': 'At least one folder must be selected'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if folders exist and contain posts
            existing_folders = Folder.objects.filter(
                id__in=selected_folders,
                category__in=['posts', 'reels']  # Only post/reel folders can be used for comment scraping
            )
            
            if len(existing_folders) != len(selected_folders):
                return Response(
                    {'error': 'One or more selected folders do not exist or are not post/reel folders'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if folders have posts
            total_posts = InstagramPost.objects.filter(
                folder_id__in=selected_folders
            ).exclude(url__isnull=True).exclude(url__exact='').count()
            
            if total_posts == 0:
                return Response(
                    {'error': 'Selected folders do not contain any posts with valid URLs'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create and execute the job
            job, success = create_and_execute_instagram_comment_scraping_job(
                name=name,
                project_id=project_id,
                selected_folders=selected_folders,
                result_folder_name=result_folder_name
            )
            
            # Serialize the job data
            serializer = CommentScrapingJobSerializer(job)
            
            return Response({
                'success': success,
                'message': 'Instagram comment scraping job created and submitted successfully' if success else 'Job created but submission failed',
                'job': serializer.data,
                'total_posts_found': total_posts
            }, status=status.HTTP_201_CREATED if success else status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            print(f"Error creating Instagram comment scraping job: {str(e)}")
            return Response(
                {'error': f'An error occurred while creating the job: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['POST'])
    def process_webhook(self, request):
        """
        Process webhook data from BrightData for Instagram comments
        """
        try:
            webhook_data = request.data
            
            if not isinstance(webhook_data, list):
                return Response({'error': 'Webhook data must be a list'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Import the service
            from .services import InstagramCommentScraper
            
            # Get job_id from query parameters if available
            job_id = request.query_params.get('job_id')
            if job_id:
                try:
                    job_id = int(job_id)
                except (ValueError, TypeError):
                    job_id = None
            
            # Process the webhook data
            scraper = InstagramCommentScraper()
            result = scraper.process_comment_webhook_data(webhook_data, job_id=job_id)
            
            if result['success']:
                return Response({
                    'message': 'Instagram comment webhook data processed successfully',
                    'result': result
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Error processing Instagram comment webhook data',
                    'result': result
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            print(f"Error processing Instagram comment webhook: {str(e)}")
