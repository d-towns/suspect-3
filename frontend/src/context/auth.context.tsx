// src/AuthContext.tsx

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axiosInstance from '../utils/axios-instance';
import {supabase} from '../utils/supabase-client';

// Define the User interface
interface User {
  id: string;
  email: string;
  username: string;
}

// Define the AuthContext type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  guestSignIn: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Create the AuthContext with an undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

const authRedirectUrl = (import.meta.env.VITE_NODE_ENV === 'dev' ? import.meta.env.VITE_DEV_FRONTEND_URL : import.meta.env.VITE_PROD_FRONTEND_URL) + '/token';

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
      const response = await api.get('users/get-user', {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json, text/plain, */*',
        },
      });
      console.log('Check auth response:', response);
      const userData = {
        id: response.data.user.id,
        email: response.data.user.email,
        username: response.data.user.user_metadata.username
      }
      setUser(userData);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle user login
  // const login = async (email: string, password: string, provider: string = 'none') => {
  //   setLoading(true);
  //   try {
  //     const response = await api.post('users/login', { email, password, provider });
  //     const userData = {
  //       id: response.data.session.user.id,
  //       email: response.data.session.user.email,
  //       username: response.data.session.user.user_metadata.username
  //     }
  //     setUser(userData);
  //   } catch (error) {
  //     console.error('Login error:', error);
  //     throw error;
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const login = async (email: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // set this to false if you do not want the user to be automatically signed up
          shouldCreateUser: true,
          emailRedirectTo: authRedirectUrl,
          data: {
            username: email.split('@')[0],
          }
        },
      })
      setUser(data?.user);
      if (error) {
        console.error('Login error:', error);
        throw error;
      }
      console.log('Login response:', data);

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };


  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      // const response = await api.post('users/login', { provider: 'google' });
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { scopes: 'email', redirectTo: authRedirectUrl,  }
      });
      // const userData = {
      //   id: response.data.session.user.id,
      //   email: response.data.session.user.email,
      //   username: response.data.session.user.user_metadata.username
      // }
      // setUser(userData);
      
    } catch (error) {
      console.error('Provider login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }


  const guestSignIn = async (username: string) => {
    setLoading(true);
    try {
      const response = await api.post('users/guest-sign-in', { username });
      const userData = {
        id: response.data.session.user.id,
        email: response.data.session.user.email,
        username: response.data.session.user.user_metadata.username
      }
      setUser(userData);
    } catch (error) {
      console.error('Guest sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  // Function to handle user signup
  const signup = async (email: string, password: string, username: string) => {
    try {
      await api.post('users/sign-up', { email, password, username });
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  // Function to handle user logout 
  const logout = async () => {
    try {
      await api.post('users/logout');
      // const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_SECRET_KEY,
      // );
      await supabase.auth.signOut();
      console.log('User logged out');
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
    guestSignIn,
    checkAuth,
    loginWithGoogle,
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