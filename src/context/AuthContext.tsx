import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { registerForPushNotificationsAsync } from '../utils/pushNotifications';
import axiosClient from '../api/axiosClient';

export interface User {
  id: number;
  user_id?: number | string;
  email: string;
  fullName: string;
  phone?: string;
  role?: string;
  isPremium?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (userData: User, authToken: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  refreshUser: (updatedUser: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const updatePushTokenOnServer = async () => {
    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await axiosClient.put('/auth/push-token', { token: pushToken });
        console.log('Push token synced with server');
      }
    } catch (error) {
      console.warn('Failed to sync push token with server', error);
    }
  };

  useEffect(() => {
    const loadStorageData = async () => {
      const safeGetItemAsync = async (key: string) => {
        try {
          return await Promise.race([
            SecureStore.getItemAsync(key),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
          ]);
        } catch (err) {
          console.warn(`SecureStore error/timeout for ${key}`, err);
          return null;
        }
      };

      try {
        const storedToken = await safeGetItemAsync('token');
        const storedUser = await safeGetItemAsync('user');

        if (storedToken) {
          setToken(storedToken);
          // Set axios default header manually here just in case before updating token
          axiosClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          // Register push notifications when app starts and user is already logged in
          setTimeout(updatePushTokenOnServer, 2000);
        }
      } catch (e) {
        console.error('Failed to load auth data from SecureStore:', e);
      } finally {
        setLoading(false);
      }
    };

    loadStorageData();
  }, []);

  const login = async (userData: User, authToken: string) => {
    try {
      setUser(userData);
      setToken(authToken);
      await SecureStore.setItemAsync('token', authToken);
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      
      // Setup auth header explicitly before making the push-token request
      axiosClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      setTimeout(updatePushTokenOnServer, 1000);
    } catch (e) {
      console.error('Failed to save auth data in login:', e);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    } catch (e) {
      console.error('Failed to clear auth data in logout:', e);
    }
  };

  const refreshUser = async (updatedUser: User) => {
    try {
      setUser(updatedUser);
      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
    } catch (e) {
      console.error('Failed to refresh user data:', e);
    }
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
