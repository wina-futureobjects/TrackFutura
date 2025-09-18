# Generated manually to fix webhook_status field issue

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('brightdata_integration', '0023_remove_webhook_status_field'),
        ('workflow', '0011_scrapingjob_job_folder_scrapeoutput'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='scrapingjob',
            name='webhook_status',
        ),
    ]
