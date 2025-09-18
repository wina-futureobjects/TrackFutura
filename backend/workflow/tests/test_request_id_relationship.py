from django.test import TestCase
from django.contrib.auth.models import User
from users.models import Project
from workflow.models import ScrapingJob, ScrapingRun
from brightdata_integration.models import ScraperRequest, BatchScraperJob, BrightdataConfig


class ScrapingJobRequestIdRelationshipTest(TestCase):
    """Test the relationship between ScrapingJob and ScraperRequest via request_id"""

    @classmethod
    def setUpTestData(cls):
        # Create test user and project
        cls.user = User.objects.create_user(username='testuser', password='testpass')
        cls.project = Project.objects.create(name="Test Project", owner=cls.user)
        
        # Create BrightData config
        cls.config = BrightdataConfig.objects.create(
            name="Test Config",
            platform="instagram_posts",
            api_token="test_token",
            dataset_id="test_dataset"
        )
        
        # Create batch scraper job
        cls.batch_job = BatchScraperJob.objects.create(
            name="Test Batch Job",
            project=cls.project,
            source_folder_ids=[],
            platforms_to_scrape=['instagram'],
            content_types_to_scrape={'instagram': ['posts']}
        )
        
        # Create scraping run
        cls.scraping_run = ScrapingRun.objects.create(
            project=cls.project,
            name="Test Run"
        )

    def test_scraping_job_has_request_id_field(self):
        """Test that ScrapingJob has the request_id field"""
        job = ScrapingJob.objects.create(
            scraping_run=self.scraping_run,
            batch_job=self.batch_job,
            platform="instagram",
            service_type="posts",
            url="https://www.instagram.com/test/",
            dataset_id="test_dataset"
        )
        
        # Verify the field exists and can be set
        job.request_id = "test_request_id"
        job.save()
        
        # Reload from database
        job.refresh_from_db()
        self.assertEqual(job.request_id, "test_request_id")

    def test_relationship_via_request_id(self):
        """Test that ScrapingJob can be linked to ScraperRequest via request_id"""
        # Create ScraperRequest with request_id
        scraper_request = ScraperRequest.objects.create(
            config=self.config,
            batch_job=self.batch_job,
            request_id="test_snapshot_id",
            platform="instagram_posts",
            target_url="https://www.instagram.com/test/",
            source_name="Test Account"
        )
        
        # Create ScrapingJob with matching request_id
        scraping_job = ScrapingJob.objects.create(
            scraping_run=self.scraping_run,
            batch_job=self.batch_job,
            request_id="test_snapshot_id",
            platform="instagram",
            service_type="posts",
            url="https://www.instagram.com/test/",
            dataset_id="test_dataset"
        )
        
        # Verify they can be linked via request_id
        self.assertEqual(scraping_job.request_id, scraper_request.request_id)
        
        # Test querying by request_id
        jobs_with_request_id = ScrapingJob.objects.filter(request_id="test_snapshot_id")
        self.assertEqual(jobs_with_request_id.count(), 1)
        self.assertEqual(jobs_with_request_id.first(), scraping_job)

    def test_index_on_request_id(self):
        """Test that the request_id field has an index for efficient querying"""
        from django.db import connection
        
        # Get the table name
        table_name = ScrapingJob._meta.db_table
        
        with connection.cursor() as cursor:
            cursor.execute(f"PRAGMA index_list({table_name})")
            indexes = [row[1] for row in cursor.fetchall()]
            
            # Check if there's an index on request_id
            request_id_indexes = [idx for idx in indexes if 'request_id' in idx]
            self.assertTrue(len(request_id_indexes) > 0, "No index found on request_id field")

    def test_backfill_scenario(self):
        """Test the backfill scenario where ScraperRequest and ScrapingJob are linked"""
        # Create ScraperRequest first
        scraper_request = ScraperRequest.objects.create(
            config=self.config,
            batch_job=self.batch_job,
            request_id="backfill_test_id",
            platform="instagram_posts",
            target_url="https://www.instagram.com/backfill_test/",
            source_name="Backfill Test Account"
        )
        
        # Create ScrapingJob without request_id (simulating pre-backfill state)
        scraping_job = ScrapingJob.objects.create(
            scraping_run=self.scraping_run,
            batch_job=self.batch_job,
            platform="instagram",
            service_type="posts",
            url="https://www.instagram.com/backfill_test/",
            dataset_id="test_dataset"
        )
        
        # Verify initial state
        self.assertIsNone(scraping_job.request_id)
        
        # Simulate backfill by setting request_id
        scraping_job.request_id = scraper_request.request_id
        scraping_job.save()
        
        # Verify backfill worked
        scraping_job.refresh_from_db()
        self.assertEqual(scraping_job.request_id, "backfill_test_id")
        
        # Verify the relationship is established
        self.assertEqual(scraping_job.request_id, scraper_request.request_id)

    def test_multiple_jobs_same_request_id(self):
        """Test that multiple ScrapingJobs can share the same request_id"""
        request_id = "shared_request_id"
        
        # Create multiple ScrapingJobs with the same request_id
        job1 = ScrapingJob.objects.create(
            scraping_run=self.scraping_run,
            batch_job=self.batch_job,
            request_id=request_id,
            platform="instagram",
            service_type="posts",
            url="https://www.instagram.com/test1/",
            dataset_id="test_dataset"
        )
        
        job2 = ScrapingJob.objects.create(
            scraping_run=self.scraping_run,
            batch_job=self.batch_job,
            request_id=request_id,
            platform="instagram",
            service_type="posts",
            url="https://www.instagram.com/test2/",
            dataset_id="test_dataset"
        )
        
        # Verify both jobs have the same request_id
        self.assertEqual(job1.request_id, request_id)
        self.assertEqual(job2.request_id, request_id)
        
        # Verify querying returns both jobs
        jobs_with_request_id = ScrapingJob.objects.filter(request_id=request_id)
        self.assertEqual(jobs_with_request_id.count(), 2)
        self.assertIn(job1, jobs_with_request_id)
        self.assertIn(job2, jobs_with_request_id)
