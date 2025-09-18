from django.core.management.base import BaseCommand
from django.utils import timezone
from brightdata_integration.models import WebhookEvent, ScraperRequest
from brightdata_integration.views import _process_webhook_data_with_batch_support
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Process pending webhook events from staging table'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=10,
            help='Maximum number of webhook events to process (default: 10)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be processed without actually processing'
        )

    def handle(self, *args, **options):
        limit = options['limit']
        dry_run = options['dry_run']
        
        self.stdout.write(f"Processing webhook queue (limit: {limit}, dry_run: {dry_run})")
        
        # Get pending webhook events
        pending_events = WebhookEvent.objects.filter(
            status='pending'
        ).order_by('received_at')[:limit]
        
        if not pending_events:
            self.stdout.write("No pending webhook events found.")
            return
        
        self.stdout.write(f"Found {len(pending_events)} pending webhook events")
        
        processed_count = 0
        success_count = 0
        failed_count = 0
        
        for event in pending_events:
            try:
                self.stdout.write(f"Processing webhook event {event.id}: {event.platform} - {event.snapshot_id}")
                
                if dry_run:
                    self.stdout.write(f"  [DRY RUN] Would process: {event.platform} - {event.snapshot_id}")
                    processed_count += 1
                    continue
                
                # Mark as processing
                event.status = 'processing'
                event.save()
                
                # Extract data from raw payload
                data = event.raw_payload
                platform = event.platform
                snapshot_id = event.snapshot_id
                
                # Handle file_url format
                if isinstance(data, dict) and 'file_url' in data:
                    posts_data = data.get('fetched_data', [])
                else:
                    posts_data = data if isinstance(data, list) else data.get('data', [])
                
                # Find corresponding scraper requests
                scraper_requests = list(ScraperRequest.objects.filter(request_id=snapshot_id))
                
                if not scraper_requests:
                    self.stdout.write(f"  Warning: No scraper requests found for snapshot_id: {snapshot_id}")
                
                # Process the data using existing logic
                success = _process_webhook_data_with_batch_support(posts_data, platform, scraper_requests)
                
                if success:
                    # Update status to completed
                    event.status = 'completed'
                    event.processed_at = timezone.now()
                    event.save()
                    
                    # Update all related statuses (reuse existing logic)
                    self._update_related_statuses(scraper_requests, success=True)
                    
                    self.stdout.write(f"  ✓ Successfully processed {len(posts_data) if isinstance(posts_data, list) else 1} items")
                    success_count += 1
                else:
                    # Update status to failed
                    event.status = 'failed'
                    event.error_message = 'Failed to process webhook data'
                    event.processed_at = timezone.now()
                    event.save()
                    
                    # Update all related statuses (reuse existing logic)
                    self._update_related_statuses(scraper_requests, success=False)
                    
                    self.stdout.write(f"  ✗ Failed to process webhook data")
                    failed_count += 1
                
                processed_count += 1
                
            except Exception as e:
                self.stdout.write(f"  ✗ Error processing webhook event {event.id}: {str(e)}")
                
                if not dry_run:
                    event.status = 'failed'
                    event.error_message = f'Processing error: {str(e)[:200]}'
                    event.processed_at = timezone.now()
                    event.save()
                
                failed_count += 1
                processed_count += 1
        
        # Summary
        self.stdout.write("\n" + "="*50)
        self.stdout.write("PROCESSING SUMMARY")
        self.stdout.write("="*50)
        self.stdout.write(f"Total processed: {processed_count}")
        self.stdout.write(f"Successful: {success_count}")
        self.stdout.write(f"Failed: {failed_count}")
        
        if dry_run:
            self.stdout.write("\nThis was a dry run - no actual processing occurred.")
    
    def _update_related_statuses(self, scraper_requests, success=True):
        """Update all related statuses (ScraperRequest, BatchScraperJob, ScrapingJob, ScrapingRun)"""
        if not scraper_requests:
            return
        
        try:
            # Get all unique batch jobs
            batch_jobs = {r.batch_job for r in scraper_requests if r.batch_job}
            
            # Update ScraperRequest statuses
            scraper_request_ids = [r.id for r in scraper_requests]
            status = 'completed' if success else 'failed'
            error_message = None if success else 'Failed to process webhook data'
            
            ScraperRequest.objects.filter(id__in=scraper_request_ids).update(
                status=status,
                completed_at=timezone.now() if success else None,
                error_message=error_message
            )
            
            # Update batch jobs and related entities
            for batch_job in batch_jobs:
                try:
                    # Update BatchScraperJob
                    if batch_job.status != status:
                        batch_job.status = status
                        if not success:
                            batch_job.error_log = 'Failed to process webhook data'
                        batch_job.save()
                    
                    # Update WorkflowTask statuses (legacy)
                    from workflow.models import WorkflowTask
                    workflow_tasks = WorkflowTask.objects.filter(batch_job=batch_job)
                    for workflow_task in workflow_tasks:
                        if workflow_task.status != status:
                            workflow_task.status = status
                            workflow_task.save()
                    
                    # Update ScrapingJob statuses
                    from workflow.models import ScrapingJob
                    scraping_jobs = ScrapingJob.objects.filter(batch_job=batch_job)
                    for scraping_job in scraping_jobs:
                        if scraping_job.status != status:
                            scraping_job.status = status
                            if success:
                                scraping_job.completed_at = timezone.now()
                            else:
                                scraping_job.error_message = 'Failed to process webhook data'
                            scraping_job.save()
                            
                except Exception as e:
                    logger.error(f"Error updating batch job {batch_job.id} statuses: {str(e)}")
            
            # Update ScrapingRun statuses
            all_scraping_jobs = []
            for batch_job in batch_jobs:
                from workflow.models import ScrapingJob
                all_scraping_jobs.extend(ScrapingJob.objects.filter(batch_job=batch_job))
            
            # Get unique ScrapingRun objects
            scraping_runs = {job.scraping_run for job in all_scraping_jobs if job.scraping_run}
            for run in scraping_runs:
                try:
                    if run.status != status:
                        if success:
                            all_jobs_completed = run.scraping_jobs.filter(status='completed').count() == run.scraping_jobs.count()
                            if all_jobs_completed:
                                run.status = 'completed'
                                run.completed_at = timezone.now()
                                run.save()
                        else:
                            all_jobs_failed = run.scraping_jobs.filter(status='failed').count() == run.scraping_jobs.count()
                            if all_jobs_failed:
                                run.status = 'failed'
                                run.save()
                except Exception as e:
                    logger.error(f"Error updating ScrapingRun {run.id}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error updating related statuses: {str(e)}")
