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
    const responseData = error.response?.data;
    const message =
      responseData?.detail ||
      responseData?.user_message ||
      responseData?.message ||
      responseData?.error ||
      error.message ||
      'An error occurred';
    console.error(`[API Error] ${message}`);
    return Promise.reject({ message, status: error.response?.status });
  }
);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getDashboardAuthActivity = (range = '24h') => api.get('/dashboard/auth-activity', { params: { range } });
export const getDashboardAuthFailures = (range = '24h') => api.get('/dashboard/auth-failures', { params: { range } });
export const getDashboardRoutingInsights = (range = '24h') => api.get('/dashboard/routing-insights', { params: { range } });
export const getHealthSummary = () => api.get('/dashboard/health-summary');

// Tenants
export const getTenants = () => api.get('/tenants');
export const createTenant = (data) => api.post('/tenants', data);
export const updateTenant = (id, data) => api.put(`/tenants/${id}`, data);
export const deleteTenant = (id) => api.delete(`/tenants/${id}`);

const getManagementCollectionPath = (resource, tenantId) => (
  tenantId
    ? `/tenants/${tenantId}/${resource}`
    : `/${resource}`
);

const getManagementDetailPath = (resource, tenantId, id) =>
  `/${resource}/${tenantId}/${id}`;

const getManagementUpdatePath = (resource, id) =>
  `/${resource}/${id}`;

// OIDC Clients (Applications)
export const getOIDCClients = (tenantId) => api.get(getManagementCollectionPath('clients', tenantId));
export const getOIDCClient = (tenantId, id) => api.get(getManagementDetailPath('clients', tenantId, id));
export const createOIDCClient = (data) => api.post('/clients', data);
export const updateOIDCClient = (id, data) => api.put(getManagementUpdatePath('clients', id), data);
export const deleteOIDCClient = (tenantId, id) => api.delete(getManagementDetailPath('clients', tenantId, id));

// SAML Clients (Service Providers)
export const getSAMLClients = (tenantId) => api.get(getManagementCollectionPath('saml-clients', tenantId));
export const getSAMLClient = (tenantId, id) => api.get(getManagementDetailPath('saml-clients', tenantId, id));
export const createSAMLClient = (data) => api.post('/saml-clients', data);
export const updateSAMLClient = (id, data) => api.put(getManagementUpdatePath('saml-clients', id), data);
export const deleteSAMLClient = (tenantId, id) => api.delete(getManagementDetailPath('saml-clients', tenantId, id));

// SAML Connections (Identity Providers)
export const getSAMLConnections = (tenantId) => api.get(getManagementCollectionPath('saml-connections', tenantId));
export const getSAMLConnection = (tenantId, id) => api.get(getManagementDetailPath('saml-connections', tenantId, id));
export const createSAMLConnection = (data) => api.post('/saml-connections', data);
export const updateSAMLConnection = (id, data) => api.put(getManagementUpdatePath('saml-connections', id), data);
export const deleteSAMLConnection = (tenantId, id) => api.delete(getManagementDetailPath('saml-connections', tenantId, id));

// OIDC Connections (External Providers)
export const getOIDCConnections = (tenantId) => api.get(getManagementCollectionPath('oidc-connections', tenantId));
export const getOIDCConnection = (tenantId, id) => api.get(getManagementDetailPath('oidc-connections', tenantId, id));
export const createOIDCConnection = (data) => api.post('/oidc-connections', data);
export const updateOIDCConnection = (id, data) => api.put(getManagementUpdatePath('oidc-connections', id), data);
export const deleteOIDCConnection = (tenantId, id) => api.delete(getManagementDetailPath('oidc-connections', tenantId, id));

// LDAP Connections (Directory Providers)
export const getLDAPConnections = (tenantId) => api.get(getManagementCollectionPath('ldap-connections', tenantId));
export const getLDAPConnection = (tenantId, id) => api.get(getManagementDetailPath('ldap-connections', tenantId, id));
export const createLDAPConnection = (data) => api.post('/ldap-connections', data);
export const updateLDAPConnection = (tenantId, id, data) => api.put(getManagementDetailPath('ldap-connections', tenantId, id), data);
export const deleteLDAPConnection = (tenantId, id) => api.delete(getManagementDetailPath('ldap-connections', tenantId, id));
export const testLDAPConnection = (tenantId, id) => api.post(`${getManagementDetailPath('ldap-connections', tenantId, id)}/test`);

// Scopes
export const getScopes = (tenantId) => api.get(`/tenants/${tenantId}/scopes`);
export const getScope = (tenantId, id) => api.get(`/tenants/${tenantId}/scopes/${id}`);
export const createScope = (tenantId, data) => api.post(`/tenants/${tenantId}/scopes`, data);
export const updateScope = (tenantId, id, data) => api.put(`/tenants/${tenantId}/scopes/${id}`, data);
export const deleteScope = (tenantId, id) => api.delete(`/tenants/${tenantId}/scopes/${id}`);

// Outbound Policies (Egress & SSRF Protection)
export const getOutboundPolicies = (tenantId) => api.get('/outbound-policies', { params: { tenant_id: tenantId } });
export const createOutboundPolicy = (data) => api.post('/outbound-policies', data);
export const getOutboundPolicy = (id) => api.get(`/outbound-policies/${id}`);
export const updateOutboundPolicy = (id, data) => api.put(`/outbound-policies/${id}`, data);
export const deleteOutboundPolicy = (id) => api.delete(`/outbound-policies/${id}`);

// Branding
export const getBranding = (tenantId) => api.get(`/tenants/${tenantId}/branding`);
export const updateBrandingDraft = (tenantId, theme) => api.put(`/tenants/${tenantId}/branding/draft`, { theme });
export const publishBranding = (tenantId) => api.post(`/tenants/${tenantId}/branding/publish`);
export const discardBranding = (tenantId) => api.post(`/tenants/${tenantId}/branding/discard`);
export const resetBranding = (tenantId, target) => api.post(`/tenants/${tenantId}/branding/reset`, { target });

// Password Login
export const getPasswordLoginEndpoints = () => api.get('/password-login/endpoints');
export const createPasswordLoginEndpoint = (data) => api.post('/password-login/endpoints', data);
export const updatePasswordLoginEndpoint = (id, data) => api.put(`/password-login/endpoints/${id}`, data);
export const deletePasswordLoginEndpoint = (id) => api.delete(`/password-login/endpoints/${id}`);

export const getPasswordLoginAssignments = (tenantId) => api.get('/password-login/assignments', {
  params: tenantId ? { tenant_id: tenantId } : undefined,
});
export const createPasswordLoginAssignment = (data) => api.post('/password-login/assignments', data);
export const updatePasswordLoginAssignment = (id, data) => api.put(`/password-login/assignments/${id}`, data);
export const deletePasswordLoginAssignment = (id) => api.delete(`/password-login/assignments/${id}`);

export default api;
