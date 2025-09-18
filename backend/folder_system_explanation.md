# Track-Futura Folder System Explanation

## Overview

Track-Futura uses a **dual-layer folder system** that combines **platform-agnostic unified folders** with **platform-specific folders** to provide both flexibility and organization. This system allows for cross-platform data management while maintaining platform-specific features.

## Folder Hierarchy Structure

```
ScrapingRun (workflow.ScrapingRun)
├── Platform Folders (UnifiedRunFolder - folder_type='platform')
│   ├── Service Folders (UnifiedRunFolder - folder_type='service')
│   │   ├── Job Folders (UnifiedRunFolder - folder_type='job')
│   │   │   └── Platform-Specific Folders (instagram_data.Folder, facebook_data.Folder, etc.)
│   │   │       └── Content (Posts, Comments, Reels)
│   │   └── Content Folders (UnifiedRunFolder - folder_type='content') [Legacy]
│   └── Content Folders (UnifiedRunFolder - folder_type='content') [Legacy]
```

## 1. UnifiedRunFolder (Platform-Agnostic)

**Location**: `backend/track_accounts/models.py`

### Purpose
- **Platform-agnostic** folder management
- **Unified hierarchy** across all platforms
- **Cross-platform** data organization
- **Frontend navigation** structure

### Key Fields
```python
class UnifiedRunFolder(models.Model):
    # Identity
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Hierarchy
    folder_type = models.CharField(choices=[
        ('run', 'Run'),           # Top-level scraping run
        ('platform', 'Platform'), # Platform level (Instagram, Facebook, etc.)
        ('service', 'Service'),   # Service level (Posts, Reels, Comments)
        ('job', 'Job'),          # Individual scraping job
        ('content', 'Content'),   # Legacy content folders
    ])
    category = models.CharField(choices=[
        ('posts', 'Posts'),
        ('reels', 'Reels'), 
        ('comments', 'Comments'),
    ])
    
    # Platform/Service Identity
    platform_code = models.CharField(choices=[
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
        ('linkedin', 'LinkedIn'),
        ('tiktok', 'TikTok'),
    ])
    service_code = models.CharField(choices=[
        ('posts', 'Posts'),
        ('reels', 'Reels'),
        ('comments', 'Comments'),
        ('profiles', 'Profiles'),
    ])
    
    # Relationships
    project = models.ForeignKey(Project, ...)
    scraping_run = models.ForeignKey('workflow.ScrapingRun', ...)
    parent_folder = models.ForeignKey('self', ...)  # Self-referencing for hierarchy
```

### Folder Types Explained

#### 1. **Run Folders** (`folder_type='run'`)
- **Purpose**: Top-level container for a complete scraping run
- **Example**: "Scraping Run - 2025-08-10 09:02"
- **Contains**: Multiple platform folders
- **Frontend**: Shows as main run container

#### 2. **Platform Folders** (`folder_type='platform'`)
- **Purpose**: Organize data by platform
- **Example**: "Instagram", "Facebook", "LinkedIn"
- **Contains**: Multiple service folders
- **Frontend**: Shows platform selection

#### 3. **Service Folders** (`folder_type='service'`)
- **Purpose**: Organize data by service type
- **Example**: "Instagram - Posts", "Facebook - Reels"
- **Contains**: Multiple job folders
- **Frontend**: Shows service selection

#### 4. **Job Folders** (`folder_type='job'`)
- **Purpose**: Individual scraping job results
- **Example**: "Instagram Profile - changyonggggg"
- **Contains**: Platform-specific folders with actual content
- **Frontend**: Shows job results

#### 5. **Content Folders** (`folder_type='content'`) [Legacy]
- **Purpose**: Legacy content organization
- **Example**: "Instagram Posts - Test Account"
- **Contains**: Direct content (deprecated approach)

## 2. Platform-Specific Folders

**Location**: `backend/[platform]_data/models.py` (e.g., `instagram_data/models.py`)

### Purpose
- **Platform-specific** data storage
- **Actual content** containers
- **Platform features** and metadata
- **Direct content** relationships

