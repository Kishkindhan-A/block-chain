import axios from 'axios';

// Create an Axios instance for API calls.
// The frontend can use the VITE_API_URL environment variable (in .env) for custom URLs.
// If not provided, fall back to the backend port defined in .env (3001).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// For ESP32 data ingestion (x-api-key)
export const setApiKey = (key) => {
  api.defaults.headers.common['x-api-key'] = key;
};

// Consumers
export const getLatestReadings = () => api.get('/readings?limit=10');
export const getMeterReadings = (meterId) => api.get(`/meter/${meterId}`);
export const getBilling = (meterId) => api.get(`/bill/${meterId}`);

// Admin
export const getBlockchainData = () => api.get('/blockchain');
export const getAllReadings = () => api.get('/readings?limit=100');

// Payments
export const createOrder = (data) => api.post('/payment/order', data);
export const verifyPayment = (data) => api.post('/payment/verify', data);
export const getPaymentHistory = (meterId) => api.get(`/payment/${meterId}`);

export default api;
