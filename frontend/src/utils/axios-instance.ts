import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_NODE_ENV === 'dev' ? import.meta.env.VITE_DEV_BACKEND_URL : import.meta.env.VITE_PROD_BACKEND_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
