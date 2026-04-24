const EMPTY_LOGIN_URL_ERROR = 'Login URL is required';
const INVALID_LOGIN_URL_ERROR = 'Login URL must be an absolute http or https URL';

export const PASSWORD_LOGIN_FORM_DEFAULTS = {
    login_url: '',
};

const parseTimestamp = (value) => {
    const timestamp = value ? Date.parse(value) : 0;
    return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const normalizePasswordLoginForm = (formData) => ({
    login_url: (formData?.login_url || '').trim(),
});

export const validatePasswordLoginForm = (formData) => {
    const normalized = normalizePasswordLoginForm(formData);

    if (!normalized.login_url) {
        return EMPTY_LOGIN_URL_ERROR;
    }

    try {
        const url = new URL(normalized.login_url);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return INVALID_LOGIN_URL_ERROR;
        }
    } catch {
        return INVALID_LOGIN_URL_ERROR;
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
        return {label: 'Disabled', variant: 'secondary'};
    }

    if (!endpoint.login_url) {
        return {label: 'Not configured', variant: 'outline'};
    }

    return {label: 'Active', variant: 'default'};
};

const compareAssignments = (endpointById) => (left, right) => {
    const leftStatus = formatPasswordLoginStatus(left, endpointById.get(left.password_login_endpoint_id));
    const rightStatus = formatPasswordLoginStatus(right, endpointById.get(right.password_login_endpoint_id));

    const statusRank = {
        Active: 4,
        Disabled: 3,
        'Endpoint missing': 2,
        'Not configured': 1,
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

export const isPasswordLoginActive = (assignment, endpoint) => (
    Boolean(assignment?.enabled && endpoint?.is_active && endpoint?.login_url)
);

export const buildPasswordLoginManagementModel = ({tenants = [], endpoints = [], assignments = []}) => {
    const endpointById = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint]));
    const endpointUsageCount = assignments.reduce((counts, assignment) => {
        const endpointId = assignment.password_login_endpoint_id;
        counts[endpointId] = (counts[endpointId] || 0) + 1;
        return counts;
    }, {});

    const globalAssignment = selectPreferredAssignment(
        assignments.filter((assignment) => !assignment.tenant_id),
        endpointById
    );
    const globalEndpoint = globalAssignment
        ? endpointById.get(globalAssignment.password_login_endpoint_id) || null
        : null;
    const globalActive = isPasswordLoginActive(globalAssignment, globalEndpoint);

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
            const tenantActive = isPasswordLoginActive(tenantAssignment, tenantEndpoint);

            if (tenantActive) {
                return {
                    tenant,
                    tenantAssignment,
                    tenantEndpoint,
                    resolvedEndpoint: tenantEndpoint,
                    resolvedSource: 'Tenant-specific',
                    status: {label: 'Active', variant: 'default'},
                    detail: 'Tenant-specific password login URL is active.',
                    canRemove: true,
                };
            }

            if (globalActive) {
                return {
                    tenant,
                    tenantAssignment,
                    tenantEndpoint,
                    resolvedEndpoint: globalEndpoint,
                    resolvedSource: 'Global',
                    status: {label: 'Active', variant: 'outline'},
                    detail: tenantAssignment
                        ? 'Tenant configuration is not active; inherited Global Default is active.'
                        : 'Inherited from Global Default.',
                    canRemove: Boolean(tenantAssignment),
                };
            }

            const status = tenantAssignment
                ? formatPasswordLoginStatus(tenantAssignment, tenantEndpoint)
                : {label: 'Not configured', variant: 'outline'};

            return {
                tenant,
                tenantAssignment,
                tenantEndpoint,
                resolvedEndpoint: null,
                resolvedSource: 'None',
                status,
                detail: tenantAssignment
                    ? 'Password login is not active for this tenant.'
                    : 'No password login URL is configured for this tenant.',
                canRemove: Boolean(tenantAssignment),
            };
        });

    return {
        endpointById,
        endpointUsageCount,
        globalAssignment,
        globalEndpoint,
        tenantRows,
    };
};
