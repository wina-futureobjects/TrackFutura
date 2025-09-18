from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from .models import UserProfile, Project, Organization, OrganizationMembership, UserRole, Platform, Service, PlatformService, Company, UnifiedUserRecord

def send_welcome_email_utility(request, user, password):
    """Utility function to send welcome email with login credentials"""
    subject = 'Welcome to Track-Futura - Your Account Details'
    
    # Get user role information
    role_display = 'User'  # Default role
    company_name = 'N/A'  # Default company name
    try:
        # Refresh the user object to get the latest role information
        user.refresh_from_db()
        
        if hasattr(user, 'global_role') and user.global_role:
            role_display = user.global_role.get_role_display()
        else:
            try:
                user_role = UserRole.objects.get(user=user)
                role_display = user_role.get_role_display()
            except UserRole.DoesNotExist:
                pass
        
        # Get company information
        try:
            if hasattr(user, 'profile') and user.profile and user.profile.company:
                company_name = user.profile.company.name
        except Exception:
            pass
                
    except Exception:
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

class UserRoleSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = UserRole
        fields = ['role', 'role_display']
        read_only_fields = ['role_display']

class UserSerializer(serializers.ModelSerializer):
    global_role = UserRoleSerializer(read_only=True)
    company_name = serializers.SerializerMethodField()
    company_id = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'display_name', 'global_role', 'is_active', 'company_name', 'company_id', 'date_joined']
        read_only_fields = ['id', 'global_role', 'company_name', 'company_id', 'date_joined', 'display_name']
        # Explicitly exclude first_name and last_name fields
        extra_kwargs = {
            'first_name': {'write_only': False, 'read_only': True},
            'last_name': {'write_only': False, 'read_only': True}
        }
    
    def get_company_name(self, obj):
        try:
            if hasattr(obj, 'profile') and obj.profile and obj.profile.company:
                return obj.profile.company.name
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting company name for user {obj.id}: {str(e)}")
        return None
    
    def get_company_id(self, obj):
        try:
            if hasattr(obj, 'profile') and obj.profile and obj.profile.company:
                return obj.profile.company.id
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting company id for user {obj.id}: {str(e)}")
        return None
    
    def get_display_name(self, obj):
        """Get the display name from UnifiedUserRecord, fallback to username"""
        try:
            if hasattr(obj, 'unified_record') and obj.unified_record and obj.unified_record.name:
                return obj.unified_record.name
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting display name for user {obj.id}: {str(e)}")
        return obj.username

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    company_name = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'avatar', 'company', 'company_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'company_name']
    
    def get_company_name(self, obj):
        return obj.company.name if obj.company else None

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=UserRole.ROLE_CHOICES, default='user', write_only=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'role')
        # Explicitly exclude first_name and last_name fields
        extra_kwargs = {
            'first_name': {'write_only': False, 'read_only': True},
            'last_name': {'write_only': False, 'read_only': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        role = validated_data.pop('role', 'user')
        
        # Only create user with required fields (username, email)
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            # Explicitly set first_name and last_name to empty strings to avoid any issues
            first_name='',
            last_name=''
        )
        user.set_password(validated_data['password'])
        user.save()
        
        # Create or update profile for user
        UserProfile.objects.get_or_create(user=user)
        
        # Create or update global role for user
        user_role, created = UserRole.objects.get_or_create(
            user=user,
            defaults={'role': role}
        )
        if not created:
            # Update existing role
            user_role.role = role
            user_role.save()
        
        return user

class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users in admin panel with company assignment"""
    role = serializers.ChoiceField(choices=UserRole.ROLE_CHOICES, default='user', write_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        source='company',
        queryset=Company.objects.filter(status='active'),
        required=False,
        allow_null=True,
        write_only=True
    )
    
    class Meta:
        model = User
        fields = ('username', 'email', 'role', 'company_id')
        # Explicitly exclude first_name and last_name fields
        extra_kwargs = {
            'first_name': {'write_only': False, 'read_only': True},
            'last_name': {'write_only': False, 'read_only': True}
        }
    
    def validate(self, attrs):
        role = attrs.get('role', 'user')
        company = attrs.get('company')
        
        # Super admin role must be assigned to Future Objects company
        if role == 'super_admin':
            try:
                futureobjects_company = Company.objects.get(name__iexact='Future Objects', status='active')
                attrs['company'] = futureobjects_company
            except Company.DoesNotExist:
                raise serializers.ValidationError({
                    'company_id': 'Super admin users must be assigned to the Future Objects company. Please create the Future Objects company first.'
                })
        elif not company:
            raise serializers.ValidationError({
                'company_id': 'Company is required for non-super admin users.'
            })
        
        return attrs
    
    def create(self, validated_data):
        role = validated_data.pop('role', 'user')
        company = validated_data.pop('company', None)
        
        # Generate a secure random password
        from django.utils.crypto import get_random_string
        password = get_random_string(16, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*')
        
        # Only create user with required fields (username, email)
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            # Explicitly set first_name and last_name to empty strings to avoid any issues
            first_name='',
            last_name=''
        )
        user.set_password(password)
        user.save()
        
        # Create or update profile for user with company assignment
        user_profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={'company': company}
        )
        if not created:
            # Update existing profile with company
            user_profile.company = company
            user_profile.save()
        
        # Create or update global role for user
        user_role, created = UserRole.objects.get_or_create(
            user=user,
            defaults={'role': role}
        )
        if not created:
            # Update existing role
            user_role.role = role
            user_role.save()
        
        # Store password for email notification
        user._generated_password = password
        
        return user

class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating users in admin panel"""
    role = serializers.ChoiceField(choices=UserRole.ROLE_CHOICES, required=False, write_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        source='company',
        queryset=Company.objects.filter(status='active'),
        required=False,
        allow_null=True,
        write_only=True
    )
    
    class Meta:
        model = User
        fields = ('username', 'email', 'role', 'is_active', 'company_id')
        # Explicitly exclude first_name and last_name fields
        extra_kwargs = {
            'first_name': {'write_only': False, 'read_only': True},
            'last_name': {'write_only': False, 'read_only': True}
        }
    
    def validate(self, attrs):
        # Check if username is being changed and if it's already taken
        if 'username' in attrs:
            username = attrs['username']
            if User.objects.filter(username=username).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError({
                    'username': 'A user with this username already exists.'
                })
        
        # Check if email is being changed and if it's already taken
        if 'email' in attrs:
            email = attrs['email']
            if User.objects.filter(email=email).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError({
                    'email': 'A user with this email already exists.'
                })
        
        # Check if user is trying to change their own role
        if 'role' in attrs:
            request = self.context.get('request')
            if request and request.user == self.instance:
                raise serializers.ValidationError({
                    'role': 'You cannot change your own role'
                })
        
        # Enforce super admin company assignment rules
        role = attrs.get('role')
        company = attrs.get('company')
        
        # If role is being changed to super_admin, enforce Future Objects company
        if role == 'super_admin':
            try:
                futureobjects_company = Company.objects.get(name__iexact='Future Objects', status='active')
                attrs['company'] = futureobjects_company
            except Company.DoesNotExist:
                raise serializers.ValidationError({
                    'role': 'Super admin users must be assigned to the Future Objects company. Please create the Future Objects company first.'
                })
        # If role is being changed from super_admin to something else, allow company change
        elif role is not None and hasattr(self.instance, 'global_role') and self.instance.global_role.role == 'super_admin':
            # User is being changed from super_admin to another role, allow company assignment
            pass
        # If company is being changed for a super_admin user, enforce Future Objects
        elif company is not None and hasattr(self.instance, 'global_role') and self.instance.global_role.role == 'super_admin':
            try:
                futureobjects_company = Company.objects.get(name__iexact='Future Objects', status='active')
                if company.id != futureobjects_company.id:
                    raise serializers.ValidationError({
                        'company_id': 'Super admin users can only be assigned to the Future Objects company.'
                    })
            except Company.DoesNotExist:
                raise serializers.ValidationError({
                    'company_id': 'Super admin users must be assigned to the Future Objects company. Please create the Future Objects company first.'
                })
        
        return attrs
    
    def update(self, instance, validated_data):
        # Only pop company if it's actually in the validated_data
        company = None
        if 'company' in validated_data:
            company = validated_data.pop('company')
        
        role = validated_data.pop('role', None)
        
        # Update only the required user fields (username, email, is_active)
        # Explicitly exclude first_name and last_name from updates
        allowed_fields = ['username', 'email', 'is_active']
        for attr, value in validated_data.items():
            if attr in allowed_fields:
                setattr(instance, attr, value)
        instance.save()
        
        # Update user role if provided
        if role is not None:
            user_role, created = UserRole.objects.get_or_create(user=instance)
            user_role.role = role
            user_role.save()
        
        # Update user profile company ONLY if company was explicitly provided in the request
        if company is not None:
            user_profile, created = UserProfile.objects.get_or_create(
                user=instance,
                defaults={'company': company}
            )
            if not created:
                # Update existing profile with company
                user_profile.company = company
                user_profile.save()
        
        return instance

class OrganizationMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source='user',
        queryset=User.objects.all(),
        write_only=True
    )
    display_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    class Meta:
        model = OrganizationMembership
        fields = ['id', 'user', 'user_id', 'role', 'display_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']
    
    def validate_role(self, value):
        """Validate role field"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Validating role: {value}")
        
        # Check if the role is a valid choice
        valid_roles = [choice[0] for choice in OrganizationMembership.ROLE_CHOICES]
        if value not in valid_roles:
            raise serializers.ValidationError(f"Invalid role. Must be one of: {valid_roles}")
        
        return value
    
    def to_representation(self, instance):
        """Add debugging to see what's happening during serialization"""
        try:
            result = super().to_representation(instance)
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"OrganizationMembershipSerializer.to_representation for membership {instance.id}: {result}")
            return result
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in OrganizationMembershipSerializer.to_representation: {str(e)}")
            # Return a fallback representation
            return {
                'id': instance.id,
                'user': {
                    'id': instance.user.id if instance.user else None,
                    'username': instance.user.username if instance.user else 'Unknown',
                    'email': instance.user.email if instance.user else '',
                },
                'role': instance.role,
                'date_joined': instance.date_joined,
            }

class OrganizationMemberCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users and adding them to organization"""
    name = serializers.CharField(max_length=255, help_text="Full name of the user")
    email = serializers.EmailField(help_text="User's email address")
    role = serializers.ChoiceField(choices=OrganizationMembership.ROLE_CHOICES, default='member')
    
    class Meta:
        model = OrganizationMembership
        fields = ['name', 'email', 'role']
    
    def to_representation(self, instance):
        """Return a representation that includes user information"""
        # Handle the case where instance is a dict (from create method)
        if isinstance(instance, dict):
            membership = instance['membership']
            return {
                'id': membership.id,
                'user': {
                    'id': instance['user_id'],
                    'username': instance['username'],
                    'email': instance['email'],
                },
                'role': membership.role,
                'display_name': instance['display_name'],
                'date_joined': membership.date_joined,
                'organization': {
                    'id': membership.organization.id,
                    'name': membership.organization.name,
                },
                'user_created': instance['user_created']
            }
        
        # Handle the normal case where instance is an OrganizationMembership object
        if hasattr(instance, 'user'):
            return {
                'id': instance.id,
                'user': {
                    'id': instance.user.id,
                    'username': instance.user.username,
                    'email': instance.user.email,
                },
                'role': instance.role,
                'display_name': instance.display_name,
                'date_joined': instance.date_joined,
                'organization': {
                    'id': instance.organization.id,
                    'name': instance.organization.name,
                }
            }
        else:
            # Fallback if no user is associated
            return {
                'id': instance.id,
                'role': instance.role,
                'date_joined': instance.date_joined,
            }
    
    def validate_email(self, value):
        """Check that the email is valid and user can be added to this organization"""
        organization = self.context.get('organization')
        if not organization:
            raise serializers.ValidationError("Organization context is missing.")
        
        # Check if organization owner has a company (for new user creation)
        try:
            if hasattr(organization.owner, 'profile') and organization.owner.profile:
                owner_company = organization.owner.profile.company
                if not owner_company:
                    raise serializers.ValidationError(
                        "Organization owner does not have a company assigned. Please contact the administrator to assign a company to the organization owner."
                    )
            else:
                raise serializers.ValidationError(
                    "Organization owner does not have a profile. Please contact the administrator to set up the organization owner's profile."
                )
        except Exception as e:
            raise serializers.ValidationError(
                "Unable to verify organization owner's company. Please contact the administrator."
            )
        
        # Check if user exists
        existing_user = User.objects.filter(email__iexact=value).first()
        if existing_user:
            # User exists, check if they can be added to this organization
            try:
                # Get the organization owner's company
                owner_company = organization.owner.profile.company if hasattr(organization.owner, 'profile') and organization.owner.profile else None
                
                # Get the existing user's company
                user_company = existing_user.profile.company if hasattr(existing_user, 'profile') and existing_user.profile else None
                
                # If organization owner has no company, allow the addition
                if not owner_company:
                    return value
                
                # If user has no company, allow the addition (they'll be assigned to owner's company)
                if not user_company:
                    return value
                
                # Check if user is in the same company as the organization owner
                if user_company.id != owner_company.id:
                    raise serializers.ValidationError(
                        f"User with email {value} belongs to company '{user_company.name}' but this organization belongs to company '{owner_company.name}'. Users can only be added to organizations within the same company."
                    )
                
                # Check if user is already a member of this organization
                existing_membership = OrganizationMembership.objects.filter(
                    user=existing_user,
                    organization=organization
                ).first()
                
                if existing_membership:
                    raise serializers.ValidationError(
                        f"User with email {value} is already a member of this organization."
                    )
                
            except (UserProfile.DoesNotExist, AttributeError):
                # If there are profile issues, allow the addition
                return value
        
        return value
    
    def validate_role(self, value):
        """Check that the role is valid"""
        valid_roles = [choice[0] for choice in OrganizationMembership.ROLE_CHOICES]
        if value not in valid_roles:
            raise serializers.ValidationError(f"Invalid role '{value}'. Valid roles are: {valid_roles}")
        return value
    
    def create(self, validated_data):
        """Create a new user and add them to the organization"""
        name = validated_data.pop('name')
        email = validated_data.pop('email')
        role = validated_data.pop('role')
        organization = self.context.get('organization')
        
        if not organization:
            raise serializers.ValidationError("Organization context is missing. Please try again.")
        
        # Add some debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Creating user with email: {email}, name: {name}, role: {role}")
        logger.info(f"Available role choices: {OrganizationMembership.ROLE_CHOICES}")
        
        # Check if user already exists with this email (case-insensitive)
        existing_user = User.objects.filter(email__iexact=email).first()
        if existing_user:
            # User exists - validation has already checked company compatibility and existing membership
            user = existing_user
            logger.info(f"Using existing user {user.id} for organization membership")
            
            # Ensure user has a profile and role (they might not if created through other means)
            user_profile, profile_created = UserProfile.objects.get_or_create(user=user)
            
            # If user has no company, assign them to the organization owner's company
            if not user_profile.company and organization.owner:
                try:
                    owner_company = organization.owner.profile.company
                    if owner_company:
                        user_profile.company = owner_company
                        user_profile.save()
                        logger.info(f"Assigned user {user.id} to company {owner_company.name}")
                except (UserProfile.DoesNotExist, AttributeError):
                    logger.warning(f"Organization owner has no company, user {user.id} remains without company")
            
            UserRole.objects.get_or_create(user=user, defaults={'role': 'user'})
            
            # Create or update UnifiedUserRecord with the name for existing users too
            from .models import UnifiedUserRecord
            unified_record, created = UnifiedUserRecord.objects.get_or_create(
                user=user,
                defaults={
                    'name': name,
                    'email': user.email,
                    'role': 'user',
                    'status': 'active' if user.is_active else 'inactive'
                }
            )
            if not created:
                # Update existing record with the name
                unified_record.name = name
                unified_record.save()
        else:
            # Check if username (name) already exists
            if User.objects.filter(username=name).exists():
                raise serializers.ValidationError(
                    f"A user with name '{name}' already exists. Please use a different name."
                )
            
            # Double-check that the email doesn't exist (case-insensitive)
            if User.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError(
                    f"A user with email {email} already exists."
                )
            
            # Generate a random password
            import secrets
            import string
            password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
            
            # Create the user
            user = User.objects.create(
                username=name,  # Store the full name directly in username
                email=email,
                is_active=True
            )
            user.set_password(password)
            user.save()
            
            # Create user profile and assign to organization owner's company
            owner_company = None
            try:
                if hasattr(organization.owner, 'profile') and organization.owner.profile:
                    owner_company = organization.owner.profile.company
                    logger.info(f"Found owner company: {owner_company.name if owner_company else 'None'}")
                else:
                    logger.warning(f"Organization owner {organization.owner.username} has no profile")
            except Exception as e:
                logger.error(f"Error getting owner company: {str(e)}")
            
            # Create user profile with company assignment
            if owner_company:
                user_profile, created = UserProfile.objects.get_or_create(user=user, defaults={'company': owner_company})
                if not created:
                    # Profile already exists, update the company
                    user_profile.company = owner_company
                    user_profile.save()
                logger.info(f"Assigned new user {user.id} to company {owner_company.name}")
            else:
                # Create profile without company if owner has no company
                user_profile, created = UserProfile.objects.get_or_create(user=user)
                logger.warning(f"Created user profile for {user.id} without company (owner has no company)")
            
            # Create global role for user
            UserRole.objects.get_or_create(user=user, defaults={'role': 'user'})
            
            # Create or update UnifiedUserRecord with the name
            from .models import UnifiedUserRecord
            unified_record, created = UnifiedUserRecord.objects.get_or_create(
                user=user,
                defaults={
                    'name': name,
                    'email': user.email,
                    'role': 'user',
                    'status': 'active' if user.is_active else 'inactive'
                }
            )
            if not created:
                # Update existing record with the name
                unified_record.name = name
                unified_record.save()
            
            # Send welcome email with credentials
            send_welcome_email_utility(
                self.context['request'], 
                user, 
                password
            )
        
        # Validation has already checked for existing membership, so we can proceed
        
        # Create organization membership
        logger.info(f"Creating organization membership for user {user.id} in organization {organization.id} with role {role}")
        try:
            membership = OrganizationMembership.objects.create(
                user=user,
                organization=organization,
                role=role,
                display_name=name  # Store the name input in the membership display_name field
            )
            logger.info(f"Successfully created membership {membership.id}")
            
            # Verify company assignment
            try:
                user.refresh_from_db()
                if hasattr(user, 'profile') and user.profile:
                    company_name = user.profile.company.name if user.profile.company else "No company"
                    logger.info(f"Final verification: User {user.id} is assigned to company: {company_name}")
                else:
                    logger.warning(f"Final verification: User {user.id} has no profile")
            except Exception as e:
                logger.error(f"Error verifying company assignment: {str(e)}")
            
            # Return membership with additional context about whether user was created or existing
            return {
                'membership': membership,
                'user_created': not existing_user,
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'display_name': membership.display_name  # Use the display_name from the membership
            }
        except Exception as e:
            logger.error(f"Failed to create organization membership: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(f"Exception args: {e.args}")
            
            # If membership creation fails, we should clean up the user we just created
            # But only if this is a new user (not an existing one)
            if not existing_user:
                try:
                    user.delete()
                    logger.info(f"Cleaned up user {user.id} after membership creation failure")
                except:
                    logger.error(f"Failed to clean up user {user.id} after membership creation failure")
                    pass  # If user deletion fails, we can't do much about it
            
            # Re-raise the exception to be handled by the view
            raise e

class OrganizationSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'owner', 'owner_name', 'members_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'owner', 'owner_name', 'members_count', 'created_at', 'updated_at']
    
    def get_owner_name(self, obj):
        return obj.owner.username if obj.owner else None
    
    def get_members_count(self, obj):
        return obj.members.count()

class OrganizationDetailSerializer(OrganizationSerializer):
    members = OrganizationMembershipSerializer(source='organizationmembership_set', many=True, read_only=True)
    
    class Meta(OrganizationSerializer.Meta):
        fields = OrganizationSerializer.Meta.fields + ['members']

class ProjectSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    organization_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 
            'organization', 'organization_name',
            'owner', 'owner_name', 
            'is_public',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'owner_name', 'organization_name', 'created_at', 'updated_at']
    
    def get_owner_name(self, obj):
        return obj.owner.username if obj.owner else None
    
    def get_organization_name(self, obj):
        return obj.organization.name if obj.organization else None

class ProjectDetailSerializer(ProjectSerializer):
    authorized_users = UserSerializer(many=True, read_only=True)
    
    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ['authorized_users'] 

class PlatformSerializer(serializers.ModelSerializer):
    """Serializer for Platform model"""
    available_services = serializers.SerializerMethodField()
    
    class Meta:
        model = Platform
        fields = [
            'id', 'name', 'display_name', 'is_enabled', 'description', 
            'icon_name', 'color', 'available_services', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_available_services(self, obj):
        """Get available services for this platform"""
        platform_services = obj.get_available_services()
        # Extract the Service objects from PlatformService objects
        services = [ps.service for ps in platform_services]
        return ServiceSerializer(services, many=True).data

class ServiceSerializer(serializers.ModelSerializer):
    """Serializer for Service model"""
    
    class Meta:
        model = Service
        fields = [
            'id', 'name', 'display_name', 'description', 
            'icon_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class PlatformServiceSerializer(serializers.ModelSerializer):
    """Serializer for PlatformService model"""
    platform = PlatformSerializer(read_only=True)
    service = ServiceSerializer(read_only=True)
    is_available = serializers.ReadOnlyField()
    
    class Meta:
        model = PlatformService
        fields = [
            'id', 'platform', 'service', 'is_enabled', 'is_available',
            'description', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_available', 'created_at', 'updated_at']

class PlatformServiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating PlatformService instances"""
    platform_id = serializers.PrimaryKeyRelatedField(
        source='platform',
        queryset=Platform.objects.all(),
        write_only=True
    )
    service_id = serializers.PrimaryKeyRelatedField(
        source='service',
        queryset=Service.objects.all(),
        write_only=True
    )
    
    class Meta:
        model = PlatformService
        fields = [
            'platform_id', 'service_id', 'is_enabled', 'description'
        ]
    
    def validate(self, data):
        platform = data.get('platform')
        service = data.get('service')
        
        if PlatformService.objects.filter(platform=platform, service=service).exists():
            raise serializers.ValidationError("This platform-service combination already exists.")
        
        return data

class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'status', 'status_display', 'description', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at'] 

class UnifiedUserRecordSerializer(serializers.ModelSerializer):
    """Serializer for UnifiedUserRecord model"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UnifiedUserRecord
        fields = [
            'id', 'name', 'email', 'company', 'company_name', 
            'role', 'role_display', 'status', 'status_display',
            'username', 'created_date', 'updated_date'
        ]
        read_only_fields = ['id', 'created_date', 'updated_date', 'company_name', 'role_display', 'status_display', 'username']
    
    def to_representation(self, instance):
        """Custom representation to include additional computed fields"""
        data = super().to_representation(instance)
        data['display_name'] = instance.display_name
        return data 