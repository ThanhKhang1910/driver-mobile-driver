import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

import { Platform } from 'react-native';

// IP máy tính chạy backend — cập nhật khi đổi mạng Wi-Fi
const BACKEND_IP = '192.168.0.103';

const getBaseURL = () => {
  // Android Emulator dùng địa chỉ đặc biệt 10.0.2.2 thay vì localhost
  if (Platform.OS === 'android') {
    const hostUri = Constants.expoConfig?.hostUri;
    const host = hostUri ? hostUri.split(':')[0] : BACKEND_IP;
    const ip = (host === 'localhost' || host === '127.0.0.1') ? '10.0.2.2' : BACKEND_IP;
    return `http://${ip}:5005/api/v1`;
  }

  // iOS (điện thoại thật hoặc tunnel) — luôn dùng IP máy tính trực tiếp
  return `http://${BACKEND_IP}:5005/api/v1`;
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
