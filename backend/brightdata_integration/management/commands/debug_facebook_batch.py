from django.core.management.base import BaseCommand
from brightdata_integration.models import BrightdataConfig, ScraperRequest
from brightdata_integration.services import AutomatedBatchScraper
import json

class Command(BaseCommand):
    help = 'Debug Facebook batch scraping failures'

    def handle(self, *args, **options):
        self.stdout.write("🔍 FACEBOOK BATCH FAILURE DEBUG INVESTIGATION")
        self.stdout.write("=" * 80)
        
        # Get active Facebook config
        config = BrightdataConfig.objects.filter(platform='facebook_posts', is_active=True).first()
        if not config:
            self.stdout.write(self.style.ERROR("❌ No active Facebook posts configuration found"))
            return
        
        self.stdout.write(f"✅ Found config: {config.name}")
        self.stdout.write(f"   Dataset ID: {config.dataset_id}")
        self.stdout.write(f"   API Token: {config.api_token[:10]}...")
        self.stdout.write(f"   Platform: {config.platform}")
        
        # Create test scraper requests
        test_requests = []
        
        # Create first request
        request1 = ScraperRequest.objects.create(
            config=config,
            platform='facebook_posts',
            content_type='post',
            target_url='https://www.facebook.com/LeBron/',
            num_of_posts=1,
            status='pending'
        )
        test_requests.append(request1)
        
        # Create second request
        request2 = ScraperRequest.objects.create(
            config=config,
            platform='facebook_posts',
            content_type='post',
            target_url='https://www.facebook.com/StephenCurry/',
            num_of_posts=1,
            status='pending'
        )
        test_requests.append(request2)
        
        self.stdout.write(f"✅ Created {len(test_requests)} test ScraperRequest objects")
        self.stdout.write(f"   Request IDs: {[r.id for r in test_requests]}")
        
        try:
            # Test the batch method
            scraper_service = AutomatedBatchScraper()
            self.stdout.write("\n🚀 Triggering Facebook batch scrape...")
            self.stdout.write("=" * 80)
            
            success = scraper_service._trigger_facebook_batch(test_requests)
            
            self.stdout.write("\n" + "=" * 80)
            self.stdout.write("📊 BATCH TEST RESULTS")
            self.stdout.write("=" * 80)
            self.stdout.write(f"Batch success: {success}")
            
            for request in test_requests:
                self.stdout.write(f"\nRequest ID {request.id}:")
                self.stdout.write(f"   Status: {request.status}")
                self.stdout.write(f"   Error: {request.error_message}")
                self.stdout.write(f"   Response metadata: {request.response_metadata}")
                self.stdout.write(f"   Request ID: {request.request_id}")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Batch test failed: {str(e)}"))
            import traceback
            traceback.print_exc()
