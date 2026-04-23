const EMPTY_ENDPOINT_NAME_ERROR = 'Name is required';
const EMPTY_ENDPOINT_URL_ERROR = 'Login URL is required';
const INVALID_ENDPOINT_URL_ERROR = 'Login URL must be an absolute http or https URL';

export const PASSWORD_LOGIN_ENDPOINT_FORM_DEFAULTS = {
    name: '',
    login_url: '',
    is_active: true,
};

export const PASSWORD_LOGIN_ASSIGNMENT_FORM_DEFAULTS = {
    password_login_endpoint_id: '',
    enabled: true,
};

const parseTimestamp = (value) => {
    const timestamp = value ? Date.parse(value) : 0;
    return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const normalizePasswordLoginEndpointForm = (formData) => ({
    name: (formData?.name || '').trim(),
    login_url: (formData?.login_url || '').trim(),
    is_active: formData?.is_active !== false,
});

export const validatePasswordLoginEndpointForm = (formData) => {
    const normalized = normalizePasswordLoginEndpointForm(formData);

    if (!normalized.name) {
        return EMPTY_ENDPOINT_NAME_ERROR;
    }

    if (!normalized.login_url) {
        return EMPTY_ENDPOINT_URL_ERROR;
    }

    try {
        const url = new URL(normalized.login_url);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return INVALID_ENDPOINT_URL_ERROR;
        }
    } catch {
        return INVALID_ENDPOINT_URL_ERROR;
    }

    return null;
};

export const formatPasswordLoginStatus = (assignment, endpoint) => {
    if (!assignment) {
        return {label: 'Not configured', variant: 'outline'};
    }

    if (!assignment.enabled) {
        return {label: 'Disabled', variant: 'secondary'};
    }

    if (!endpoint) {
        return {label: 'Endpoint missing', variant: 'destructive'};
    }

    if (!endpoint.is_active) {
        return {label: 'Endpoint inactive', variant: 'secondary'};
    }

    return {label: 'Active', variant: 'default'};
};

const compareAssignments = (endpointById) => (left, right) => {
    const leftStatus = formatPasswordLoginStatus(left, endpointById.get(left.password_login_endpoint_id));
    const rightStatus = formatPasswordLoginStatus(right, endpointById.get(right.password_login_endpoint_id));

    const statusRank = {
        Active: 4,
        'Endpoint inactive': 3,
        Disabled: 2,
        'Endpoint missing': 1,
        'Not configured': 0,
    };

    const rankDiff = (statusRank[rightStatus.label] || 0) - (statusRank[leftStatus.label] || 0);
    if (rankDiff !== 0) {
        return rankDiff;
    }

    return parseTimestamp(right.updated_at) - parseTimestamp(left.updated_at);
};

export const selectPreferredAssignment = (assignments, endpointById) => {
    if (!assignments?.length) {
        return null;
    }

    return assignments.slice().sort(compareAssignments(endpointById))[0];
};

export const buildPasswordLoginManagementModel = ({tenants = [], endpoints = [], assignments = []}) => {
    const endpointById = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint]));

    const endpointRows = endpoints
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((endpoint) => ({
            ...endpoint,
            usageCount: assignments.filter((assignment) => assignment.password_login_endpoint_id === endpoint.id).length,
            status: endpoint.is_active
                ? {label: 'Active', variant: 'default'}
                : {label: 'Disabled', variant: 'secondary'},
        }));

    const globalAssignments = assignments.filter((assignment) => !assignment.tenant_id);
    const globalAssignment = selectPreferredAssignment(globalAssignments, endpointById);
    const globalEndpoint = globalAssignment
        ? endpointById.get(globalAssignment.password_login_endpoint_id) || null
        : null;
    const globalStatus = formatPasswordLoginStatus(globalAssignment, globalEndpoint);
    const globalResolved = Boolean(globalAssignment && globalAssignment.enabled && globalEndpoint?.is_active);

    const tenantRows = tenants
        .slice()
        .sort((left, right) => (left.display_name || left.name).localeCompare(right.display_name || right.name))
        .map((tenant) => {
            const tenantAssignment = selectPreferredAssignment(
                assignments.filter((assignment) => assignment.tenant_id === tenant.id),
                endpointById
            );
            const tenantEndpoint = tenantAssignment
                ? endpointById.get(tenantAssignment.password_login_endpoint_id) || null
                : null;
            const tenantStatus = formatPasswordLoginStatus(tenantAssignment, tenantEndpoint);
            const tenantResolved = Boolean(tenantAssignment && tenantAssignment.enabled && tenantEndpoint?.is_active);

            let resolvedSource = 'None';
            let resolvedEndpoint = null;
            let resolvedStatus = {label: 'Not active', variant: 'outline'};
            let resolutionDetail = 'Password login is not active for this tenant.';

            if (tenantResolved) {
                resolvedSource = 'Tenant-specific';
                resolvedEndpoint = tenantEndpoint;
                resolvedStatus = {label: 'Active', variant: 'default'};
                resolutionDetail = 'Tenant Override';
            } else if (globalResolved) {
                resolvedSource = 'Global';
                resolvedEndpoint = globalEndpoint;
                resolvedStatus = {label: 'Inherited from Global', variant: 'outline'};
                resolutionDetail = tenantAssignment
                    ? 'Tenant override is not active; inherited from Global.'
                    : 'Inherited from Global.';
            } else if (tenantAssignment) {
                resolutionDetail = 'Tenant override exists but does not activate password login.';
            }

            return {
                tenant,
                tenantAssignment,
                tenantEndpoint,
                tenantAssignmentStatus: tenantStatus,
                resolvedSource,
                resolvedEndpoint,
                resolvedStatus,
                resolutionDetail,
            };
        });

    return {
        endpointRows,
        globalAssignment,
        globalEndpoint,
        globalStatus,
        tenantRows,
    };
};
