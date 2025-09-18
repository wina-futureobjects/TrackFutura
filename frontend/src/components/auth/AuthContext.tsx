import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isAuthenticated, getUserRole, UserRole } from '../../utils/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = () => {
      const authStatus = isAuthenticated();
      setAuthenticated(authStatus);
      if (authStatus) {
        setUserRole(getUserRole());
      } else {
        setUserRole(null);
      }
    };

    checkAuth();
  }, []);

  const login = (token: string) => {
    localStorage.setItem('authToken', token);
    setAuthenticated(true);
    setUserRole(getUserRole());
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    setAuthenticated(false);
    setUserRole(null);
  };

  const value: AuthContextType = {
    isAuthenticated: authenticated,
    userRole,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Commented out to fix Fast Refresh incompatibility
// This export was causing React Fast Refresh issues
// Components now use their own inline auth implementations
/* 
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
*/ 