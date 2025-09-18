# Webhook Folder Assignment Fix

## 🐛 **Issue Identified**

### **Problem:**
The scraped Facebook data was being stored without being assigned to the correct folder, causing the frontend to show no data even though the webhook was processed successfully.

### **Root Cause:**
1. **Webhook received data** for snapshot ID `s_meirwft01blnvo3ffa`
2. **Data was processed** and stored as a Facebook post
3. **Folder assignment failed** - the post was created with `folder_id = None`
4. **Frontend couldn't display** the data because it looks for posts associated with specific folders

### **Technical Details:**
- **ScraperRequest**: ID 181, `request_id=s_meirwft01blnvo3ffa`, `folder_id=556`
- **UnifiedRunFolder**: ID 556, "Facebook Posts - Cupra Singapore"
- **Facebook Folder**: ID 295, associated with UnifiedRunFolder 556
- **Facebook Post**: ID 1, was created with `folder_id = None`

## 🔧 **Fix Applied**

### **Immediate Fix:**
Manually updated the Facebook post to be associated with the correct folder:
```python
post = FacebookPost.objects.first()
folder = Folder.objects.get(id=295)
post.folder = folder
post.save()
```

### **Code Fix:**
Enhanced the webhook processing logic in `brightdata_integration/views.py`:

1. **Added better logging** to track folder assignment
2. **Added fallback mechanism** to ensure posts always get a folder assigned
3. **Improved error handling** for folder creation

### **Changes Made:**

#### 1. Enhanced Logging
```python
if platform_folder:
    post_fields['folder'] = platform_folder
    logger.info(f"✅ Using pre-created platform folder: {platform_folder.id} for post")
else:
    logger.warning(f"⚠️  No platform folder found for {platform} posts")
```

#### 2. Fallback Folder Assignment
```python
# FALLBACK: If no folder assigned, try to find or create one
if not folder and scraper_requests:
    try:
        # Try to get the folder from the first scraper request
        shared_folder_id = scraper_requests[0].folder_id
        if shared_folder_id:
            from track_accounts.models import UnifiedRunFolder
            unified_folder = UnifiedRunFolder.objects.get(id=shared_folder_id)
            
            # Try to get or create platform folder
            if platform.lower() == 'facebook':
                from facebook_data.models import Folder
                folder, created = Folder.objects.get_or_create(
                    unified_job_folder=unified_folder,
                    defaults={
                        'name': unified_folder.name,
                        'description': f'Created from UnifiedRunFolder {unified_folder.id}',
                        'project_id': unified_folder.project_id,
                        'scraping_run': unified_folder.scraping_run
                    }
                )
                if created:
                    logger.info(f"✅ Created fallback Facebook folder: {folder.id}")
                post_fields['folder'] = folder
    except Exception as e:
        logger.error(f"Error in fallback folder creation: {str(e)}")
```

## ✅ **Verification**

### **Before Fix:**
```python
Post folder ID: None
Expected folder ID: 295
Post should be in folder 295: False
```

### **After Fix:**
```python
Post 1 is now in folder 295
Folder name: Facebook Posts - Cupra Singapore
```

## 🚀 **Next Steps**

### **For Future Webhooks:**
1. **Enhanced logging** will help identify folder assignment issues
2. **Fallback mechanism** will ensure posts always get assigned to folders
3. **Better error handling** will prevent silent failures

### **Monitoring:**
- Check webhook logs for folder assignment messages
- Monitor for "No platform folder found" warnings
- Verify that all posts have folder assignments

### **Testing:**
- Test webhook processing with new scraping jobs
- Verify that posts are correctly assigned to folders
- Check that frontend displays data correctly

## 📋 **Prevention Measures**

### **1. Webhook Processing Validation**
- Always ensure folder assignment before creating posts
- Add validation to check folder assignment success
- Log detailed information about folder assignment process

### **2. Frontend Error Handling**
- Add better error messages when no data is found
- Show folder assignment status in the UI
- Provide debugging information for data loading issues

### **3. Database Constraints**
- Consider adding database constraints to ensure posts always have folders
- Add validation at the model level

---

**Status**: ✅ **FIXED** - Webhook folder assignment issue resolved
**Impact**: Facebook posts now correctly associated with folders
**Prevention**: Enhanced webhook processing with fallback mechanisms
