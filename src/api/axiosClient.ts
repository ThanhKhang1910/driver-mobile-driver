import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

import { Platform } from 'react-native';

// Lấy IP của máy tính đang chạy Expo Dev Server để kết nối từ thiết bị thật hoặc máy ảo
const getBaseURL = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  let localhost = hostUri ? hostUri.split(':')[0] : '192.168.0.105';
  
  // Sửa lỗi Android Emulator không nhận localhost
  if (Platform.OS === 'android' && (localhost === 'localhost' || localhost === '127.0.0.1')) {
    localhost = '10.0.2.2';
  } else if (localhost === 'localhost' || localhost === '127.0.0.1') {
    localhost = '192.168.0.105'; // Ép dùng IP máy tính nếu là điện thoại thật
  }
  
  // Bạn có thể chỉnh sửa cổng (port) ở đây nếu backend đổi cổng
  return `http://${localhost}:5005/api/v1`;
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
