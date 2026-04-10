"use client"

import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '@/lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    const clearSession = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      if (!canceled) setUser(null);
    };

    const bootstrapSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (!canceled) setLoading(false);
        return;
      }

      try {
        const response = await authAPI.getMe();
        const userData = {
          id: response.data.id,
          name: response.data.name,
          role: response.data.role,
          email: response.data.email || '',
          phone: response.data.phone || null,
          isLeadInstructor: response.data.isLeadInstructor,
        };
        localStorage.setItem('user', JSON.stringify(userData));
        if (!canceled) setUser(userData);
      } catch {
        clearSession();
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    
    bootstrapSession();
    return () => {
      canceled = true;
    };
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { access: token } = response.data;
      
      localStorage.setItem('token', token);
      
      // Decode the JWT to get user data
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const userData = {
        id: payload.id,
        name: payload.name,
        role: payload.role,
        email: payload.email || '',
        isLeadInstructor: payload.isLeadInstructor
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const data = error.response?.data;
      const msg =
        (typeof data?.message === 'string' && data.message) ||
        (typeof data?.error === 'string' && data.error) ||
        'Login failed';
      return {
        success: false,
        error: msg,
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  /** Replace JWT and user state after profile update (new token includes updated name/email). */
  const setSessionFromToken = (accessToken) => {
    localStorage.setItem('token', accessToken);
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const userData = {
      id: payload.id,
      name: payload.name,
      role: payload.role,
      email: payload.email || '',
      isLeadInstructor: payload.isLeadInstructor,
    };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    setSessionFromToken,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
