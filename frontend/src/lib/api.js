import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred';
    console.error(`[API Error] ${message}`);
    return Promise.reject({ message, status: error.response?.status });
  }
);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// OAuth2 Clients
export const getClients = () => api.get('/clients');
export const getClient = (id) => api.get(`/clients/${id}`);
export const createClient = (data) => api.post('/clients', data);
export const updateClient = (id, data) => api.put(`/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/clients/${id}`);

// SAML Connections
export const getSAMLConnections = () => api.get('/saml-connections');
export const getSAMLConnection = (id) => api.get(`/saml-connections/${id}`);
export const createSAMLConnection = (data) => api.post('/saml-connections', data);
export const updateSAMLConnection = (id, data) => api.put(`/saml-connections/${id}`, data);
export const deleteSAMLConnection = (id) => api.delete(`/saml-connections/${id}`);

// OIDC Connections
export const getOIDCConnections = () => api.get('/oidc-connections');
export const getOIDCConnection = (id) => api.get(`/oidc-connections/${id}`);
export const createOIDCConnection = (data) => api.post('/oidc-connections', data);
export const updateOIDCConnection = (id, data) => api.put(`/oidc-connections/${id}`, data);
export const deleteOIDCConnection = (id) => api.delete(`/oidc-connections/${id}`);

export default api;
