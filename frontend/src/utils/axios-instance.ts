import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_NODE_ENV === 'dev' ? import.meta.env.VITE_DEV_BACKEND_URL : import.meta.env.VITE_PROD_BACKEND_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(config => {
  // Get token from localStorage
  const token = localStorage.getItem('access_token');
  
  // If token exists, add it to request headers
  if (token) {
      config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

export default axiosInstance;
