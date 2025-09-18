from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from track_accounts.models import UnifiedRunFolder, ServiceFolderIndex


PLATFORM_KEYWORDS = {
    'facebook': 'facebook',
    'instagram': 'instagram',
    'linkedin': 'linkedin',
    'tiktok': 'tiktok',
}

SERVICE_KEYWORDS = {
    'comments': 'comments',
    'reels': 'reels',
    'posts': 'posts',
    'post': 'posts',
    'profiles': 'profiles',
    'profile': 'profiles',
}


class Command(BaseCommand):
    help = "Fix existing UnifiedRunFolder hierarchy: add platform layer identities, convert legacy content jobs to job, link platform-specific folders, and index service folders"

    def handle(self, *args, **options):
        with transaction.atomic():
            stats = {
                'platform_code_filled': 0,
                'service_code_filled': 0,
                'service_index_upserts': 0,
                'jobs_converted': 0,
                'job_codes_inherited': 0,
                'unified_links_set': 0,
            }

            # 1) Ensure service folders have platform/service codes
            service_qs = UnifiedRunFolder.objects.filter(folder_type='service')
            for svc in service_qs.select_related('parent_folder'):
                before_platform = svc.platform_code
                before_service = svc.service_code

                # inherit platform_code from parent platform folder if available
                if not svc.platform_code and svc.parent_folder and svc.parent_folder.folder_type == 'platform':
                    svc.platform_code = svc.parent_folder.platform_code

                # derive service_code from name if missing
                if not svc.service_code and svc.name:
                    name = svc.name.lower()
                    for key, code in SERVICE_KEYWORDS.items():
                        if key in name:
                            svc.service_code = code
                            break

                if svc.platform_code != before_platform or svc.service_code != before_service:
                    svc.save(update_fields=['platform_code', 'service_code'])
                    if svc.platform_code and svc.platform_code != before_platform:
                        stats['platform_code_filled'] += 1
                    if svc.service_code and svc.service_code != before_service:
                        stats['service_code_filled'] += 1

                # upsert index
                if svc.scraping_run_id and svc.platform_code and svc.service_code:
                    ServiceFolderIndex.objects.update_or_create(
                        scraping_run=svc.scraping_run,
                        platform_code=svc.platform_code,
                        service_code=svc.service_code,
                        defaults={'folder': svc},
                    )
                    stats['service_index_upserts'] += 1

            # 2) Convert legacy job folders (content under service) to folder_type='job' and inherit codes
            legacy_jobs = UnifiedRunFolder.objects.filter(
                folder_type='content',
                parent_folder__folder_type='service',
            ).select_related('parent_folder')
            for job in legacy_jobs:
                parent = job.parent_folder
                updates = {}
                if job.folder_type != 'job':
                    job.folder_type = 'job'
                    updates['folder_type'] = 'job'
                # inherit codes
                if parent:
                    if not job.platform_code and parent.platform_code:
                        job.platform_code = parent.platform_code
                        updates['platform_code'] = parent.platform_code
                    if not job.service_code and parent.service_code:
                        job.service_code = parent.service_code
                        updates['service_code'] = parent.service_code
                if updates:
                    job.save(update_fields=list(updates.keys()))
                    stats['jobs_converted'] += int('folder_type' in updates)
                    stats['job_codes_inherited'] += int(('platform_code' in updates) or ('service_code' in updates))

            # 3) Link platform-specific Folder to unified job folder by name match (best-effort)
            #    Use platform_code to select the correct model
            platform_models = {
                'facebook': ('facebook_data', 'Folder'),
                'instagram': ('instagram_data', 'Folder'),
                'linkedin': ('linkedin_data', 'Folder'),
                'tiktok': ('tiktok_data', 'Folder'),
            }

            job_qs = UnifiedRunFolder.objects.filter(folder_type='job')
            for job in job_qs.iterator():
                platform = (job.platform_code or '').lower()
                if platform not in platform_models:
                    continue
                app_label, model_name = platform_models[platform]
                FolderModel = UnifiedRunFolder._meta.apps.get_model(app_label, model_name)
                # only set link if not linked yet
                # match by exact name; optionally also filter by project
                existing = FolderModel.objects.filter(
                    Q(unified_job_folder__isnull=True) | Q(unified_job_folder=job)
                ).filter(name=job.name)
                if job.project_id:
                    existing = existing.filter(project_id=job.project_id)
                pf = existing.order_by('id').first()
                if pf and (not getattr(pf, 'unified_job_folder_id', None)):
                    pf.unified_job_folder_id = job.id
                    pf.save(update_fields=['unified_job_folder'])
                    stats['unified_links_set'] += 1

            self.stdout.write(self.style.SUCCESS(
                f"Fix complete: platform_code_filled={stats['platform_code_filled']}, service_code_filled={stats['service_code_filled']}, "
                f"indexed={stats['service_index_upserts']}, jobs_converted={stats['jobs_converted']}, job_codes_inherited={stats['job_codes_inherited']}, "
                f"platform_links_set={stats['unified_links_set']}"
            ))


