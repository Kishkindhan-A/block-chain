import axios from 'axios';

const api = axios.create({
  // Fallback to local Express backend running on port 3000
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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
