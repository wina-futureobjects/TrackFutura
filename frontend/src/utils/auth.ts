/**
 * Authentication utilities
 */

/**
 * User role type definition
 */
export type UserRole = 'super_admin' | 'tenant_admin' | 'user';

/**
 * User interface
 */
interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  global_role?: {
    role: UserRole;
    role_display: string;
  };
}

/**
 * Check if user is authenticated by looking for auth token in localStorage
 */
export const isAuthenticated = (): boolean => {
  // Check for auth token
  return !!localStorage.getItem('authToken');
  
  // For development testing without auth, uncomment below:
  // return true;
};

/**
 * Get the authentication token
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

/**
 * Set the authentication token
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

/**
 * Clear the authentication token (logout)
 */
export const clearAuthToken = (): void => {
  localStorage.removeItem('authToken');
};

/**
 * Clear all user data from localStorage
 */
export const clearUserData = (): void => {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('user');
  localStorage.removeItem('userSettings');
  localStorage.removeItem('currentOrganization');
  localStorage.removeItem('currentProject');
  
  // Clear any session storage data as well
  sessionStorage.removeItem('currentUser');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('userSettings');
};

/**
 * Log out the user by clearing auth token and redirecting to login
 */
export const logout = (): void => {
  // Clear auth token
  clearAuthToken();
  
  // Clear all user-related data
  clearUserData();
  
  // The redirection to login page is handled in the component 
  // to ensure proper cleanup of React components
};

/**
 * Get the current user from localStorage
 */
export const getCurrentUser = (): User | null => {
  const userJson = localStorage.getItem('currentUser');
  return userJson ? JSON.parse(userJson) : null;
};

/**
 * Set the current user in localStorage
 */
export const setCurrentUser = (user: User): void => {
  localStorage.setItem('currentUser', JSON.stringify(user));
};

/**
 * Get the user's role
 */
export const getUserRole = (): UserRole => {
  const user = getCurrentUser();
  // For development testing, return 'super_admin' if no user found (TEMPORARY)
  return user?.global_role?.role || 'super_admin';
};

/**
 * Check if the user has the required role
 */
export const hasRole = (requiredRole: UserRole): boolean => {
  const userRole = getUserRole();
  
  // Super admin can access everything
  if (userRole === 'super_admin') return true;
  
  // Tenant admin can access tenant admin and user routes
  if (userRole === 'tenant_admin' && (requiredRole === 'tenant_admin' || requiredRole === 'user')) return true;
  
  // User can only access user routes
  if (userRole === 'user' && requiredRole === 'user') return true;
  
  return false;
}; 