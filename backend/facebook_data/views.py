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
from .models import FacebookPost, Folder, FacebookComment, CommentScrapingJob
from .serializers import FacebookPostSerializer, FolderSerializer, FacebookCommentSerializer, CommentScrapingJobSerializer
from django.db.models import Q
from django.db import models

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
    API endpoint for managing Facebook data folders
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
                
                # First, try to find a Facebook folder with this ID
                try:
                    return Folder.objects.get(id=folder_id_int)
                except Folder.DoesNotExist:
                    # It might be a UnifiedRunFolder ID, try to find the linked Facebook folder
                    from track_accounts.models import UnifiedRunFolder
                    try:
                        unified_folder = UnifiedRunFolder.objects.get(id=folder_id_int)
                        
                        # Find Facebook folders linked to this UnifiedRunFolder
                        linked_facebook_folders = Folder.objects.filter(unified_job_folder=unified_folder)
                        
                        if linked_facebook_folders.exists():
                            # Use the first linked Facebook folder
                            return linked_facebook_folders.first()
                        else:
                            from rest_framework.exceptions import NotFound
                            raise NotFound(f"No Facebook folder linked to UnifiedRunFolder {folder_id_int}")
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
            
            print(f"=== FACEBOOK FOLDER DELETE DEBUG ===")
            print(f"Deleting folder: {folder.name} (ID: {folder.id}, Category: {folder.category})")
            
            # Move all content in this folder to uncategorized (folder=None) before deletion
            if folder.category == 'posts':
                posts_moved = FacebookPost.objects.filter(folder=folder).update(folder=None)
                print(f"Moved {posts_moved} posts to uncategorized")
            elif folder.category == 'reels':
                reels_moved = FacebookPost.objects.filter(folder=folder, content_type='reel').update(folder=None)
                print(f"Moved {reels_moved} reels to uncategorized")
            elif folder.category == 'comments':
                comments_moved = FacebookComment.objects.filter(folder=folder).update(folder=None)
                print(f"Moved {comments_moved} comments to uncategorized")
            
            # Delete the folder
            folder.delete()
            print(f"Folder deleted successfully")
            print(f"=== END FACEBOOK FOLDER DELETE DEBUG ===")
            
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
                # Return Facebook posts (excluding reels)
                posts = FacebookPost.objects.filter(folder=folder).exclude(content_type='reel')
                
                # Apply search if provided
                search_query = request.query_params.get('search', '')
                if search_query:
                    search_filter = Q()
                    available_fields = [f.name for f in FacebookPost._meta.get_fields()]
                    
                    if 'user_posted' in available_fields:
                        search_filter |= Q(user_posted__icontains=search_query)
                    if 'content' in available_fields:
                        search_filter |= Q(content__icontains=search_query)
                    if 'hashtags' in available_fields:
                        search_filter |= Q(hashtags__icontains=search_query)
                    if 'page_name' in available_fields:
                        search_filter |= Q(page_name__icontains=search_query)
                    
                    if search_filter:
                        posts = posts.filter(search_filter)
                
                # Paginate results
                page = self.paginate_queryset(posts)
                if page is not None:
                    serializer = FacebookPostSerializer(page, many=True)
                    return self.get_paginated_response(serializer.data)
                
                serializer = FacebookPostSerializer(posts, many=True)
                return Response({
                    'category': 'posts',
                    'results': serializer.data
                })
                
            elif folder.category == 'reels':
                # Return Facebook reels
                reels = FacebookPost.objects.filter(folder=folder, content_type='reel')
                
                # Apply search if provided
                search_query = request.query_params.get('search', '')
                if search_query:
                    search_filter = Q()
                    available_fields = [f.name for f in FacebookPost._meta.get_fields()]
                    
                    if 'user_posted' in available_fields:
                        search_filter |= Q(user_posted__icontains=search_query)
                    if 'content' in available_fields:
                        search_filter |= Q(content__icontains=search_query)
                    if 'hashtags' in available_fields:
                        search_filter |= Q(hashtags__icontains=search_query)
                    if 'page_name' in available_fields:
                        search_filter |= Q(page_name__icontains=search_query)
                    
                    if search_filter:
                        reels = reels.filter(search_filter)
                
                # Paginate results
                page = self.paginate_queryset(reels)
                if page is not None:
                    serializer = FacebookPostSerializer(page, many=True)
                    return self.get_paginated_response(serializer.data)
                
                serializer = FacebookPostSerializer(reels, many=True)
                return Response({
                    'category': 'reels',
                    'results': serializer.data
                })
                
            elif folder.category == 'comments':
                # Return Facebook comments
                comments = FacebookComment.objects.filter(folder=folder)
                
                # Apply search if provided
                search_query = request.query_params.get('search', '')
                if search_query:
                    search_filter = Q()
                    search_filter |= Q(user_name__icontains=search_query)
                    search_filter |= Q(comment_text__icontains=search_query)
                    search_filter |= Q(post_id__icontains=search_query)
                    comments = comments.filter(search_filter)
                
                # Paginate results
                page = self.paginate_queryset(comments)
                if page is not None:
                    serializer = FacebookCommentSerializer(page, many=True)
                    return self.get_paginated_response(serializer.data)
                
                serializer = FacebookCommentSerializer(comments, many=True)
                return Response({
                    'category': 'comments',
                    'results': serializer.data
                })
            
            else:
                return Response({'error': 'Unknown folder category'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class FacebookPostViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Facebook Posts
    """
    serializer_class = FacebookPostSerializer
    permission_classes = [AllowAny]  # Allow any user to access these endpoints for testing
    
    def get_queryset(self):
        """
        Filter posts by folder if folder_id is provided
        """
        # Always use a try-except block for database queries
        try:
            queryset = FacebookPost.objects.all()
            
            # Filter by folder if specified
            folder_id = self.request.query_params.get('folder_id')
            if folder_id:
                try:
                    folder_id_int = int(folder_id)
                    
                    # First, try to find a Facebook folder with this ID
                    from .models import Folder
                    facebook_folder = Folder.objects.filter(id=folder_id_int).first()
                    
                    if facebook_folder:
                        # It's a direct Facebook folder ID
                        queryset = queryset.filter(folder_id=folder_id_int)
                    else:
                        # It might be a UnifiedRunFolder ID, try to find the linked Facebook folder
                        from track_accounts.models import UnifiedRunFolder
                        unified_folder = UnifiedRunFolder.objects.filter(id=folder_id_int).first()
                        
                        if unified_folder:
                            # Find Facebook folders linked to this UnifiedRunFolder
                            linked_facebook_folders = Folder.objects.filter(unified_job_folder=unified_folder)
                            
                            if linked_facebook_folders.exists():
                                # Use the first linked Facebook folder
                                facebook_folder_ids = [f.id for f in linked_facebook_folders]
                                queryset = queryset.filter(folder_id__in=facebook_folder_ids)
                            else:
                                # No linked Facebook folder found, return empty queryset
                                queryset = FacebookPost.objects.none()
                        else:
                            # Neither Facebook folder nor UnifiedRunFolder found, return empty queryset
                            queryset = FacebookPost.objects.none()
                            
                except (ValueError, TypeError):
                    # Invalid folder_id format, return empty queryset
                    queryset = FacebookPost.objects.none()
            
            # Check if content_type field exists before filtering
            content_type = self.request.query_params.get('content_type')
            if content_type and 'content_type' in [f.name for f in FacebookPost._meta.get_fields()]:
                queryset = queryset.filter(content_type=content_type)
            
            # Add search functionality
            search_query = self.request.query_params.get('search', '')
            if search_query:
                # Build a dynamic Q object with fields that exist in the model
                search_filter = Q()
                available_fields = [f.name for f in FacebookPost._meta.get_fields()]
                
                # Check each field individually to avoid errors with missing fields
                if 'user_posted' in available_fields:
                    search_filter |= Q(user_posted__icontains=search_query)
                
                if 'description' in available_fields:
                    search_filter |= Q(description__icontains=search_query)
                
                if 'content' in available_fields:
                    search_filter |= Q(content__icontains=search_query)
                
                if 'hashtags' in available_fields:
                    search_filter |= Q(hashtags__icontains=search_query)
                
                if 'content_type' in available_fields:
                    search_filter |= Q(content_type__icontains=search_query)
                
                if 'post_id' in available_fields:
                    search_filter |= Q(post_id__icontains=search_query)
                
                if 'page_name' in available_fields:
                    search_filter |= Q(page_name__icontains=search_query)
                
                # Apply the search filter if we have any valid conditions
                if search_filter:
                    queryset = queryset.filter(search_filter)
            
            return queryset
        except Exception as e:
            # Log the error and return empty queryset
            print(f"Error in get_queryset: {str(e)}")
            return FacebookPost.objects.none()

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
        
        # Special handling for ISO format dates (like 2025-04-18T02:01:22.000Z)
        if 'T' in clean_date and (clean_date.endswith('Z') or '+' in clean_date):
            try:
                # Use Python's built-in ISO parser for efficiency
                from datetime import datetime
                return datetime.fromisoformat(clean_date.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                # If that fails, continue with the regular parsing methods
                print(f"ISO format detection failed for: {clean_date}")
                pass
        
        # Detect and fix common Facebook date formats
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
                # Use dateparser if available with specific settings for Facebook
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
                    '%Y-%m-%dT%H:%M:%S.%fZ', # 2025-04-18T02:01:22.000Z
                    '%Y-%m-%dT%H:%M:%SZ',    # 2025-04-18T02:01:22Z
                    '%Y-%m-%dT%H:%M:%S.%f',  # 2025-04-18T02:01:22.000
                    '%Y-%m-%dT%H:%M:%S',     # 2025-04-18T02:01:22
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
            print(f"Error parsing date '{clean_date}': {e}")
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
            
            # Decode and parse CSV with proper encoding handling
            try:
                # Try UTF-8 first, then UTF-8 with BOM, then fallback to other encodings
                try:
                    decoded_file = csv_file.read().decode('utf-8-sig')
                except UnicodeDecodeError:
                    csv_file.seek(0)  # Reset file pointer
                    try:
                        decoded_file = csv_file.read().decode('utf-8')
                    except UnicodeDecodeError:
                        csv_file.seek(0)  # Reset file pointer
                        try:
                            decoded_file = csv_file.read().decode('latin1')
                        except UnicodeDecodeError:
                            csv_file.seek(0)  # Reset file pointer
                            decoded_file = csv_file.read().decode('cp1252', errors='replace')
                
                # Clean up any problematic characters that might cause issues
                # Replace null bytes and other control characters
                decoded_file = decoded_file.replace('\x00', '').replace('\r\n', '\n').replace('\r', '\n')
                
            except Exception as e:
                return Response(
                    {'error': f'Error reading CSV file. Please ensure it is a valid UTF-8 encoded CSV file. Error: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            csv_data = csv.DictReader(io.StringIO(decoded_file))
            
            # Auto-detect content type based on CSV headers
            headers = set(csv_data.fieldnames or [])
            
            # Define unique fields for each content type
            post_unique_fields = {'num_likes_type', 'original_post', 'attachments', 'post_type', 'post_external_link'}
            reel_unique_fields = {'video_view_count', 'length', 'audio', 'thumbnail'}
            
            # Detect content type based on presence of unique fields
            post_matches = len(headers.intersection(post_unique_fields))
            reel_matches = len(headers.intersection(reel_unique_fields))
            
            if reel_matches > post_matches:
                content_type = 'reel'
                detected_reason = f"Detected as reel (found {reel_matches} reel-specific fields: {headers.intersection(reel_unique_fields)})"
            else:
                content_type = 'post'
                detected_reason = f"Detected as post (found {post_matches} post-specific fields: {headers.intersection(post_unique_fields)})"
            
            print(f"Auto-detection result: {detected_reason}")
            
            rows_processed = 0
            rows_added = 0
            rows_updated = 0
            rows_skipped = 0
            errors = []
            
            for row in csv_data:
                # Skip empty rows
                if not row or all(not v for v in row.values()):
                    continue
                
                rows_processed += 1
                
                # Debug: Print first few rows
                if rows_processed <= 3:
                    print(f"Row {rows_processed}: {dict(row)}")
                
                # Check if this row has warning or error messages indicating no comments
                warning = row.get('warning', '').strip()
                error = row.get('error', '').strip()
                
                # Skip rows with specific warnings/errors that indicate no actual comment data
                if warning in ['This post has no comments.', 'For this type of posts (reels) comments are not available.'] or \
                   error in ['Crawl failed after multiple attempts, please try again later']:
                    rows_skipped += 1
                    print(f"Skipping row {rows_processed}: {warning or error}")
                    continue
                
                # Extract and validate required fields - be flexible with field extraction
                comment_id = ''
                for key in ['comment_id', 'id']:
                    if key in row and row[key]:
                        comment_id = str(row[key]).strip().strip('"').strip("'")
                        break
                
                # Check if comment text exists
                comment_text = ''
                for key in ['comment_text', 'text', 'content', 'comment']:
                    if key in row and row[key]:
                        comment_text = str(row[key]).strip().strip('"').strip("'")
                        break
                
                # Skip rows with empty comment text
                if not comment_text:
                    rows_skipped += 1
                    print(f"Skipping row {rows_processed}: Empty comment text")
                    continue
                
                # Try to extract post_id from multiple possible sources
                post_id = ''
                for key in ['post_id', 'id', 'original_post_id']:
                    if key in row and row[key]:
                        post_id = str(row[key]).strip().strip('"').strip("'")
                        break
                
                # Debug: Print field extraction
                if rows_processed <= 3:
                    print(f"Extracted comment_id: '{comment_id}', comment_text: '{comment_text}', post_id: '{post_id}'")
                
                if not comment_id:
                    errors.append(f"Row {rows_processed}: Missing comment_id")
                    rows_skipped += 1
                    print(f"Skipping row {rows_processed}: Missing comment_id")
                    continue
                
                try:
                    # Parse date field
                    date_created_raw = row.get('date_created', None)
                    parsed_date = None
                    if date_created_raw:
                        try:
                            # Try parsing with dateutil first
                            from dateutil import parser as date_parser
                            parsed_date = date_parser.parse(str(date_created_raw))
                        except (ValueError, TypeError, ImportError):
                            # Fallback parsing
                            try:
                                parsed_date = datetime.datetime.fromisoformat(str(date_created_raw).replace('Z', '+00:00'))
                            except (ValueError, TypeError):
                                print(f"Could not parse date_created: {date_created_raw}")
                    
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
                                    return value if value else ''
                                except (UnicodeEncodeError, UnicodeDecodeError):
                                    # Handle problematic Unicode characters
                                    try:
                                        value = str(row[key]).encode('utf-8', errors='replace').decode('utf-8').strip().strip('"').strip("'")
                                        return value if value else ''
                                    except:
                                        return ''
                        return ''
                    
                    # Try to find related Facebook post
                    facebook_post = None
                    if post_id:
                        try:
                            facebook_post = FacebookPost.objects.filter(post_id=post_id).first()
                        except FacebookPost.DoesNotExist:
                            pass
                    
                    # Handle Unicode characters properly in comment text
                    try:
                        clean_comment_text = comment_text.encode('utf-8', errors='replace').decode('utf-8')
                    except:
                        clean_comment_text = comment_text
                    
                    # Prepare the comment data
                    comment_data = {
                        'comment_id': comment_id,
                        'folder': folder,
                        'facebook_post': facebook_post,
                        'url': get_field(row, 'url', 'post_url'),
                        'post_id': post_id,
                        'post_url': get_field(row, 'post_url', 'url'),
                        'user_name': get_field(row, 'user_name', 'username'),
                        'user_id': get_field(row, 'user_id', 'userid'),
                        'user_url': get_field(row, 'user_url', 'profile_url'),
                        'commentator_profile': get_field(row, 'commentator_profile', 'profile'),
                        'comment_text': clean_comment_text,
                        'date_created': parsed_date,
                        'comment_link': get_field(row, 'comment_link', 'link'),
                        'num_likes': safe_int(row.get('num_likes', 0)),
                        'num_replies': safe_int(row.get('num_replies', 0)),
                        'attached_files': get_field(row, 'attached_files', 'attachments'),
                        'video_length': safe_int(row.get('video_length')) if row.get('video_length') else None,
                        'source_type': get_field(row, 'source_type', 'type'),
                        'subtype': get_field(row, 'subtype'),
                        'type': get_field(row, 'type', 'comment_type'),
                    }
                    
                    # Debug: Print comment data for first few rows
                    if rows_processed <= 3:
                        print(f"Comment data for row {rows_processed}: {comment_data}")
                    
                    # Try to find existing comment
                    existing_comment = FacebookComment.objects.filter(
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
                        print(f"Updated comment: {comment_id}")
                    else:
                        # Create a new record
                        new_comment = FacebookComment.objects.create(**comment_data)
                        rows_added += 1
                        print(f"Created new comment: {comment_id}")
                        
                except Exception as e:
                    error_msg = f"Error processing row {rows_processed}: {str(e)}"
                    errors.append(error_msg)
                    rows_skipped += 1
                    print(error_msg)
                    # Continue processing other rows
                    continue
            
            # Prepare response
            response_data = {
                'status': 'success',
                'message': f'CSV processed successfully. {rows_processed} rows processed, {rows_added} added, {rows_updated} updated, {rows_skipped} skipped.',
                'rows_processed': rows_processed,
                'rows_added': rows_added,
                'rows_updated': rows_updated,
                'rows_skipped': rows_skipped,
                'detected_content_type': content_type,
                'detection_reason': detected_reason,
            }
            
            if errors:
                response_data['errors'] = errors[:10]  # Limit number of errors returned
                response_data['total_errors'] = len(errors)
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error processing CSV file: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['GET'])
    def stats(self, request):
        """
        Get statistics for posts in a folder
        """
        try:
            folder_id = request.query_params.get('folder_id')
            if not folder_id:
                return Response(
                    {'error': 'folder_id parameter is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                folder = Folder.objects.get(id=folder_id)
            except Folder.DoesNotExist:
                return Response(
                    {'error': f'Folder with id {folder_id} does not exist'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get all posts in the folder
            posts = FacebookPost.objects.filter(folder=folder)
            
            # Count total posts
            total_posts = posts.count()
            
            # Count unique posters - check if user_posted field exists
            available_fields = [f.name for f in FacebookPost._meta.get_fields()]
            
            unique_users = 0
            if 'user_posted' in available_fields:
                unique_users = posts.values('user_posted').distinct().count()
            elif 'page_name' in available_fields:
                unique_users = posts.values('page_name').distinct().count()
            
            # Calculate average likes - check if likes field exists
            avg_likes = 0
            if 'likes' in available_fields:
                try:
                    avg_likes = posts.values_list('likes', flat=True).aggregate(
                        avg_likes=models.Avg('likes')
                    )['avg_likes'] or 0
                except Exception as e:
                    print(f"Error calculating average likes: {str(e)}")
            
            # Count verified accounts - check if is_verified field exists
            verified_accounts = 0
            if 'is_verified' in available_fields:
                try:
                    if 'user_posted' in available_fields:
                        verified_accounts = posts.filter(is_verified=True).values('user_posted').distinct().count()
                    elif 'page_name' in available_fields:
                        verified_accounts = posts.filter(is_verified=True).values('page_name').distinct().count()
                except Exception as e:
                    print(f"Error counting verified accounts: {str(e)}")
            
            stats = {
                'totalPosts': total_posts,
                'uniqueUsers': unique_users,
                'avgLikes': round(avg_likes, 2) if isinstance(avg_likes, (int, float)) else 0,
                'verifiedAccounts': verified_accounts,
            }
            
            return Response(stats, status=status.HTTP_200_OK)
        except Exception as e:
            # Log the error and return a friendly message
            print(f"Error in stats view: {str(e)}")
            return Response(
                {'error': 'An error occurred while retrieving statistics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['GET'])
    def download_csv(self, request):
        """
        Download posts as CSV
        """
        try:
            # Get query parameters
            folder_id = request.query_params.get('folder_id')
            content_type = request.query_params.get('content_type')
            
            # Build query
            query = {}
            if folder_id:
                query['folder_id'] = folder_id
            if content_type:
                query['content_type'] = content_type
            
            # Get posts
            posts = FacebookPost.objects.filter(**query).order_by('-date_posted')
            
            # Create CSV response with explicit UTF-8 encoding and BOM
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="facebook_data_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            
            # Add UTF-8 BOM for better CSV compatibility
            response.write('\ufeff')
            
            # Create CSV writer and write header
            writer = csv.writer(response)
            
            # Use different headers based on content type
            if content_type == 'reel':
                writer.writerow([
                    'url', 'post_id', 'user_url', 'user_username_raw', 'content', 'date_posted', 'hashtags',
                    'num_comments', 'num_shares', 'video_view_count', 'likes', 'page_name', 'profile_id',
                    'page_intro', 'page_category', 'page_logo', 'page_external_website', 'page_likes',
                    'page_followers', 'page_is_verified', 'thumbnail', 'external_link', 'page_url',
                    'header_image', 'avatar_image_url', 'profile_handle', 'shortcode', 'length', 'audio',
                    'num_of_posts', 'posts_to_not_include', 'until_date', 'from_date', 'start_date',
                    'end_date', 'timestamp', 'input', 'error', 'error_code', 'warning', 'warning_code'
                ])
            else:  # Post
                writer.writerow([
                    'url', 'post_id', 'user_url', 'user_username_raw', 'content', 'date_posted', 'hashtags',
                    'num_comments', 'num_shares', 'num_likes_type', 'page_name', 'profile_id',
                    'page_intro', 'page_category', 'page_logo', 'page_external_website', 'page_likes',
                    'page_followers', 'page_is_verified', 'original_post', 'attachments_data', 'other_posts_url',
                    'post_external_link', 'post_external_title', 'post_external_image', 'page_url',
                    'header_image', 'avatar_image_url', 'profile_handle', 'has_handshake', 'is_sponsored',
                    'sponsor_name', 'shortcode', 'video_view_count', 'likes', 'days_range', 'num_of_posts',
                    'post_image', 'posts_to_not_include', 'until_date', 'from_date', 'post_type',
                    'following', 'start_date', 'end_date', 'link_description_text', 'count_reactions_type',
                    'is_page', 'include_profile_data', 'page_phone', 'page_email', 'page_creation_time',
                    'page_reviews_score', 'page_reviewers_amount', 'page_price_range', 'about',
                    'active_ads_urls', 'delegate_page_id', 'timestamp', 'input', 'error', 'error_code',
                    'warning', 'warning_code'
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
                
                # Convert JSON fields to strings if needed
                def safe_json_stringify(field_value):
                    """Safely convert any value to a JSON string or return empty string"""
                    if not field_value:
                        return ''
                    
                    if isinstance(field_value, str):
                        # If it looks like JSON but isn't valid, return as is
                        if (field_value.startswith('{') and field_value.endswith('}')) or \
                           (field_value.startswith('[') and field_value.endswith(']')):
                            try:
                                # Try to validate it by parsing and re-stringifying
                                parsed = json.loads(field_value)
                                return json.dumps(parsed, ensure_ascii=False)
                            except json.JSONDecodeError:
                                # Just return as is if it looks like JSON but isn't valid
                                return safe_text(field_value)
                        else:
                            # Regular string, return as is
                            return safe_text(field_value)
                    
                    # Try to convert to JSON
                    try:
                        return json.dumps(field_value, ensure_ascii=False)
                    except (TypeError, ValueError):
                        # If all else fails, convert to string
                        return safe_text(field_value)
                
                num_likes_type_str = safe_json_stringify(post.num_likes_type)
                count_reactions_type_str = safe_json_stringify(post.count_reactions_type)
                attachments_data_str = safe_json_stringify(post.attachments_data)
                original_post_str = safe_json_stringify(post.original_post)
                active_ads_urls_str = safe_json_stringify(post.active_ads_urls)
                input_str = safe_json_stringify(post.input)
                
                # Format dates
                date_posted_str = post.date_posted.isoformat() if post.date_posted else ''
                page_creation_time_str = post.page_creation_time.isoformat() if post.page_creation_time else ''
                until_date_str = post.until_date.isoformat() if post.until_date else ''
                from_date_str = post.from_date.isoformat() if post.from_date else ''
                start_date_str = post.start_date.isoformat() if post.start_date else ''
                end_date_str = post.end_date.isoformat() if post.end_date else ''
                timestamp_str = post.timestamp.isoformat() if post.timestamp else ''
                
                # Write row based on content type
                if post.content_type == 'reel':
                    writer.writerow([
                        safe_text(post.url), safe_text(post.post_id), safe_text(post.user_url), 
                        safe_text(post.user_username_raw), safe_text(post.content),
                        date_posted_str, safe_text(post.hashtags), post.num_comments, post.num_shares,
                        post.video_view_count, post.likes, safe_text(post.page_name), safe_text(post.profile_id),
                        safe_text(post.page_intro), safe_text(post.page_category), safe_text(post.page_logo), 
                        safe_text(post.page_external_website), post.page_likes, post.page_followers, 
                        post.page_is_verified, safe_text(post.thumbnail), safe_text(post.external_link), 
                        safe_text(post.page_url), safe_text(post.header_image), safe_text(post.avatar_image_url),
                        safe_text(post.profile_handle), safe_text(post.shortcode), safe_text(post.length), 
                        safe_text(post.audio), post.num_of_posts, safe_text(post.posts_to_not_include), 
                        until_date_str, from_date_str, start_date_str, end_date_str, timestamp_str, 
                        input_str, safe_text(post.error), safe_text(post.error_code), safe_text(post.warning), 
                        safe_text(post.warning_code)
                    ])
                else:  # Post
                    writer.writerow([
                        safe_text(post.url), safe_text(post.post_id), safe_text(post.user_url), 
                        safe_text(post.user_username_raw), safe_text(post.content), date_posted_str, 
                        safe_text(post.hashtags), post.num_comments, post.num_shares, num_likes_type_str, 
                        safe_text(post.page_name), safe_text(post.profile_id), safe_text(post.page_intro),
                        safe_text(post.page_category), safe_text(post.page_logo), safe_text(post.page_external_website), 
                        post.page_likes, post.page_followers, post.page_is_verified, original_post_str, 
                        attachments_data_str, safe_text(post.other_posts_url), safe_text(post.post_external_link), 
                        safe_text(post.post_external_title), safe_text(post.post_external_image), 
                        safe_text(post.page_url), safe_text(post.header_image), safe_text(post.avatar_image_url),
                        safe_text(post.profile_handle), post.has_handshake, post.is_sponsored, 
                        safe_text(post.sponsor_name), safe_text(post.shortcode), post.video_view_count, 
                        post.likes, post.days_range, post.num_of_posts, safe_text(post.post_image), 
                        safe_text(post.posts_to_not_include), until_date_str, from_date_str, 
                        safe_text(post.post_type), post.following, start_date_str, end_date_str,
                        safe_text(post.link_description_text), count_reactions_type_str, post.is_page,
                        post.include_profile_data, safe_text(post.page_phone), safe_text(post.page_email), 
                        page_creation_time_str, post.page_reviews_score, post.page_reviewers_amount, 
                        safe_text(post.page_price_range), safe_text(post.about), active_ads_urls_str, 
                        safe_text(post.delegate_page_id), timestamp_str, input_str, safe_text(post.error), 
                        safe_text(post.error_code), safe_text(post.warning), safe_text(post.warning_code)
                    ])
            
            return response
        
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class FacebookCommentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Facebook Comments
    """
    serializer_class = FacebookCommentSerializer
    permission_classes = [AllowAny]  # For testing, use proper permissions in production
    
    def get_queryset(self):
        """
        Filter comments by post_id, user_name, or date range
        """
        try:
            queryset = FacebookComment.objects.all()
            
            # Filter by post_id if specified
            post_id = self.request.query_params.get('post_id')
            if post_id:
                queryset = queryset.filter(post_id=post_id)
            
            # Filter by user_name if specified
            user_name = self.request.query_params.get('user_name')
            if user_name:
                queryset = queryset.filter(user_name__icontains=user_name)
            
            # Filter by date range
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            
            if start_date:
                try:
                    start_date_obj = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
                    queryset = queryset.filter(date_created__gte=start_date_obj)
                except ValueError:
                    pass
            
            if end_date:
                try:
                    end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()
                    queryset = queryset.filter(date_created__lte=end_date_obj)
                except ValueError:
                    pass
            
            # Add search functionality
            search_query = self.request.query_params.get('search', '')
            if search_query:
                search_filter = Q()
                search_filter |= Q(user_name__icontains=search_query)
                search_filter |= Q(comment_text__icontains=search_query)
                search_filter |= Q(post_id__icontains=search_query)
                queryset = queryset.filter(search_filter)
            
            return queryset
        except Exception as e:
            print(f"Error in get_queryset: {str(e)}")
            return FacebookComment.objects.none()
    
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
            total_comments = queryset.count()
            unique_commenters = queryset.values('user_id').distinct().count()
            avg_likes = queryset.aggregate(avg_likes=models.Avg('num_likes'))['avg_likes'] or 0
            avg_replies = queryset.aggregate(avg_replies=models.Avg('num_replies'))['avg_replies'] or 0
            
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
        Upload CSV file and parse comment data
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
                    # Verify this is a comments folder
                    if folder.category != 'comments':
                        return Response(
                            {'error': 'Selected folder is not configured for comments'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except Folder.DoesNotExist:
                    return Response(
                        {'error': f'Folder with id {folder_id} does not exist'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Decode and parse CSV with proper encoding handling
            try:
                # Try UTF-8 first, then UTF-8 with BOM, then fallback to other encodings
                try:
                    decoded_file = csv_file.read().decode('utf-8-sig')
                except UnicodeDecodeError:
                    csv_file.seek(0)  # Reset file pointer
                    try:
                        decoded_file = csv_file.read().decode('utf-8')
                    except UnicodeDecodeError:
                        csv_file.seek(0)  # Reset file pointer
                        try:
                            decoded_file = csv_file.read().decode('latin1')
                        except UnicodeDecodeError:
                            csv_file.seek(0)  # Reset file pointer
                            decoded_file = csv_file.read().decode('cp1252', errors='replace')
                
                # Clean up any problematic characters that might cause issues
                # Replace null bytes and other control characters
                decoded_file = decoded_file.replace('\x00', '').replace('\r\n', '\n').replace('\r', '\n')
                
            except Exception as e:
                return Response(
                    {'error': f'Error reading CSV file. Please ensure it is a valid UTF-8 encoded CSV file. Error: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            csv_data = csv.DictReader(io.StringIO(decoded_file))
            
            rows_processed = 0
            rows_added = 0
            rows_updated = 0
            rows_skipped = 0
            errors = []
            
            # Debug: Check CSV headers
            fieldnames = csv_data.fieldnames
            print(f"CSV Headers: {fieldnames}")
            
            for row in csv_data:
                # Skip empty rows
                if not row or all(not v for v in row.values()):
                    continue
                
                rows_processed += 1
                
                # Debug: Print first few rows
                if rows_processed <= 3:
                    print(f"Row {rows_processed}: {dict(row)}")
                
                # Check if this row has warning or error messages indicating no comments
                warning = row.get('warning', '').strip()
                error = row.get('error', '').strip()
                
                # Skip rows with specific warnings/errors that indicate no actual comment data
                if warning in ['This post has no comments.', 'For this type of posts (reels) comments are not available.'] or \
                   error in ['Crawl failed after multiple attempts, please try again later']:
                    rows_skipped += 1
                    print(f"Skipping row {rows_processed}: {warning or error}")
                    continue
                
                # Extract and validate required fields - be flexible with field extraction
                comment_id = ''
                for key in ['comment_id', 'id']:
                    if key in row and row[key]:
                        comment_id = str(row[key]).strip().strip('"').strip("'")
                        break
                
                # Check if comment text exists
                comment_text = ''
                for key in ['comment_text', 'text', 'content', 'comment']:
                    if key in row and row[key]:
                        comment_text = str(row[key]).strip().strip('"').strip("'")
                        break
                
                # Skip rows with empty comment text
                if not comment_text:
                    rows_skipped += 1
                    print(f"Skipping row {rows_processed}: Empty comment text")
                    continue
                
                # Try to extract post_id from multiple possible sources
                post_id = ''
                for key in ['post_id', 'id', 'original_post_id']:
                    if key in row and row[key]:
                        post_id = str(row[key]).strip().strip('"').strip("'")
                        break
                
                # Debug: Print field extraction
                if rows_processed <= 3:
                    print(f"Extracted comment_id: '{comment_id}', comment_text: '{comment_text}', post_id: '{post_id}'")
                
                if not comment_id:
                    errors.append(f"Row {rows_processed}: Missing comment_id")
                    rows_skipped += 1
                    print(f"Skipping row {rows_processed}: Missing comment_id")
                    continue
                
                try:
                    # Parse date field
                    date_created_raw = row.get('date_created', None)
                    parsed_date = None
                    if date_created_raw:
                        try:
                            # Try parsing with dateutil first
                            from dateutil import parser as date_parser
                            parsed_date = date_parser.parse(str(date_created_raw))
                        except (ValueError, TypeError, ImportError):
                            # Fallback parsing
                            try:
                                parsed_date = datetime.datetime.fromisoformat(str(date_created_raw).replace('Z', '+00:00'))
                            except (ValueError, TypeError):
                                print(f"Could not parse date_created: {date_created_raw}")
                    
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
                                    return value if value else ''
                                except (UnicodeEncodeError, UnicodeDecodeError):
                                    # Handle problematic Unicode characters
                                    try:
                                        value = str(row[key]).encode('utf-8', errors='replace').decode('utf-8').strip().strip('"').strip("'")
                                        return value if value else ''
                                    except:
                                        return ''
                        return ''
                    
                    # Try to find related Facebook post
                    facebook_post = None
                    if post_id:
                        try:
                            facebook_post = FacebookPost.objects.filter(post_id=post_id).first()
                        except FacebookPost.DoesNotExist:
                            pass
                    
                    # Handle Unicode characters properly in comment text
                    try:
                        clean_comment_text = comment_text.encode('utf-8', errors='replace').decode('utf-8')
                    except:
                        clean_comment_text = comment_text
                    
                    # Prepare the comment data
                    comment_data = {
                        'comment_id': comment_id,
                        'folder': folder,
                        'facebook_post': facebook_post,
                        'url': get_field(row, 'url', 'post_url'),
                        'post_id': post_id,
                        'post_url': get_field(row, 'post_url', 'url'),
                        'user_name': get_field(row, 'user_name', 'username'),
                        'user_id': get_field(row, 'user_id', 'userid'),
                        'user_url': get_field(row, 'user_url', 'profile_url'),
                        'commentator_profile': get_field(row, 'commentator_profile', 'profile'),
                        'comment_text': clean_comment_text,
                        'date_created': parsed_date,
                        'comment_link': get_field(row, 'comment_link', 'link'),
                        'num_likes': safe_int(row.get('num_likes', 0)),
                        'num_replies': safe_int(row.get('num_replies', 0)),
                        'attached_files': get_field(row, 'attached_files', 'attachments'),
                        'video_length': safe_int(row.get('video_length')) if row.get('video_length') else None,
                        'source_type': get_field(row, 'source_type', 'type'),
                        'subtype': get_field(row, 'subtype'),
                        'type': get_field(row, 'type', 'comment_type'),
                    }
                    
                    # Debug: Print comment data for first few rows
                    if rows_processed <= 3:
                        print(f"Comment data for row {rows_processed}: {comment_data}")
                    
                    # Try to find existing comment
                    existing_comment = FacebookComment.objects.filter(
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
                        print(f"Updated comment: {comment_id}")
                    else:
                        # Create a new record
                        new_comment = FacebookComment.objects.create(**comment_data)
                        rows_added += 1
                        print(f"Created new comment: {comment_id}")
                        
                except Exception as e:
                    error_msg = f"Error processing row {rows_processed}: {str(e)}"
                    errors.append(error_msg)
                    rows_skipped += 1
                    print(error_msg)
                    # Continue processing other rows
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
            
            print(f"Upload completed: {response_data}")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            error_msg = f'Error processing CSV file: {str(e)}'
            print(error_msg)
            return Response(
                {'error': error_msg},
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
            response['Content-Disposition'] = f'attachment; filename="facebook_comments_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            
            # Add UTF-8 BOM for better CSV compatibility
            response.write('\ufeff')
            
            # Create CSV writer and write header
            writer = csv.writer(response)
            writer.writerow([
                'comment_id', 'post_id', 'post_url', 'user_name', 'user_id', 'user_url',
                'comment_text', 'date_created', 'num_likes', 'num_replies', 'source_type',
                'type', 'commentator_profile', 'comment_link'
            ])
            
            # Write data rows with proper Unicode handling
            for comment in comments:
                date_created_str = comment.date_created.isoformat() if comment.date_created else ''
                
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
                    safe_text(comment.user_name),
                    safe_text(comment.user_id),
                    safe_text(comment.user_url),
                    safe_text(comment.comment_text),
                    date_created_str,
                    comment.num_likes,
                    comment.num_replies,
                    safe_text(comment.source_type),
                    safe_text(comment.type),
                    safe_text(comment.commentator_profile),
                    safe_text(comment.comment_link)
                ])
            
            return response
        
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CommentScrapingJobViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Comment Scraping Jobs
    """
    serializer_class = CommentScrapingJobSerializer
    permission_classes = [AllowAny]  # For testing, use proper permissions in production
    
    def get_queryset(self):
        """
        Filter jobs by project if specified
        """
        queryset = CommentScrapingJob.objects.all()
        
        # Filter by project if specified
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
            
        return queryset
    
    @action(detail=False, methods=['POST'])
    def create_job(self, request):
        """
        Create and execute a new comment scraping job
        """
        try:
            # Get request data
            name = request.data.get('name')
            project_id = request.data.get('project_id')
            selected_folders = request.data.get('selected_folders', [])
            comment_limit = request.data.get('comment_limit', 10)
            get_all_replies = request.data.get('get_all_replies', False)
            result_folder_name = request.data.get('result_folder_name')
            
            # Validate required fields
            if not name:
                return Response({'error': 'Job name is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not selected_folders:
                return Response({'error': 'At least one folder must be selected'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not result_folder_name:
                return Response({'error': 'Result folder name is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Import the service
            from .services import create_and_execute_comment_scraping_job
            
            # Create and execute the job
            job, success = create_and_execute_comment_scraping_job(
                name=name,
                project_id=project_id,
                selected_folders=selected_folders,
                comment_limit=comment_limit,
                get_all_replies=get_all_replies,
                result_folder_name=result_folder_name
            )
            
            # Serialize and return the job
            serializer = self.get_serializer(job)
            
            return Response({
                'job': serializer.data,
                'success': success,
                'message': 'Job created and submitted successfully' if success else 'Job created but submission failed'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['POST'])
    def execute(self, request, pk=None):
        """
        Execute an existing comment scraping job
        """
        try:
            job = self.get_object()
            
            if job.status != 'pending':
                return Response(
                    {'error': f'Job is in {job.status} status and cannot be executed'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Import the service
            from .services import FacebookCommentScraper
            
            # Execute the job
            scraper = FacebookCommentScraper()
            success = scraper.execute_comment_scraping_job(job.id)
            
            # Refresh job from database
            job.refresh_from_db()
            serializer = self.get_serializer(job)
            
            return Response({
                'job': serializer.data,
                'success': success,
                'message': 'Job executed successfully' if success else 'Job execution failed'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['POST'])
    def process_webhook(self, request):
        """
        Process webhook data from BrightData
        """
        try:
            webhook_data = request.data
            
            if not isinstance(webhook_data, list):
                return Response({'error': 'Webhook data must be a list'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Import the service
            from .services import FacebookCommentScraper
            
            # Process the webhook data
            scraper = FacebookCommentScraper()
            result = scraper.process_comment_webhook_data(webhook_data)
            
            if result['success']:
                return Response({
                    'message': 'Webhook data processed successfully',
                    'result': result
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Error processing webhook data',
                    'result': result
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'])
    def scrape_from_urls(self, request):
        """
        Scrape Facebook posts from URLs using Apify
        """
        try:
            import asyncio
            from apify_integration.services import ApifyScrapingService
            
            urls = request.data.get('urls', [])
            folder_name = request.data.get('folder_name', 'Facebook Scraped Data')
            project_id = request.data.get('project_id', 1)
            num_of_posts = request.data.get('num_of_posts', 10)
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            
            if not urls:
                return Response({
                    'error': 'URLs list is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create source names from URLs
            source_names = [f"Facebook Source {i+1}" for i in range(len(urls))]
            
            async def create_and_start_job():
                service = ApifyScrapingService()
                
                # Create the job
                job = await service.create_scraping_job(
                    name=f"Facebook URL Scrape - {folder_name}",
                    project_id=project_id,
                    platform='facebook',
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
                    'message': 'Facebook scraping job started successfully',
                    'job_id': job.id,
                    'job_name': job.name,
                    'status': job.status,
                    'urls_count': len(urls)
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': 'Failed to start Facebook scraping job'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error starting Facebook scrape: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST) 