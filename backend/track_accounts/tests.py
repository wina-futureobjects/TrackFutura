from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from .models import TrackSource
from users.models import Project, User, Organization

# Create your tests here.

class TrackSourceModelTest(TestCase):
    def setUp(self):
        # Create test user and organization
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(
            name='Test Organization',
            owner=self.user
        )
        self.project = Project.objects.create(
            name='Test Project',
            organization=self.organization,
            owner=self.user
        )

    def test_create_track_source(self):
        """Test that TrackSource can be created with all required fields"""
        source = TrackSource.objects.create(
            name='Test Source',
            project=self.project,
            platform='instagram',
            service_name='instagram_posts',
            instagram_link='https://instagram.com/testuser'
        )
        
        self.assertEqual(source.name, 'Test Source')
        self.assertEqual(source.platform, 'instagram')
        self.assertEqual(source.service_name, 'instagram_posts')
        self.assertEqual(source.instagram_link, 'https://instagram.com/testuser')
        self.assertEqual(source.project, self.project)
        self.assertIsNotNone(source.created_at)
        self.assertIsNotNone(source.updated_at)

    def test_create_track_source_with_platform(self):
        """Test that TrackSource can be created with platform field"""
        source = TrackSource.objects.create(
            name='Facebook Source',
            project=self.project,
            platform='facebook',
            service_name='facebook_pages_posts',
            facebook_link='https://facebook.com/testpage'
        )
        
        self.assertEqual(source.platform, 'facebook')
        self.assertEqual(source.service_name, 'facebook_pages_posts')
        self.assertEqual(source.facebook_link, 'https://facebook.com/testpage')

class TrackSourceAPITest(APITestCase):
    def setUp(self):
        # Create test user and organization
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(
            name='Test Organization',
            owner=self.user
        )
        self.project = Project.objects.create(
            name='Test Project',
            organization=self.organization,
            owner=self.user
        )

    def test_create_source_via_api(self):
        """Test that TrackSource can be created via API"""
        url = '/api/track-accounts/sources/'
        data = {
            'name': 'Test API Source',
            'project': self.project.id,
            'platform': 'facebook',
            'service_name': 'facebook_pages_posts',
            'facebook_link': 'https://facebook.com/testpage'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TrackSource.objects.count(), 1)
        
        source = TrackSource.objects.first()
        self.assertEqual(source.name, 'Test API Source')
        self.assertEqual(source.platform, 'facebook')
        self.assertEqual(source.service_name, 'facebook_pages_posts')
        self.assertEqual(source.facebook_link, 'https://facebook.com/testpage')
        self.assertEqual(source.project, self.project)

    def test_create_source_via_api_with_platform(self):
        """Test that TrackSource can be created via API with platform field"""
        url = '/api/track-accounts/sources/'
        data = {
            'name': 'LinkedIn Source',
            'project': self.project.id,
            'platform': 'linkedin',
            'service_name': 'linkedin_posts',
            'linkedin_link': 'https://linkedin.com/in/testuser'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        source = TrackSource.objects.first()
        self.assertEqual(source.platform, 'linkedin')
        self.assertEqual(source.service_name, 'linkedin_posts')
        self.assertEqual(source.linkedin_link, 'https://linkedin.com/in/testuser')
