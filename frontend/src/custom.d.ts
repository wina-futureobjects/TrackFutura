// Custom type declarations
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.bmp';
declare module '*.tiff';

// Component declarations for TypeScript
declare module './pages/LinkedInDataUpload' {
  const LinkedInDataUpload: React.ComponentType;
  export default LinkedInDataUpload;
}

declare module './pages/LinkedInFolders' {
  const LinkedInFolders: React.ComponentType;
  export default LinkedInFolders;
}

declare module './pages/TikTokFolders' {
  const TikTokFolders: React.ComponentType;
  export default TikTokFolders;
} 