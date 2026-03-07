import axios from 'axios';

export const BACKEND_URL = window._env_?.SHYNTR_MANAGEMENT_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "http://localhost:7497";

const api = axios.create({
  baseURL: `${BACKEND_URL}/admin/management`,
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

// Tenants
export const getTenants = () => api.get('/tenants');
export const createTenant = (data) => api.post('/tenants', data);
export const updateTenant = (id, data) => api.put(`/tenants/${id}`, data);
export const deleteTenant = (id) => api.delete(`/tenants/${id}`);

// OIDC Clients (Applications)
export const getOIDCClients = () => api.get('/clients');
export const createOIDCClient = (data) => api.post('/clients', data);
export const updateOIDCClient = (id, data) => api.put(`/clients/${id}`, data);
export const deleteOIDCClient = (id, tenantId) => api.delete(`/clients/${tenantId}/${id}`);

// SAML Clients (Service Providers)
export const getSAMLClients = () => api.get('/saml-clients');
export const createSAMLClient = (data) => api.post('/saml-clients', data);
export const updateSAMLClient = (id, data) => api.put(`/saml-clients/${id}`, data);
export const deleteSAMLClient = (id, tenantId) => api.delete(`/saml-clients/${tenantId}/${id}`);

// SAML Connections (Identity Providers)
export const getSAMLConnections = () => api.get('/saml-connections');
export const createSAMLConnection = (data) => api.post('/saml-connections', data);
export const updateSAMLConnection = (id, data) => api.put(`/saml-connections/${id}`, data);
export const deleteSAMLConnection = (id, tenantId) => api.delete(`/saml-connections/${tenantId}/${id}`);

// OIDC Connections (External Providers)
export const getOIDCConnections = () => api.get('/oidc-connections');
export const createOIDCConnection = (data) => api.post('/oidc-connections', data);
export const updateOIDCConnection = (id, data) => api.put(`/oidc-connections/${id}`, data);
export const deleteOIDCConnection = (id, tenantId) => api.delete(`/oidc-connections/${tenantId}/${id}`);

export default api;
