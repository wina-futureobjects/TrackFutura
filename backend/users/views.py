from django.shortcuts import render
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import generics, status, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from .serializers import (
    UserSerializer, RegisterSerializer, UserProfileSerializer,
    ProjectSerializer, ProjectDetailSerializer,
    OrganizationSerializer, OrganizationDetailSerializer,
    OrganizationMembershipSerializer, AdminUserCreateSerializer, AdminUserUpdateSerializer,
    PlatformSerializer, ServiceSerializer, PlatformServiceSerializer,
    PlatformServiceCreateSerializer, CompanySerializer, OrganizationMemberCreateSerializer
)
from .models import UserProfile, Project, Organization, OrganizationMembership
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.exceptions import NotFound, PermissionDenied
from django.db import models
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    UserProfile, Project, Organization, OrganizationMembership, 
    UserRole, Platform, Service, PlatformService, Company, UnifiedUserRecord
)
from .serializers import (
    UserProfileSerializer, ProjectSerializer, OrganizationSerializer,
    OrganizationMembershipSerializer, UserRoleSerializer,
    PlatformSerializer, ServiceSerializer, PlatformServiceSerializer,
    PlatformServiceCreateSerializer, CompanySerializer, AdminUserCreateSerializer,
    UnifiedUserRecordSerializer
)
from .permissions import IsSuperAdmin
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.crypto import get_random_string
from django.conf import settings
from django.db.models import Count

