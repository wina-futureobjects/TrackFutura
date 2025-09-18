# Generated manually to remove unused fields from TrackSource model
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('track_accounts', '0009_rename_trackaccount_to_tracksource'),
    ]

    operations = [
        # Remove indexes first before removing fields
        migrations.RemoveIndex(
            model_name='tracksource',
            name='track_accou_iac_no_3db030_idx',
        ),
        migrations.RemoveIndex(
            model_name='tracksource',
            name='track_accou_risk_cl_6a4e41_idx',
        ),
        
        # Remove unused fields from TrackSource
        migrations.RemoveField(
            model_name='tracksource',
            name='iac_no',
        ),
        migrations.RemoveField(
            model_name='tracksource',
            name='risk_classification',
        ),
        migrations.RemoveField(
            model_name='tracksource',
            name='close_monitoring',
        ),
        migrations.RemoveField(
            model_name='tracksource',
            name='posting_frequency',
        ),
        
        # Remove unused fields from ReportEntry
        migrations.RemoveField(
            model_name='reportentry',
            name='iac_no',
        ),
        migrations.RemoveField(
            model_name='reportentry',
            name='close_monitoring',
        ),
    ] 