### Example: Instagram Folder
```python
class Folder(models.Model):  # instagram_data.Folder
    # Basic Info
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(choices=[
        ('posts', 'Posts'),
        ('reels', 'Reels'),
        ('comments', 'Comments'),
    ])
    
    # Hierarchy
    folder_type = models.CharField(choices=[
        ('run', 'Scraping Run'),
        ('service', 'Platform Service'),
        ('content', 'Content Folder'),
    ])
    parent_folder = models.ForeignKey('self', ...)
    
    # Key Relationship
    unified_job_folder = models.ForeignKey(
        'track_accounts.UnifiedRunFolder', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='instagram_platform_folders'
    )
    
    # Content Relationships
    posts = models.ManyToManyField('InstagramPost', ...)
    comments = models.ManyToManyField('InstagramComment', ...)
```

## 3. Content Models

### Platform-Specific Content
Each platform has its own content models:

#### Instagram
- `InstagramPost` - Posts and reels
- `InstagramComment` - Comments

#### Facebook
- `FacebookPost` - Posts and reels
- `FacebookComment` - Comments

#### LinkedIn
- `LinkedInPost` - Posts and articles
- `LinkedInComment` - Comments

#### TikTok
- `TikTokPost` - Videos and posts

## 4. How the System Works

### Data Flow
```
1. ScrapingRun Created
   ↓
2. UnifiedRunFolder (run) Created
   ↓
3. UnifiedRunFolder (platform) Created
   ↓
4. UnifiedRunFolder (service) Created
   ↓
5. UnifiedRunFolder (job) Created
   ↓
6. Platform-Specific Folder Created (linked to UnifiedRunFolder)
   ↓
7. Content Stored in Platform-Specific Models
```

### Webhook Processing
```
1. BrightData sends webhook with data
2. System finds ScraperRequest by snapshot_id
3. ScraperRequest.folder_id points to UnifiedRunFolder (job)
4. System creates/links platform-specific folder
5. Content stored in platform-specific models
6. Platform-specific folder linked to UnifiedRunFolder
```

### Frontend Navigation
```
1. User sees UnifiedRunFolder hierarchy
2. Clicks on job folder (UnifiedRunFolder)
3. Frontend resolves to platform-specific folder
4. Platform-specific API returns content
5. Content displayed with platform-specific features
```

## 5. Key Relationships

### One-to-Many Relationships
- **ScrapingRun** → **UnifiedRunFolder** (run)
- **UnifiedRunFolder** → **UnifiedRunFolder** (parent/child hierarchy)
- **UnifiedRunFolder** (job) → **Platform-Specific Folder**

### Many-to-One Relationships
- **Platform-Specific Folder** → **UnifiedRunFolder** (via `unified_job_folder`)
- **Content Models** → **Platform-Specific Folder**

### Cross-Platform Relationships
- **UnifiedRunFolder** can contain multiple platform-specific folders
- **ServiceFolderIndex** provides fast lookup for service folders

## 6. Benefits of This System

### 1. **Unified Navigation**
- Single hierarchy for all platforms
- Consistent user experience
- Cross-platform data organization

### 2. **Platform Flexibility**
- Platform-specific features preserved
- Platform-specific APIs maintained
- Platform-specific data models

### 3. **Scalability**
- Easy to add new platforms
- Maintains existing platform functionality
- Supports complex hierarchies

### 4. **Data Integrity**
- Clear relationships between folders
- Proper content organization
- Consistent data flow

## 7. Example Real-World Usage

### Scenario: Instagram Profile Scraping
```
1. User creates scraping run for Instagram profiles
2. System creates:
   - UnifiedRunFolder: "Scraping Run - 2025-08-10" (run)
   - UnifiedRunFolder: "Instagram" (platform)
   - UnifiedRunFolder: "Instagram - Posts" (service)
   - UnifiedRunFolder: "Instagram Profile - changyonggggg" (job)
   - Instagram Folder: "Instagram Profile - changyonggggg" (platform-specific)
3. BrightData sends webhook with Instagram posts
4. System stores posts in InstagramPost model
5. Posts linked to Instagram Folder
6. Instagram Folder linked to UnifiedRunFolder
7. Frontend shows unified hierarchy with platform-specific content
```

### Frontend Display
```
📁 Scraping Run - 2025-08-10
  📁 Instagram
    📁 Instagram - Posts
      📁 Instagram Profile - changyonggggg (1 post)
        📄 https://www.instagram.com/p/DKUUkmVTvVL
```

This system provides the best of both worlds: **unified organization** with **platform-specific functionality**.
