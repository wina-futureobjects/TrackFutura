# Track-Futura Routing Guide

## Overview

Track-Futura uses a hierarchical routing structure that requires users to first select an organization, then a project, before accessing any application features. This ensures proper data organization and security.

## Route Structure

### Required Hierarchy
All feature routes must follow this structure:
```
/organizations/:organizationId/projects/:projectId/[feature]
```

### Example Routes
- Dashboard: `/organizations/3/projects/15`
- Source Tracking: `/organizations/3/projects/15/source-tracking`
- Instagram Data: `/organizations/3/projects/15/instagram-folders`
- Reports: `/organizations/3/projects/15/report-folders`

## Legacy Route Handling

### Automatic Redirection
When users try to access legacy routes (without organization/project context), they are:

1. **Shown an informative error page** explaining why they're being redirected
2. **Their intended destination is saved** in sessionStorage
3. **Redirected to organization selection** after clicking "Select Organization"
4. **Automatically taken to their intended page** after selecting a project

### Legacy Routes Examples
These routes will trigger the redirection flow:
- `/dashboard` → `/organizations/[selected]/projects/[selected]`
- `/track-accounts` → `/organizations/[selected]/projects/[selected]/source-tracking`
- `/instagram-folders` → `/organizations/[selected]/projects/[selected]/instagram-folders`

## Implementation Components

### 1. RouteGuard Component
```typescript
import RouteGuard from './components/auth/RouteGuard';

// Wrap routes that require org/project context
<RouteGuard requireOrgProject={true}>
  <YourComponent />
</RouteGuard>
```

### 2. Navigation Utility
```typescript
import { useOrgProjectNavigator } from './utils/navigation';
import { useNavigate, useParams } from 'react-router-dom';

const MyComponent = () => {
  const navigate = useNavigate();
  const { organizationId, projectId } = useParams();
  const navigator = useOrgProjectNavigator(organizationId, projectId, navigate);

  // Use the navigator for type-safe navigation
  const handleGoToAnalysis = () => {
    navigator?.toAnalysis();
  };

  const handleGoToReports = () => {
    navigator?.toReports('123'); // Go to specific report
  };
};
```

### 3. Path Generation
```typescript
import { generateOrgProjectPath } from './utils/navigation';

// Generate paths programmatically
const dashboardPath = generateOrgProjectPath('3', '15'); 
// Returns: "/organizations/3/projects/15"

const reportsPath = generateOrgProjectPath('3', '15', 'report-folders');
// Returns: "/organizations/3/projects/15/report-folders"
```

## Route Categories

### 1. Public Routes
No authentication required:
- `/login`
- `/register`

### 2. Organization Selection Routes
Require authentication but no project context:
- `/organizations` - List of user's organizations
- `/organizations/:id/projects` - Projects within an organization

### 3. Feature Routes
Require organization + project context:

#### Core Features
- `/organizations/:orgId/projects/:projId` - Project Dashboard
- `/organizations/:orgId/projects/:projId/analysis` - Analysis
- `/organizations/:orgId/projects/:projId/settings` - Settings

#### Source Tracking
- `/organizations/:orgId/projects/:projId/source-tracking` - Main tracking page
- `/organizations/:orgId/projects/:projId/source-tracking/sources` - Sources list
- `/organizations/:orgId/projects/:projId/source-tracking/create` - Add new source
- `/organizations/:orgId/projects/:projId/source-tracking/upload` - Bulk upload
- `/organizations/:orgId/projects/:projId/source-tracking/edit/:id` - Edit source

#### Social Media Data
- `/organizations/:orgId/projects/:projId/instagram-folders`
- `/organizations/:orgId/projects/:projId/facebook-folders`
- `/organizations/:orgId/projects/:projId/linkedin-folders`
- `/organizations/:orgId/projects/:projId/tiktok-folders`

#### Reports
- `/organizations/:orgId/projects/:projId/report-folders` - Report folders
- `/organizations/:orgId/projects/:projId/reports/generated` - Generated reports
- `/organizations/:orgId/projects/:projId/report` - Report marketplace

#### Scrapers
- `/organizations/:orgId/projects/:projId/comments-scraper`
- `/organizations/:orgId/projects/:projId/facebook-comment-scraper`
- `/organizations/:orgId/projects/:projId/brightdata-settings`
- `/organizations/:orgId/projects/:projId/automated-batch-scraper`

## Best Practices

### 1. Always Use Organization/Project Context
When creating new features, always include organization and project IDs in your routes:

```typescript
// ✅ Good
<Route path="/organizations/:organizationId/projects/:projectId/my-feature" element={...} />

// ❌ Bad
<Route path="/my-feature" element={...} />
```

### 2. Use the Navigation Utility
Instead of hardcoding paths, use the navigation utility:

```typescript
// ✅ Good
navigator?.toCustomPath('my-feature');

// ❌ Bad
navigate(`/organizations/${orgId}/projects/${projId}/my-feature`);
```

### 3. Handle Missing Context
Always check for organization and project IDs:

```typescript
const { organizationId, projectId } = useParams();

if (!organizationId || !projectId) {
  return <Navigate to="/organizations" replace />;
}
```

### 4. Protect Routes Properly
Use RouteGuard for all feature routes:

```typescript
<Route path="/organizations/:organizationId/projects/:projectId/my-feature" element={
  <ProtectedRoute>
    <Layout>
      <MyFeatureComponent />
    </Layout>
  </ProtectedRoute>
} />
```

## Error Handling

### Invalid Route Access
Users who try to access routes without proper context see:
- Clear explanation of why they're being redirected
- Information about the required organization/project structure
- Easy way to select their organization
- Automatic redirection to their intended destination after project selection

### 404 Routes
Any undefined routes redirect to `/organizations` to start the proper flow.

## Session Storage

The routing system uses sessionStorage to preserve user intent:
- `intendedDestination` - Stores the original route user was trying to access
- Automatically cleared after successful redirection
- Survives page refreshes during the org/project selection process

## Migration from Legacy Routes

### For Developers
1. **Update all hardcoded routes** to include organization/project context
2. **Use the navigation utility** instead of manual path construction
3. **Wrap feature routes** with RouteGuard
4. **Test legacy route redirection** to ensure smooth user experience

### For Users
- **No action required** - Legacy bookmarks automatically redirect through the selection flow
- **Improved security** - Can't accidentally access wrong organization's data
- **Better organization** - Clear hierarchy of organization → project → feature

## Testing

### Test Cases to Verify
1. **Legacy route redirection** - Try accessing `/dashboard`, `/track-accounts`, etc.
2. **Direct URL access** - Copy/paste organization/project URLs
3. **Navigation between features** - Ensure all navigation stays within project context
4. **Session persistence** - Refresh page during org/project selection
5. **Error handling** - Invalid organization/project IDs

### Example Test Scenarios
```bash
# Should redirect to organization selection
http://localhost:5173/dashboard
http://localhost:5173/track-accounts/accounts

# Should work directly
http://localhost:5173/organizations/3/projects/15
http://localhost:5173/organizations/3/projects/15/source-tracking

# Should show 404 → redirect to organizations
http://localhost:5173/invalid-route
``` 