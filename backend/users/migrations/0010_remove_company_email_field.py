# Generated manually to remove email field from Company model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_userprofile_company'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='company',
            name='email',
        ),
    ] 