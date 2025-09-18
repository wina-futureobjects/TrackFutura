# Generated manually to update social media fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("track_accounts", "0007_remove_trackaccount_folder_delete_trackaccountfolder"),
    ]

    operations = [
        # Remove username fields
        migrations.RemoveField(
            model_name="trackaccount",
            name="facebook_username",
        ),
        migrations.RemoveField(
            model_name="trackaccount",
            name="instagram_username",
        ),
        migrations.RemoveField(
            model_name="trackaccount",
            name="linkedin_username",
        ),
        migrations.RemoveField(
            model_name="trackaccount",
            name="tiktok_username",
        ),
        # Rename ID fields to link fields
        migrations.RenameField(
            model_name="trackaccount",
            old_name="facebook_id",
            new_name="facebook_link",
        ),
        migrations.RenameField(
            model_name="trackaccount",
            old_name="instagram_id",
            new_name="instagram_link",
        ),
        migrations.RenameField(
            model_name="trackaccount",
            old_name="linkedin_id",
            new_name="linkedin_link",
        ),
        migrations.RenameField(
            model_name="trackaccount",
            old_name="tiktok_id",
            new_name="tiktok_link",
        ),
    ] 