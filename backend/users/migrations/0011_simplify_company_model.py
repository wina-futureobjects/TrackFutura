# Generated manually to simplify Company model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_remove_company_email_field'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='company',
            name='phone',
        ),
        migrations.RemoveField(
            model_name='company',
            name='address',
        ),
        migrations.RemoveField(
            model_name='company',
            name='website',
        ),
        migrations.RemoveField(
            model_name='company',
            name='industry',
        ),
        migrations.RemoveField(
            model_name='company',
            name='size',
        ),
        migrations.RemoveField(
            model_name='company',
            name='notes',
        ),
        migrations.RemoveField(
            model_name='company',
            name='contact_person',
        ),
        migrations.RemoveField(
            model_name='company',
            name='contact_email',
        ),
        migrations.RemoveField(
            model_name='company',
            name='contact_phone',
        ),
        migrations.RemoveField(
            model_name='company',
            name='created_by',
        ),
    ] 