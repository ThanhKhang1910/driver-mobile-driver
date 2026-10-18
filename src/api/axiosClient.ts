import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

import { Platform } from 'react-native';

import * as Device from 'expo-device';

// IP Wi-Fi hiện tại của máy tính (cập nhật khi đổi mạng Wi-Fi)
const CURRENT_LAN_IP = '192.168.102.43';

const getBaseURL = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5005/api/v1';
  }

  // 1. Android Emulator: Luôn trỏ về 10.0.2.2
  if (Platform.OS === 'android' && !Device.isDevice) {
    return 'http://10.0.2.2:5005/api/v1';
  }

  // 2. Thiết bị thật (iPhone / Android thật):
  const hostUri = Constants.expoConfig?.hostUri;
  let host = hostUri ? hostUri.split(':')[0] : CURRENT_LAN_IP;

  // Nếu host là link tunnel của Expo (*.exp.direct), ngrok không mở port 5005 -> Ép dùng IP Wi-Fi máy tính
  if (host.includes('exp.direct') || host.includes('tunnel') || host === 'localhost' || host === '127.0.0.1') {
    host = CURRENT_LAN_IP;
  }

  return `http://${host}:5005/api/v1`;
};

const axiosClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor tự động gán JWT Token từ SecureStore vào các request
axiosClient.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching token from SecureStore:', error);
  }
  return config;
});

// Interceptor xử lý lỗi từ response (ví dụ: 401 JWT expired)
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log('Token expired or unauthorized, logging out...');
      // Xóa cache cũ
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      await AsyncStorage.removeItem('isOnline');
      
      // Đẩy về trang đăng nhập
      if (router) {
        router.replace('/(auth)/login');
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
export { getBaseURL };
