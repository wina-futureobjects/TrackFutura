# Environment Variables Setup Guide

## Required Environment Variables

### For Platform.sh Deployment:

Set the following environment variables in your Platform.sh console:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# BrightData Configuration  
BRIGHTDATA_WEBHOOK_TOKEN=8af6995e-3baa-4b69-9df7-8d7671e621eb
BRIGHTDATA_BASE_URL=https://trackfutura.futureobjects.io

# Django Configuration
DJANGO_SETTINGS_MODULE=config.settings_production
DEBUG=false
DJANGO_ALLOWED_HOSTS=*
```

### For Upsun Deployment:

Set the following environment variables in your Upsun console:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# BrightData Configuration
BRIGHTDATA_WEBHOOK_TOKEN=8af6995e-3baa-4b69-9df7-8d7671e621eb  
BRIGHTDATA_BASE_URL=https://trackfutura.futureobjects.io

# Django Configuration
DJANGO_SETTINGS_MODULE=config.settings_production
DEBUG=false
DJANGO_ALLOWED_HOSTS=*
```

### For Local Development:

Create a `.env` file in the backend directory:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# BrightData Configuration (for local testing)
BRIGHTDATA_WEBHOOK_TOKEN=8af6995e-3baa-4b69-9df7-8d7671e621eb
BRIGHTDATA_BASE_URL=http://localhost:8000

# Django Configuration
DJANGO_SETTINGS_MODULE=config.settings
DEBUG=true
```

## Security Notes:

1. **Never commit actual API keys to version control**
2. **Use environment variable placeholders in config files**
3. **Set actual values in deployment platform consoles**
4. **Keep `.env` files in `.gitignore`**

## Setting Environment Variables:

### Platform.sh:
```bash
platform variable:create --level=environment --name=OPENAI_API_KEY --value="your-key-here"
```

### Upsun:
```bash
upsun variable:create --level=environment --name=OPENAI_API_KEY --value="your-key-here"
```

### Local Development:
Create `backend/.env` file with the variables listed above.
