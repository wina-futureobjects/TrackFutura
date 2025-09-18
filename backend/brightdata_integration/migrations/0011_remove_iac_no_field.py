# Generated manually to remove iac_no field from ScraperRequest model
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('brightdata_integration', '0008_add_source_fields'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='scraperrequest',
            name='iac_no',
        ),
    ] 