import { NavigateFunction } from 'react-router-dom';

/**
 * Navigation utility for organization/project context routes
 */
export class OrgProjectNavigator {
  private organizationId: string;
  private projectId: string;
  private navigate: NavigateFunction;

  constructor(organizationId: string, projectId: string, navigate: NavigateFunction) {
    this.organizationId = organizationId;
    this.projectId = projectId;
    this.navigate = navigate;
  }

  /**
   * Get the base path for the current organization/project
   */
  get basePath(): string {
    return `/organizations/${this.organizationId}/projects/${this.projectId}`;
  }

  /**
   * Navigate to dashboard
   */
  toDashboard() {
    this.navigate(this.basePath);
  }

  /**
   * Navigate to source tracking
   */
  toSourceTracking(subPath?: string) {
    const base = `${this.basePath}/source-tracking`;
    this.navigate(subPath ? `${base}/${subPath}` : base);
  }

  /**
   * Navigate to analysis
   */
  toAnalysis() {
    this.navigate(`${this.basePath}/analysis`);
  }

  /**
   * Navigate to Instagram data
   */
  toInstagram(subPath?: string) {
    const base = `${this.basePath}/instagram-folders`;
    this.navigate(subPath ? `${base}/${subPath}` : base);
  }

  /**
   * Navigate to Facebook data
   */
  toFacebook(subPath?: string) {
    const base = `${this.basePath}/facebook-folders`;
    this.navigate(subPath ? `${base}/${subPath}` : base);
  }

  /**
   * Navigate to LinkedIn data
   */
  toLinkedIn(subPath?: string) {
    const base = `${this.basePath}/linkedin-folders`;
    this.navigate(subPath ? `${base}/${subPath}` : base);
  }

  /**
   * Navigate to TikTok data
   */
  toTikTok(subPath?: string) {
    const base = `${this.basePath}/tiktok-folders`;
    this.navigate(subPath ? `${base}/${subPath}` : base);
  }

  /**
   * Navigate to reports
   */
  toReports(subPath?: string) {
    const base = `${this.basePath}/report-folders`;
    this.navigate(subPath ? `${base}/${subPath}` : base);
  }

  /**
   * Navigate to generated reports
   */
  toGeneratedReports() {
    this.navigate(`${this.basePath}/reports/generated`);
  }

  /**
   * Navigate to report marketplace
   */
  toReportMarketplace(reportId?: string) {
    const base = `${this.basePath}/report`;
    this.navigate(reportId ? `${base}/${reportId}` : base);
  }

  /**
   * Navigate to comments scraper
   */
  toCommentsScraper() {
    this.navigate(`${this.basePath}/comments-scraper`);
  }

  /**
   * Navigate to Facebook comment scraper
   */
  toFacebookCommentsScraper() {
    this.navigate(`${this.basePath}/facebook-comment-scraper`);
  }

  /**
   * Navigate to BrightData settings
   */
  toBrightDataSettings() {
    this.navigate(`${this.basePath}/brightdata-settings`);
  }

  /**
   * Navigate to automated batch scraper
   */
  toAutomatedScraper() {
    this.navigate(`${this.basePath}/automated-batch-scraper`);
  }

  /**
   * Navigate to settings
   */
  toSettings() {
    this.navigate(`${this.basePath}/settings`);
  }

  /**
   * Navigate to custom path within organization/project context
   */
  toCustomPath(path: string) {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    this.navigate(`${this.basePath}/${cleanPath}`);
  }
}

/**
 * Hook to create organization/project navigator
 */
export const useOrgProjectNavigator = (
  organizationId: string | undefined, 
  projectId: string | undefined, 
  navigate: NavigateFunction
): OrgProjectNavigator | null => {
  if (!organizationId || !projectId) {
    return null;
  }
  return new OrgProjectNavigator(organizationId, projectId, navigate);
};

/**
 * Generate organization/project route paths
 */
export const generateOrgProjectPath = (
  organizationId: string,
  projectId: string,
  path?: string
): string => {
  const basePath = `/organizations/${organizationId}/projects/${projectId}`;
  if (!path) return basePath;
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${basePath}/${cleanPath}`;
};

/**
 * Check if a route has proper organization/project structure
 */
export const hasOrgProjectStructure = (pathname: string): boolean => {
  const pathSegments = pathname.split('/');
  return (
    pathSegments.includes('organizations') && 
    pathSegments.includes('projects') &&
    pathSegments.length >= 5 // /organizations/:id/projects/:id/...
  );
};

/**
 * Extract organization and project IDs from a path
 */
export const extractOrgProjectIds = (pathname: string): { organizationId?: string; projectId?: string } => {
  const pathSegments = pathname.split('/');
  const orgIndex = pathSegments.indexOf('organizations');
  const projectIndex = pathSegments.indexOf('projects');
  
  if (orgIndex >= 0 && projectIndex >= 0 && orgIndex < projectIndex) {
    return {
      organizationId: pathSegments[orgIndex + 1],
      projectId: pathSegments[projectIndex + 1]
    };
  }
  
  return {};
}; 