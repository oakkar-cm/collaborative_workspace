import axios from 'axios';

// Use REACT_APP_BACKEND_URL when set (create frontend/.env with REACT_APP_BACKEND_URL=http://localhost:5000).
// Otherwise use /api so the dev server proxy forwards to the backend (backend must run on port 5000).
const baseURL = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL.replace(/\/$/, '')}/api`
  : '/api';

const client = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default client;
