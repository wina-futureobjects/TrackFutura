from django.core.management.base import BaseCommand
from django.db import transaction
from workflow.models import ScrapingJob
from brightdata_integration.models import ScraperRequest


class Command(BaseCommand):
    help = 'Backfill request_id field in ScrapingJob by matching with ScraperRequest data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Get all ScrapingJobs that don't have a request_id
        jobs_without_request_id = ScrapingJob.objects.filter(request_id__isnull=True)
        total_jobs = jobs_without_request_id.count()
        
        self.stdout.write(f"Found {total_jobs} ScrapingJobs without request_id")
        
        if total_jobs == 0:
            self.stdout.write(self.style.SUCCESS('No jobs need backfilling'))
            return
        
        updated_count = 0
        skipped_count = 0
        
        with transaction.atomic():
            for job in jobs_without_request_id:
                # Try to find matching ScraperRequest by batch_job and URL
                matching_requests = ScraperRequest.objects.filter(
                    batch_job=job.batch_job,
                    target_url=job.url
                )
                
                if matching_requests.exists():
                    # Use the first matching request
                    scraper_request = matching_requests.first()
                    
                    if scraper_request.request_id:
                        if not dry_run:
                            job.request_id = scraper_request.request_id
                            job.save(update_fields=['request_id'])
                        
                        self.stdout.write(
                            f"✅ Updated Job {job.id}: {job.platform} {job.service_type} "
                            f"-> request_id: {scraper_request.request_id}"
                        )
                        updated_count += 1
                    else:
                        self.stdout.write(
                            f"⚠️  Skipped Job {job.id}: ScraperRequest {scraper_request.id} "
                            f"has no request_id"
                        )
                        skipped_count += 1
                else:
                    # Try to find by batch_job only
                    batch_requests = ScraperRequest.objects.filter(
                        batch_job=job.batch_job
                    )
                    
                    if batch_requests.exists():
                        scraper_request = batch_requests.first()
                        
                        if scraper_request.request_id:
                            if not dry_run:
                                job.request_id = scraper_request.request_id
                                job.save(update_fields=['request_id'])
                            
                            self.stdout.write(
                                f"✅ Updated Job {job.id}: {job.platform} {job.service_type} "
                                f"(batch match) -> request_id: {scraper_request.request_id}"
                            )
                            updated_count += 1
                        else:
                            self.stdout.write(
                                f"⚠️  Skipped Job {job.id}: Batch ScraperRequest {scraper_request.id} "
                                f"has no request_id"
                            )
                            skipped_count += 1
                    else:
                        self.stdout.write(
                            f"❌ No match found for Job {job.id}: {job.platform} {job.service_type} "
                            f"(batch_job: {job.batch_job.id}, url: {job.url})"
                        )
                        skipped_count += 1
        
        # Summary
        self.stdout.write("\n" + "="*50)
        self.stdout.write("BACKFILL SUMMARY")
        self.stdout.write("="*50)
        self.stdout.write(f"Total jobs processed: {total_jobs}")
        self.stdout.write(f"Jobs updated: {updated_count}")
        self.stdout.write(f"Jobs skipped: {skipped_count}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. Run without --dry-run to apply changes.'))
        else:
            self.stdout.write(self.style.SUCCESS('\nBackfill completed successfully!'))
