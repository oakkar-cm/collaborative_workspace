import axios from 'axios';
import { getToken } from './authStorage';

// Use REACT_APP_BACKEND_URL when set (create frontend/.env with REACT_APP_BACKEND_URL=http://localhost:5000).
// Otherwise use /api so the dev server proxy forwards to the backend (backend must run on port 5000).
const baseURL = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL.replace(/\/$/, '')}/api`
  : '/api';

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
