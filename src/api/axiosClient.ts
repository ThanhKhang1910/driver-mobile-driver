import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Lấy IP của máy tính đang chạy Expo Dev Server để kết nối từ thiết bị thật hoặc máy ảo
const getBaseURL = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  const localhost = hostUri ? hostUri.split(':')[0] : 'localhost';
  
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

export default axiosClient;
export { getBaseURL };
