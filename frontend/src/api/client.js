import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://dropclock-n5o9.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export default api;