# Create your views here.

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)

        return Response({
            "user": UserSerializer(user, context=self.get_serializer_context()).data,
            "token": token.key
        })

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        
        if not serializer.is_valid():
            # Check if username exists
            username = request.data.get('username', '')
            if username:
                try:
                    user = User.objects.get(username=username)
                    # Username exists but password is wrong
                    return Response({
                        'error': 'wrong_password',
                        'message': 'Incorrect password. Please try again.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                except User.DoesNotExist:
                    # Username doesn't exist
                    return Response({
                        'error': 'account_not_found',
                        'message': 'Account does not exist. Please check your username or create a new account.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # No username provided
                return Response({
                    'error': 'missing_username',
                    'message': 'Username is required.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'email': user.email,
        })

class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        try:
            return UserProfile.objects.get(user=self.request.user)
        except UserProfile.DoesNotExist:
            # If profile doesn't exist, create one
            return UserProfile.objects.create(user=self.request.user)

# Organization Views
class OrganizationListCreateView(generics.ListCreateAPIView):
    """
    List all organizations user has access to or create a new organization
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrganizationSerializer

    def get_queryset(self):
        """Get organizations where user is owner or member"""
        user = self.request.user
        return Organization.objects.filter(members=user)

    def perform_create(self, serializer):
        """Create organization and add creator as owner and admin member"""
        organization = serializer.save(owner=self.request.user)
        # Add creator as admin
        OrganizationMembership.objects.create(
            user=self.request.user,
            organization=organization,
            role='admin'
        )

class OrganizationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete an organization
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrganizationDetailSerializer

    def get_queryset(self):
        user = self.request.user
        return Organization.objects.filter(members=user)

    def get_object(self):
        obj = super().get_object()

        # Only owner or admin can update/delete
        if self.request.method != 'GET':
            membership = OrganizationMembership.objects.filter(
                user=self.request.user,
                organization=obj
            ).first()

            if obj.owner != self.request.user and (not membership or membership.role != 'admin'):
                raise PermissionDenied("You don't have permission to modify this organization")

        return obj

class OrganizationStatsView(APIView):
    """
    Get statistics for an organization
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, organization_id, format=None):
        try:
            # Check if user has access to the organization
            organization = Organization.objects.get(id=organization_id)
            if not organization.members.filter(id=request.user.id).exists():
                raise PermissionDenied("You don't have access to this organization")

            # Calculate statistics
            total_members = organization.members.count()
            total_projects = Project.objects.filter(organization=organization).count()

            # Get user's other organizations count
            user_organizations = Organization.objects.filter(members=request.user).exclude(id=organization_id).count()

            stats = {
                'totalMembers': total_members,
                'totalProjects': total_projects,
                'organizations': user_organizations + 1  # Include current organization
            }

            return Response(stats)

        except Organization.DoesNotExist:
            raise NotFound("Organization not found")


class ProjectStatsView(APIView):
    """
    Get statistics for a project
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id, format=None):
        try:
            # Check if user has access to the project
            project = Project.objects.get(id=project_id)
            if not project.authorized_users.filter(id=request.user.id).exists() and project.owner != request.user:
                raise PermissionDenied("You don't have access to this project")

            # Import models for statistics calculation
            from facebook_data.models import FacebookPost, Folder as FacebookFolder
            from instagram_data.models import InstagramPost, Folder as InstagramFolder
            from linkedin_data.models import LinkedInPost, Folder as LinkedInFolder
            from tiktok_data.models import TikTokPost, Folder as TikTokFolder
            from track_accounts.models import TrackSource
            from reports.models import GeneratedReport
            from django.db.models import Count, Q

            # Calculate total posts across all platforms
            total_posts = 0
            total_accounts = 0
            
            # Facebook posts
            facebook_folders = FacebookFolder.objects.filter(project=project)
            facebook_posts = FacebookPost.objects.filter(folder__in=facebook_folders)
            total_posts += facebook_posts.count()
            
            # Instagram posts
            instagram_folders = InstagramFolder.objects.filter(project=project)
            instagram_posts = InstagramPost.objects.filter(folder__in=instagram_folders)
            total_posts += instagram_posts.count()
            
            # LinkedIn posts
            linkedin_folders = LinkedInFolder.objects.filter(project=project)
            linkedin_posts = LinkedInPost.objects.filter(folder__in=linkedin_folders)
            total_posts += linkedin_posts.count()
            
            # TikTok posts
            tiktok_folders = TikTokFolder.objects.filter(project=project)
            tiktok_posts = TikTokPost.objects.filter(folder__in=tiktok_folders)
            total_posts += tiktok_posts.count()
            
            # Track sources (accounts)
            total_accounts = TrackSource.objects.filter(project=project).count()
            
            # Generated reports
            total_reports = GeneratedReport.objects.filter(project=project).count()
            
            # Calculate engagement rate (simplified - could be enhanced with actual engagement data)
            # For now, we'll use a placeholder calculation
            engagement_rate = 3.2  # Placeholder - could be calculated from actual engagement data
            
            # Calculate growth rate (simplified - could be enhanced with historical data)
            growth_rate = 5.8  # Placeholder - could be calculated from historical data
            
            # Calculate storage used (simplified - could be enhanced with actual file sizes)
            # For now, we'll estimate based on number of posts
            estimated_storage_mb = total_posts * 0.5  # Estimate 0.5MB per post
            if estimated_storage_mb > 1024:
                total_storage_used = f"{estimated_storage_mb / 1024:.1f} GB"
            else:
                total_storage_used = f"{estimated_storage_mb:.1f} MB"
            
            # Credit balance and max credits (placeholder - could be enhanced with actual credit system)
            credit_balance = 2400
            max_credits = 5000

            stats = {
                'totalPosts': total_posts,
                'totalAccounts': total_accounts,
                'totalReports': total_reports,
                'totalStorageUsed': total_storage_used,
                'creditBalance': credit_balance,
                'maxCredits': max_credits,
                'engagementRate': engagement_rate,
                'growthRate': growth_rate,
                'platforms': {
                    'facebook': {
                        'posts': facebook_posts.count(),
                        'folders': facebook_folders.count()
                    },
                    'instagram': {
                        'posts': instagram_posts.count(),
                        'folders': instagram_folders.count()
                    },
                    'linkedin': {
                        'posts': linkedin_posts.count(),
                        'folders': linkedin_folders.count()
                    },
                    'tiktok': {
                        'posts': tiktok_posts.count(),
                        'folders': tiktok_folders.count()
                    }
                }
            }

            return Response(stats)

        except Project.DoesNotExist:
            raise NotFound("Project not found")
        except Exception as e:
            return Response(
                {'error': f'Error calculating project statistics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class OrganizationMembershipView(generics.ListCreateAPIView):
    """
    List members of an organization or add new members
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrganizationMembershipSerializer

    def get_queryset(self):
        """Get members for a specific organization"""
        organization_id = self.kwargs.get('organization_id')
        try:
            organization = Organization.objects.get(id=organization_id)

            # Check if user has access to this organization
            if not OrganizationMembership.objects.filter(
                user=self.request.user,
                organization=organization
            ).exists():
                raise PermissionDenied("You don't have access to this organization")

            # Get all memberships for this organization with debugging
            memberships = OrganizationMembership.objects.filter(organization=organization)
            
            # Add debugging information
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Found {memberships.count()} memberships for organization {organization.id}")
            for membership in memberships:
                logger.info(f"Membership: User {membership.user.username} (ID: {membership.user.id}), Role: {membership.role}")
            
            return memberships
        except Organization.DoesNotExist:
            raise NotFound("Organization not found")

    def get_serializer_class(self):
        """Use different serializer for POST requests"""
        if self.request.method == 'POST':
            return OrganizationMemberCreateSerializer
        return OrganizationMembershipSerializer

    def get_serializer_context(self):
        """Add organization to serializer context"""
        context = super().get_serializer_context()
        organization_id = self.kwargs.get('organization_id')
        try:
            organization = Organization.objects.get(id=organization_id)
            context['organization'] = organization
        except Organization.DoesNotExist:
            pass
        return context

    def perform_create(self, serializer):
        """Add member to organization"""
        organization_id = self.kwargs.get('organization_id')
        try:
            organization = Organization.objects.get(id=organization_id)

            # Check if user is owner or admin
            membership = OrganizationMembership.objects.filter(
                user=self.request.user,
                organization=organization
            ).first()

            if organization.owner != self.request.user and (not membership or membership.role != 'admin'):
                raise PermissionDenied("Only organization owners and admins can add members")

            # Add debugging information
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"perform_create called for organization {organization.id}")
            logger.info(f"Serializer type: {type(serializer).__name__}")

            # For the new serializer, the create method handles everything
            if isinstance(serializer, OrganizationMemberCreateSerializer):
                result = serializer.save()
                logger.info(f"OrganizationMemberCreateSerializer.save() returned: {result}")
            else:
                # For existing users, just create membership
                result = serializer.save(organization=organization)
                logger.info(f"Regular serializer.save() returned: {result}")
                
            # Verify the membership was created
            if hasattr(result, 'user'):
                logger.info(f"Membership created for user {result.user.username} (ID: {result.user.id}) in organization {result.organization.id}")
            else:
                logger.warning(f"Unexpected result from serializer.save(): {result}")
                
        except Organization.DoesNotExist:
            raise NotFound("Organization not found")

    def create(self, request, *args, **kwargs):
        """Override create method to handle errors properly"""
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            from django.db import IntegrityError
            if isinstance(e, IntegrityError):
                # Provide more specific error message based on the constraint
                error_msg = str(e).lower()
                if 'unique_together' in error_msg or 'organizationmembership' in error_msg:
                    return Response({
                        'error': 'This user is already a member of this organization.',
                        'detail': 'A user can only be added to an organization once.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                elif 'email' in error_msg and ('unique' in error_msg or 'duplicate' in error_msg):
                    return Response({
                        'error': 'A user with this email address already exists.',
                        'detail': 'Please use a different email address or add the existing user to the organization.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                elif 'username' in error_msg and ('unique' in error_msg or 'duplicate' in error_msg):
                    return Response({
                        'error': 'Username generation failed due to duplicate.',
                        'detail': 'Please try again with a different email address.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({
                        'error': 'Database error occurred. This might be due to a duplicate entry.',
                        'detail': str(e)
                    }, status=status.HTTP_400_BAD_REQUEST)
            elif isinstance(e, serializers.ValidationError):
                # Handle validation errors from the serializer
                return Response({
                    'error': 'Validation error',
                    'detail': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Log the unexpected error for debugging
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Unexpected error in OrganizationMembershipView.create: {str(e)}")
                logger.error(f"Error type: {type(e).__name__}")
                logger.error(f"Error args: {e.args}")
                
                # Provide more specific error information
                error_detail = str(e)
                if "company" in error_detail.lower():
                    return Response({
                        'error': 'Company assignment error',
                        'detail': 'There was an issue assigning the user to the company. Please ensure the organization owner has a valid company.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                elif "profile" in error_detail.lower():
                    return Response({
                        'error': 'User profile error',
                        'detail': 'There was an issue with the user profile. Please try again.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({
                        'error': 'An unexpected error occurred while adding the member.',
                        'detail': f'Error: {error_detail}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OrganizationMembershipDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete organization membership
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrganizationMembershipSerializer

    def get_queryset(self):
        organization_id = self.kwargs.get('organization_id')
        return OrganizationMembership.objects.filter(organization_id=organization_id)

    def get_object(self):
        obj = super().get_object()

        # Check if user has permission (owner or admin)
        if self.request.method != 'GET':
            import logging
            logger = logging.getLogger(__name__)
            
            # Check if user is organization owner
            is_owner = obj.organization.owner == self.request.user
            logger.info(f"User {self.request.user.username} is owner: {is_owner}")
            
            # Check if user is admin in the organization
            membership = OrganizationMembership.objects.filter(
                user=self.request.user,
                organization=obj.organization,
                role='admin'
            ).first()
            
            is_admin = membership is not None
            logger.info(f"User {self.request.user.username} is admin: {is_admin}")
            logger.info(f"Target user {obj.user.username} is owner: {obj.user == obj.organization.owner}")
            logger.info(f"Request method: {self.request.method}")

            if not is_owner and not is_admin:
                logger.warning(f"Permission denied for user {self.request.user.username}")
                raise PermissionDenied("Only organization owners and admins can modify memberships")

            # Don't allow removing the organization owner
            if obj.user == obj.organization.owner and self.request.method == 'DELETE':
                logger.warning(f"Cannot remove organization owner {obj.user.username}")
                raise PermissionDenied("Cannot remove the organization owner")

        return obj

    def partial_update(self, request, *args, **kwargs):
        """Override partial_update method to provide better error handling"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            instance = self.get_object()
            logger.info(f"Attempting to update membership {instance.id} for user {instance.user.username}")
            logger.info(f"Update data: {request.data}")
            
            # Perform the update
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            logger.info(f"Successfully updated membership {instance.id}")
            
            return Response(serializer.data)
            
        except PermissionDenied as e:
            logger.warning(f"Permission denied for membership update: {str(e)}")
            return Response({
                'error': 'Permission denied',
                'detail': str(e)
            }, status=status.HTTP_403_FORBIDDEN)
            
        except Exception as e:
            logger.error(f"Error updating membership: {str(e)}")
            return Response({
                'error': 'Failed to update membership',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, *args, **kwargs):
        """Override destroy method to provide better error handling"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            instance = self.get_object()
            logger.info(f"Attempting to delete membership {instance.id} for user {instance.user.username}")
            
            # Perform the deletion
            self.perform_destroy(instance)
            logger.info(f"Successfully deleted membership {instance.id}")
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except PermissionDenied as e:
            logger.warning(f"Permission denied for membership deletion: {str(e)}")
            return Response({
                'error': 'Permission denied',
                'detail': str(e)
            }, status=status.HTTP_403_FORBIDDEN)
            
        except Exception as e:
            logger.error(f"Error deleting membership: {str(e)}")
            return Response({
                'error': 'Failed to delete membership',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserSearchView(generics.ListAPIView):
    """
    Search for users by email
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        email = self.request.query_params.get('email', '')
        if not email:
            return User.objects.none()

        return User.objects.filter(email__iexact=email)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        if not queryset.exists():
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        # Return just the first match if found (email should be unique)
        user = queryset.first()
        serializer = self.get_serializer(user)
        return Response(serializer.data)

class ProjectListCreateView(generics.ListCreateAPIView):
    """
    List all projects user has access to or create a new project
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProjectSerializer

    def get_queryset(self):
        """
        Get projects where:
        1. User is the owner, or
        2. User is an admin/member of the organization and project is public, or
        3. User is specifically authorized for the project
        """
        user = self.request.user

        # Filter by organization if specified
        organization_id = self.request.query_params.get('organization')

        if organization_id:
            # Verify user has access to the organization
            try:
                org = Organization.objects.get(id=organization_id)
                if not org.members.filter(id=user.id).exists():
                    return Project.objects.none()  # No access to this organization

                # Find all projects in this organization that user can access
                own_projects = Project.objects.filter(organization=org, owner=user)

                # Get user's role in this organization
                membership = OrganizationMembership.objects.filter(
                    user=user,
                    organization=org
                ).first()

                # Admin can see all projects in the organization
                if membership and membership.role == 'admin':
                    return Project.objects.filter(organization=org)

                # Regular members can see public projects or ones they're authorized for
                return Project.objects.filter(
                    organization=org
                ).filter(
                    models.Q(owner=user) |
                    models.Q(is_public=True) |
                    models.Q(authorized_users=user)
                ).distinct()
            except Organization.DoesNotExist:
                return Project.objects.none()

        # No organization specified, return all accessible projects across all organizations
        return Project.objects.filter(
            models.Q(owner=user) |
            models.Q(is_public=True, organization__members=user) |
            models.Q(authorized_users=user)
        ).distinct()

    def perform_create(self, serializer):
        """Create project in specified organization"""
        organization_id = serializer.validated_data.get('organization').id

        try:
            organization = Organization.objects.get(id=organization_id)

            # Check if user is a member of this organization
            if not organization.members.filter(id=self.request.user.id).exists():
                raise PermissionDenied("You are not a member of this organization")

            # Check if user has permission to create projects (owner or admin)
            membership = OrganizationMembership.objects.filter(
                user=self.request.user,
                organization=organization
            ).first()

            if organization.owner != self.request.user and (not membership or membership.role != 'admin'):
                raise PermissionDenied("Only organization owners and admins can create projects")

            serializer.save(owner=self.request.user)
        except Organization.DoesNotExist:
            raise NotFound("Organization not found")

class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a project
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProjectDetailSerializer

    def get_queryset(self):
        user = self.request.user

        # Get all potentially accessible projects
        return Project.objects.filter(
            models.Q(owner=user) |
            models.Q(is_public=True, organization__members=user) |
            models.Q(authorized_users=user)
        ).distinct()

    def get_object(self):
        obj = super().get_object()

        # For operations other than GET, verify user has edit permissions
        if self.request.method != 'GET':
            # Owner can always edit
            if obj.owner == self.request.user:
                return obj

            # Check if user is organization admin
            membership = OrganizationMembership.objects.filter(
                user=self.request.user,
                organization=obj.organization,
                role='admin'
            ).first()

            if not membership:
                raise PermissionDenied("You don't have permission to modify this project")

        return obj

    def update(self, request, *args, **kwargs):
        """Override update method to add logging"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            instance = self.get_object()
            logger.info(f"Attempting to update project {instance.id} '{instance.name}'")
            logger.info(f"Update data: {request.data}")
            
            # Perform the update
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            logger.info(f"Successfully updated project {instance.id}")
            
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error updating project: {str(e)}")
            raise

    def destroy(self, request, *args, **kwargs):
        """Override destroy method to add logging"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            instance = self.get_object()
            logger.info(f"Attempting to delete project {instance.id} '{instance.name}'")
            
            # Perform the deletion
            self.perform_destroy(instance)
            logger.info(f"Successfully deleted project {instance.id}")
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            logger.error(f"Error deleting project: {str(e)}")
            raise

@method_decorator(ensure_csrf_cookie, name='dispatch')
@method_decorator(never_cache, name='dispatch')
class CurrentUserView(APIView):
    """Get current user information"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get current user details"""
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'is_active': request.user.is_active,
        })

class CSRFTokenView(APIView):
    """
    Provide CSRF token for frontend applications
    Ultra-permissive for deployment compatibility
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, format=None):
        """Return CSRF token"""
        from django.middleware.csrf import get_token

        try:
            csrf_token = get_token(request)
            return JsonResponse({
                'csrfToken': csrf_token,
                'success': True,
                'message': 'CSRF token generated successfully'
            })
        except Exception as e:
            # Even if CSRF fails, return a fallback
            return JsonResponse({
                'csrfToken': 'fallback-token',
                'success': True,
                'message': f'Fallback token provided: {str(e)}'
            })

    def post(self, request, format=None):
        """Accept POST requests and return token"""
        return self.get(request, format)

class PlatformViewSet(viewsets.ModelViewSet):
    """ViewSet for Platform model - Superadmin only"""
    queryset = Platform.objects.all()
    serializer_class = PlatformSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        """Filter based on user permissions"""
        if self.request.user.is_superuser:
            return Platform.objects.all()
        else:
            # Regular users can only see enabled platforms
            return Platform.objects.filter(is_enabled=True)
    
    def perform_create(self, serializer):
        """Set the created_by field"""
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        """Set the updated_by field"""
        serializer.save()

class ServiceViewSet(viewsets.ModelViewSet):
    """ViewSet for Service model - Superadmin only"""
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        """Filter based on user permissions"""
        if self.request.user.is_superuser:
            return Service.objects.all()
        else:
            # Regular users can see all services (they're filtered by platform availability)
            return Service.objects.all()

class PlatformServiceViewSet(viewsets.ModelViewSet):
    """ViewSet for PlatformService model - Superadmin only"""
    queryset = PlatformService.objects.all()
    serializer_class = PlatformServiceSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_serializer_class(self):
        """Use different serializer for creation"""
        if self.action == 'create':
            return PlatformServiceCreateSerializer
        return PlatformServiceSerializer
    
    def get_queryset(self):
        """Filter based on user permissions"""
        if self.request.user.is_superuser:
            return PlatformService.objects.select_related('platform', 'service')
        else:
            # Regular users can only see enabled platform-service combinations
            return PlatformService.objects.filter(
                is_enabled=True, 
                platform__is_enabled=True
            ).select_related('platform', 'service')
    
    def perform_create(self, serializer):
        """Set the created_by field"""
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        """Set the updated_by field"""
        serializer.save()

class AvailablePlatformsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for getting available platforms and services for regular users"""
    serializer_class = PlatformSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get only enabled platforms with their available services"""
        return Platform.objects.filter(is_enabled=True)
    
    @action(detail=True, methods=['get'])
    def services(self, request, pk=None):
        """Get available services for a specific platform"""
        platform = self.get_object()
        services = platform.get_available_services()
        serializer = ServiceSerializer(services, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def all_available(self, request):
        """Get all available platform-service combinations"""
        platform_services = PlatformService.objects.filter(
            is_enabled=True, 
            platform__is_enabled=True
        ).select_related('platform', 'service')
        
        serializer = PlatformServiceSerializer(platform_services, many=True)
        return Response(serializer.data)


# Admin Views for Super Admin Dashboard
class AdminUserViewSet(viewsets.ModelViewSet):
    """ViewSet for admin user management - Superadmin only"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        return User.objects.select_related('profile__company', 'global_role').order_by('-date_joined')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return AdminUserUpdateSerializer
        return UserSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new user with company assignment and email notification"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = serializer.save()
            
            # Debug: Print user role information
            try:
                if hasattr(user, 'global_role') and user.global_role:
                    print(f"User {user.username} created with role: {user.global_role.role} ({user.global_role.get_role_display()})")
                else:
                    print(f"User {user.username} created but no role found")
            except Exception as e:
                print(f"Error checking role for user {user.username}: {str(e)}")
            
            # Send email notification with the generated password
            try:
                self.send_welcome_email(request, user, user._generated_password)
            except Exception as e:
                # Log the error but don't fail the user creation
                print(f"Failed to send welcome email to {user.email}: {str(e)}")
            
            return Response({
                'message': 'User created successfully. Welcome email sent.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': f'Failed to create user: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def send_welcome_email(self, request, user, password):
        """Send welcome email with login credentials"""
        subject = 'Welcome to Track-Futura - Your Account Details'
        
        # Get user role information - refresh from database to ensure we have the latest data
        role_display = 'User'  # Default role
        company_name = 'N/A'  # Default company name
        try:
            # Refresh the user object to get the latest role information
            user.refresh_from_db()
            print(f"Debug: Checking role for user {user.username}")
            
            if hasattr(user, 'global_role') and user.global_role:
                role_display = user.global_role.get_role_display()
                print(f"Debug: Found role via global_role: {role_display}")
            else:
                print(f"Debug: No global_role found for user {user.username}")
                # Try to get role directly from UserRole model
                try:
                    user_role = UserRole.objects.get(user=user)
                    role_display = user_role.get_role_display()
                    print(f"Debug: Found role via direct query: {role_display}")
                except UserRole.DoesNotExist:
                    print(f"Debug: No UserRole found for user {user.username}")
                    pass
            
            # Get company information
            try:
                if hasattr(user, 'profile') and user.profile and user.profile.company:
                    company_name = user.profile.company.name
                    print(f"Debug: Found company for user {user.username}: {company_name}")
                else:
                    print(f"Debug: No company found for user {user.username}")
            except Exception as e:
                print(f"Error getting company for user {user.username}: {str(e)}")
                pass
                
        except Exception as e:
            print(f"Error getting role for user {user.username}: {str(e)}")
            pass
        
        # Create email content
        context = {
            'username': user.username,
            'email': user.email,
            'password': password,
            'role': role_display,
            'company': company_name,
            'login_url': request.build_absolute_uri('/login/'),
            'site_name': 'Track-Futura'
        }
        
        # Use the email template
        message = render_to_string('emails/welcome_email.txt', context)
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    
    @action(detail=True, methods=['patch'])
    def role(self, request, pk=None):
        """Update user role"""
        user = self.get_object()
        new_role = request.data.get('role')
        
        if not new_role:
            return Response({'error': 'Role is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is trying to change their own role
        if user == request.user:
            return Response({
                'error': 'You cannot change your own role'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update or create user role
        user_role, created = UserRole.objects.get_or_create(user=user, defaults={'role': new_role})
        if not created:
            user_role.role = new_role
            user_role.save()
        
        # Return the updated user data with role and company information
        # Force a fresh query to get the updated user with all related data
        updated_user = User.objects.select_related('profile__company', 'global_role').get(id=user.id)
        return Response(UserSerializer(updated_user).data)
    
    def update(self, request, *args, **kwargs):
        """Update user with protection against self-deactivation and self-role-change"""
        user = self.get_object()
        
        # Check if user is trying to deactivate themselves
        if user == request.user:
            is_active = request.data.get('is_active')
            if is_active is False:
                return Response({
                    'error': 'You cannot deactivate your own account'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user is trying to change their own role
            if 'role' in request.data:
                return Response({
                    'error': 'You cannot change your own role'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        response = super().update(request, *args, **kwargs)
        
        # Return the updated user data with role and company information
        # Force a fresh query to get the updated user with all related data
        updated_user = User.objects.select_related('profile__company', 'global_role').get(id=user.id)
        return Response(UserSerializer(updated_user).data)
    
    def partial_update(self, request, *args, **kwargs):
        """Partial update user with protection against self-deactivation and self-role-change"""
        user = self.get_object()
        
        # Check if user is trying to deactivate themselves
        if user == request.user:
            is_active = request.data.get('is_active')
            if is_active is False:
                return Response({
                    'error': 'You cannot deactivate your own account'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user is trying to change their own role
            if 'role' in request.data:
                return Response({
                    'error': 'You cannot change your own role'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        response = super().partial_update(request, *args, **kwargs)
        
        # Return the updated user data with role and company information
        # Force a fresh query to get the updated user with all related data
        updated_user = User.objects.select_related('profile__company', 'global_role').get(id=user.id)
        return Response(UserSerializer(updated_user).data)
    
    def destroy(self, request, *args, **kwargs):
        """Delete user"""
        try:
            user = self.get_object()
            
            # Check if user is trying to delete themselves
            if user == request.user:
                return Response({
                    'error': 'You cannot delete your own account'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if this is the last super admin (only if user has a role)
            try:
                if hasattr(user, 'global_role') and user.global_role.role == 'super_admin':
                    super_admin_count = UserRole.objects.filter(role='super_admin').count()
                    if super_admin_count <= 1:
                        return Response({
                            'error': 'Cannot delete the last super admin user'
                        }, status=status.HTTP_400_BAD_REQUEST)
            except (UserRole.DoesNotExist, AttributeError):
                # User doesn't have a role, proceed with deletion
                pass
            
            # Delete related objects first
            try:
                # Delete UserRole
                if hasattr(user, 'global_role'):
                    user.global_role.delete()
                
                # Delete UserProfile
                if hasattr(user, 'profile'):
                    user.profile.delete()
                
                # Delete the user
                user.delete()
                
                return Response({'message': 'User deleted successfully'})
                
            except Exception as e:
                return Response({
                    'error': f'Failed to delete user: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'An error occurred: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminOrganizationViewSet(viewsets.ModelViewSet):
    """ViewSet for admin organization management - Superadmin only"""
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        return Organization.objects.all().order_by('-created_at')


class AdminStatsView(APIView):
    """Get admin statistics - Superadmin only"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get(self, request):
        """Get system statistics"""
        total_users = User.objects.count()
        total_orgs = Organization.objects.count()
        total_projects = Project.objects.count()
        total_companies = Company.objects.count()
        
        # Count users by role
        super_admins = UserRole.objects.filter(role='super_admin').count()
        tenant_admins = UserRole.objects.filter(role='tenant_admin').count()
        regular_users = UserRole.objects.filter(role='user').count()
        
        return Response({
            'totalUsers': total_users,
            'totalOrgs': total_orgs,
            'totalProjects': total_projects,
            'totalCompanies': total_companies,
            'superAdmins': super_admins,
            'tenantAdmins': tenant_admins,
            'regularUsers': regular_users,
        })

class AdminCompanyViewSet(viewsets.ModelViewSet):
    """ViewSet for admin company management - Superadmin only"""
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        return Company.objects.all().order_by('-created_at')


class UnifiedUserRecordViewSet(viewsets.ModelViewSet):
    """
    ViewSet for UnifiedUserRecord model.
    Provides a unified view of user information from User, UserRole, and UserProfile models.
    """
    queryset = UnifiedUserRecord.objects.select_related('user', 'company').all()
    serializer_class = UnifiedUserRecordSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['role', 'status', 'company']
    search_fields = ['name', 'email', 'user__username', 'company__name']
    ordering_fields = ['name', 'email', 'role', 'status', 'created_date', 'updated_date']
    ordering = ['-created_date']
    
    def get_queryset(self):
        """Filter queryset based on user permissions"""
        queryset = super().get_queryset()
        
        # Super admins can see all records
        if self.request.user.is_superuser:
            return queryset
        
        # Tenant admins can see users in their organization
        try:
            user_role = self.request.user.global_role
            if user_role.role == 'tenant_admin':
                # Filter by organization/company if needed
                return queryset
        except UserRole.DoesNotExist:
            pass
        
        # Regular users can only see their own record
        return queryset.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Create unified record and sync with related models"""
        unified_record = serializer.save()
        
        # Sync with User model
        user = unified_record.user
        if unified_record.name:
            name_parts = unified_record.name.split()
            user.first_name = name_parts[0] if name_parts else ''
            user.last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        
        if unified_record.email:
            user.email = unified_record.email
        
        # Sync status with User.is_active
        if unified_record.status == 'active':
            user.is_active = True
        elif unified_record.status == 'inactive':
            user.is_active = False
        
        user.save()
        
        # Create/update UserRole
        user_role, created = UserRole.objects.get_or_create(user=user)
        user_role.role = unified_record.role
        user_role.save()
        
        # Create/update UserProfile
        user_profile, created = UserProfile.objects.get_or_create(user=user)
        user_profile.company = unified_record.company
        user_profile.save()
        
        print(f"Created unified record for user {user.username} and synced with related models")
    
    def update(self, request, *args, **kwargs):
        """Override update to ensure proper synchronization"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Save the unified record
        unified_record = serializer.save()
        
        # Sync with related models
        self._sync_with_related_models(unified_record)
        
        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}
        
        return Response(serializer.data)
    
    def partial_update(self, request, *args, **kwargs):
        """Override partial_update to ensure proper synchronization"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    def _sync_with_related_models(self, unified_record):
        """Helper method to sync unified record with related models"""
        user = unified_record.user
        
        # Sync with User model
        if unified_record.name:
            name_parts = unified_record.name.split()
            user.first_name = name_parts[0] if name_parts else ''
            user.last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        
        if unified_record.email:
            user.email = unified_record.email
        
        # Sync status with User.is_active
        if unified_record.status == 'active':
            user.is_active = True
        elif unified_record.status == 'inactive':
            user.is_active = False
        
        user.save()
        
        # Update UserRole
        try:
            user_role = user.global_role
            user_role.role = unified_record.role
            user_role.save()
        except UserRole.DoesNotExist:
            UserRole.objects.create(user=user, role=unified_record.role)
        
        # Update UserProfile
        try:
            user_profile = user.profile
            user_profile.company = unified_record.company
            user_profile.save()
        except UserProfile.DoesNotExist:
            UserProfile.objects.create(user=user, company=unified_record.company)
        
        print(f"Synced unified record for user {user.username} with related models")
    
    def perform_update(self, serializer):
        """Update unified record and sync with related models"""
        unified_record = serializer.save()
        
        # Sync with related models
        self._sync_with_related_models(unified_record)
    
    def perform_destroy(self, instance):
        """Delete unified record and handle related models"""
        user = instance.user
        username = user.username
        
        # Delete the unified record
        instance.delete()
        
        # Note: We don't delete the User, UserRole, or UserProfile here
        # as they might be needed for other purposes
        # The unified record is just a view, not the source of truth
        
        print(f"Deleted unified record for user {username}")
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get statistics about unified user records"""
        queryset = self.get_queryset()
        
        stats = {
            'total_users': queryset.count(),
            'active_users': queryset.filter(status='active').count(),
            'inactive_users': queryset.filter(status='inactive').count(),
            'role_distribution': queryset.values('role').annotate(
                count=Count('id')
            ),
            'status_distribution': queryset.values('status').annotate(
                count=Count('id')
            ),
            'company_distribution': queryset.values('company__name').annotate(
                count=Count('id')
            ).exclude(company__name__isnull=True)
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def sync_with_related_models(self, request, pk=None):
        """Manually sync unified record with related models"""
        try:
            unified_record = self.get_object()
            
            # Sync with related models
            self._sync_with_related_models(unified_record)
            
            return Response({
                'message': f'Successfully synced unified record for user {unified_record.user.username}',
                'user_id': unified_record.user.id,
                'username': unified_record.user.username
            })
            
        except Exception as e:
            return Response({
                'error': f'Failed to sync: {str(e)}'
            }, status=400)
    
    @action(detail=False, methods=['post'])
    def sync_all_records(self, request):
        """Sync all unified records with their related models"""
        try:
            unified_records = self.get_queryset()
            synced_count = 0
            errors = []
            
            for unified_record in unified_records:
                try:
                    self._sync_with_related_models(unified_record)
                    synced_count += 1
                except Exception as e:
                    errors.append(f"User {unified_record.user.username}: {str(e)}")
            
            return Response({
                'message': f'Successfully synced {synced_count} unified records',
                'synced_count': synced_count,
                'total_records': unified_records.count(),
                'errors': errors if errors else None
            })
            
        except Exception as e:
            return Response({
                'error': f'Failed to sync all records: {str(e)}'
            }, status=400)
    

