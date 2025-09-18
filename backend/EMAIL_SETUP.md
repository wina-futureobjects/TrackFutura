# Email Setup for User Creation

This application now supports automatic email notifications when creating new users. The system will generate a secure random password and send it to the user's email address.

## Quick Setup Guide

### Step 1: Create Environment File

1. Navigate to the `backend/` directory
2. Copy the example environment file:
   ```bash
   cp env.example .env
   ```
3. Edit the `.env` file with your email credentials

### Step 2: Configure Email Settings

#### For Gmail (Recommended for development)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account settings > Security > App passwords
   - Select "Mail" as the app
   - Copy the generated 16-character password
3. **Update your `.env` file**:
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-16-character-app-password
   DEFAULT_FROM_EMAIL=your-email@gmail.com
   ```

#### For Other Email Providers

**Outlook/Hotmail:**
```bash
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@outlook.com
EMAIL_HOST_PASSWORD=your-password
DEFAULT_FROM_EMAIL=your-email@outlook.com
```

**Yahoo:**
```bash
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@yahoo.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=your-email@yahoo.com
```

**Custom SMTP Server:**
```bash
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-username
EMAIL_HOST_PASSWORD=your-password
DEFAULT_FROM_EMAIL=your-email@yourdomain.com
```

### Step 3: Test Email Configuration

1. **Start the Django development server**:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Create a test user** through the admin dashboard to verify email sending

3. **Check for emails**:
   - In development mode: Emails will be printed to the console
   - In production: Emails will be sent to the specified address

## Development Mode Behavior

When `DEBUG=True` in your `.env` file, emails will be printed to the console instead of being sent. This is useful for testing without configuring a real email server.

To see emails in the console, make sure your `.env` file has:
```bash
DEBUG=True
```

## Production Configuration

For production deployment:

1. Set `DEBUG=False` in your environment variables
2. Ensure all email credentials are properly configured
3. Use a reliable email service (Gmail, SendGrid, AWS SES, etc.)
4. Consider using environment variables in your deployment platform

## User Creation Process

1. Super Admin fills in username and email in the admin dashboard
2. System generates a secure 16-character random password
3. User account is created with the generated password
4. Welcome email is sent to the user's email address with:
   - Username
   - Email address
   - Generated password
   - Login URL
   - Security reminder to change password

## Email Template

The welcome email uses a template located at `backend/templates/emails/welcome_email.txt` which can be customized as needed.

## Troubleshooting

### Common Issues

1. **"Authentication failed" error**:
   - Check that you're using an app password, not your regular password
   - Ensure 2FA is enabled on your Google account
   - Verify the email and password are correct

2. **"Connection refused" error**:
   - Check your firewall settings
   - Verify the SMTP host and port are correct
   - Ensure TLS is enabled

3. **Emails not sending in production**:
   - Check that `DEBUG=False`
   - Verify all environment variables are set
   - Check your email service provider's sending limits

### Testing Email Configuration

You can test the email configuration by running:
```bash
cd backend
python manage.py shell
```

Then in the Python shell:
```python
from django.core.mail import send_mail
from django.conf import settings

send_mail(
    'Test Email',
    'This is a test email from Track-Futura',
    settings.DEFAULT_FROM_EMAIL,
    ['your-test-email@example.com'],
    fail_silently=False,
)
```

## Security Notes

- Passwords are generated using Django's `get_random_string()` function
- Passwords include uppercase, lowercase, numbers, and special characters
- Users are advised to change their password after first login
- Email sending failures don't prevent user creation (logged as errors)
- Never commit your `.env` file to version control
- Use app passwords instead of regular passwords for email services 