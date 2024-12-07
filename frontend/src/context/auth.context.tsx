// src/AuthContext.tsx

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { AxiosResponse } from 'axios';
import axiosInstance from '../utils/axios-instance';

// Define the User interface
interface User {
  id: string;
  email: string;
}

// Define the AuthContext type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Create the AuthContext with an undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Create an Axios instance configured to send cookies
  const api = axiosInstance;

  // Check authentication status on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Function to check if the user is authenticated
  const checkAuth = async () => {
    setLoading(true);
    try {
      const response: AxiosResponse<{ user: User }> = await api.get('users/get-user');
      console.log('Check auth response:', response);
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle user login
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('users/login', { email, password });
      console.log('Login response:', response);
      setUser(response.data.session.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Function to handle user signup
  const signup = async (email: string, password: string, name: string) => {
    try {
      await api.post('users/sign-up', { email, password, name });
      // After successful signup, log the user in
      await login(email, password);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  // Function to handle user logout
  const logout = async () => {
    try {
      await api.post('users/logout');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Define the context value
  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    checkAuth,
  };

  // Return the AuthContext provider with the context value
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};