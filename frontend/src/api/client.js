import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://dropclock-n5o9.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('dropclock_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;

