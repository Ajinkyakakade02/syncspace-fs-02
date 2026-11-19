import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ defaultWorkspaceId?: string; defaultPageId?: string }>;
  register: (name: string, email: string, pass: string, confirm: string) => Promise<{ defaultWorkspaceId?: string; defaultPageId?: string }>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('syncspace_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('syncspace_access_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('syncspace_access_token');
      if (storedToken) {
        try {
          const profile = await authService.getMe();
          setUser(profile);
          localStorage.setItem('syncspace_user', JSON.stringify(profile));
        } catch {
          setUser(null);
          setToken(null);
          localStorage.removeItem('syncspace_access_token');
          localStorage.removeItem('syncspace_user');
        }
      }
      setIsLoading(false);
    };

    checkAuth();

    const handleLogoutEvent = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('syncspace_auth_logout', handleLogoutEvent);
    return () => window.removeEventListener('syncspace_auth_logout', handleLogoutEvent);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authService.login({ email, password: pass });
    const { user: loggedInUser, accessToken, defaultWorkspaceId, defaultPageId } = res.data;
    setUser(loggedInUser);
    setToken(accessToken);
    localStorage.setItem('syncspace_access_token', accessToken);
    localStorage.setItem('syncspace_user', JSON.stringify(loggedInUser));
    return { defaultWorkspaceId, defaultPageId };
  };

  const register = async (name: string, email: string, pass: string, confirm: string) => {
    const res = await authService.register({ name, email, password: pass, confirmPassword: confirm });
    const { user: registeredUser, accessToken, defaultWorkspaceId, defaultPageId } = res.data;
    setUser(registeredUser);
    setToken(accessToken);
    localStorage.setItem('syncspace_access_token', accessToken);
    localStorage.setItem('syncspace_user', JSON.stringify(registeredUser));
    return { defaultWorkspaceId, defaultPageId };
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('syncspace_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
