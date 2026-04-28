import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {PasswordLogin} from '../components/pages/PasswordLogin';
import App from '../App';
import {
    createPasswordLoginAssignment,
    createPasswordLoginEndpoint,
    deletePasswordLoginAssignment,
    getPasswordLoginAssignments,
    getPasswordLoginEndpoints,
    getTenants,
    updatePasswordLoginAssignment,
    updatePasswordLoginEndpoint,
} from '../lib/api';

jest.mock('@/lib/utils', () => ({
    cn: (...classes) => classes.filter(Boolean).join(' '),
}), {virtual: true});

jest.mock('@/App.css', () => ({}), {virtual: true});
jest.mock('@/components/ui/button', () => require('../components/ui/button'), {virtual: true});
jest.mock('@/components/pages/OutboundPolicies', () => ({
    OutboundPolicies: () => <div data-testid="outbound-policies-page">Outbound Policies</div>,
}), {virtual: true});
jest.mock('react-router-dom', () => {
    const React = require('react');
    const normalizePath = (path) => path || '/';

    return {
        BrowserRouter: ({children}) => <>{children}</>,
        Link: ({to, children, onClick, ...props}) => (
            <a
                href={to}
                onClick={(event) => {
                    event.preventDefault();
                    globalThis.window.history.pushState({}, '', to);
                    if (onClick) {
                        onClick(event);
                    }
                }}
                {...props}
            >
                {children}
            </a>
        ),
        Navigate: ({to}) => <div data-testid={`navigate-to-${to}`}/>,
        Route: () => null,
        Routes: ({children}) => {
            const currentPath = normalizePath(globalThis.window.location.pathname);
            const routes = React.Children.toArray(children);
            const match = routes.find((route) => route.props.path === currentPath) ||
                routes.find((route) => route.props.path === '*');
            return match?.props.element || null;
        },
        useLocation: () => ({pathname: normalizePath(globalThis.window.location.pathname)}),
    };
}, {virtual: true});

jest.mock('../components/pages/Dashboard', () => ({
    Dashboard: () => <div data-testid="dashboard-page">Dashboard</div>,
}));
jest.mock('../components/pages/OIDCClients', () => ({
    OIDCClients: () => <div data-testid="oidc-clients-page">OIDC Clients</div>,
}));
jest.mock('../components/pages/SAMLClients', () => () => <div data-testid="saml-clients-page">SAML Clients</div>);
jest.mock('../components/pages/SAMLConnections', () => ({
    SAMLConnections: () => <div data-testid="saml-connections-page">SAML Connections</div>,
}));
jest.mock('../components/pages/OIDCConnections', () => ({
    OIDCConnections: () => <div data-testid="oidc-connections-page">OIDC Connections</div>,
}));
jest.mock('../components/pages/LDAPConnections', () => ({
    LDAPConnections: () => <div data-testid="ldap-connections-page">LDAP Connections</div>,
}));
jest.mock('../components/pages/Tenants', () => ({
    Tenants: () => <div data-testid="tenants-page">Tenants</div>,
}));
jest.mock('../components/pages/Scopes', () => ({
    Scopes: () => <div data-testid="scopes-page">Scopes</div>,
}));
jest.mock('../components/pages/Settings', () => ({
    Settings: () => <div data-testid="settings-page">Settings</div>,
}));
jest.mock('../components/pages/Branding', () => ({
    Branding: () => <div data-testid="branding-page">Branding</div>,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

jest.mock('../lib/api', () => ({
    createPasswordLoginAssignment: jest.fn(),
    createPasswordLoginEndpoint: jest.fn(),
    deletePasswordLoginAssignment: jest.fn(),
    getPasswordLoginAssignments: jest.fn(),
    getPasswordLoginEndpoints: jest.fn(),
    getTenants: jest.fn(),
    updatePasswordLoginAssignment: jest.fn(),
    updatePasswordLoginEndpoint: jest.fn(),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock('sonner', () => ({
    Toaster: () => <div data-testid="toaster"/>,
    toast: {
        success: (...args) => mockToastSuccess(...args),
        error: (...args) => mockToastError(...args),
    },
}));

const TENANTS = [
    {id: 'tenant-a', name: 'tenant-a', display_name: 'Tenant A'},
    {id: 'tenant-b', name: 'tenant-b', display_name: 'Tenant B'},
    {id: 'tenant-c', name: 'tenant-c', display_name: 'Tenant C'},
];

const ENDPOINTS = [
    {
        id: 'endpoint-a',
        name: 'Tenant A Password Login',
        login_url: 'https://tenant-a.example.com/verify',
        is_active: true,
        created_at: '2026-04-20T10:00:00Z',
        updated_at: '2026-04-20T10:00:00Z',
    },
    {
        id: 'endpoint-disabled',
        name: 'Disabled Endpoint',
        login_url: 'https://disabled.example.com/verify',
        is_active: false,
        created_at: '2026-04-18T10:00:00Z',
        updated_at: '2026-04-18T10:00:00Z',
    },
];

const ASSIGNMENTS = [
    {
        id: 'assignment-tenant-a',
        tenant_id: 'tenant-a',
        password_login_endpoint_id: 'endpoint-a',
        enabled: true,
        updated_at: '2026-04-22T09:00:00Z',
    },
    {
        id: 'assignment-tenant-c',
        tenant_id: 'tenant-c',
        password_login_endpoint_id: 'endpoint-disabled',
        enabled: true,
        updated_at: '2026-04-22T09:00:00Z',
    },
];

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const setApiState = ({
    tenants = TENANTS,
    endpoints = ENDPOINTS,
    assignments = ASSIGNMENTS,
} = {}) => {
    getTenants.mockResolvedValue({data: tenants});
    getPasswordLoginEndpoints.mockResolvedValue({data: endpoints});
    getPasswordLoginAssignments.mockResolvedValue({data: assignments});
    createPasswordLoginEndpoint.mockResolvedValue({data: {id: 'endpoint-new'}});
    updatePasswordLoginEndpoint.mockResolvedValue({data: {}});
    createPasswordLoginAssignment.mockResolvedValue({data: {}});
    updatePasswordLoginAssignment.mockResolvedValue({data: {}});
    deletePasswordLoginAssignment.mockResolvedValue({data: {}});
};

const getByTestId = (testId) => document.querySelector(`[data-testid="${testId}"]`);

const getButtonByText = (text, root = document) => {
    const button = Array.from(root.querySelectorAll('button, a'))
        .find((candidate) => candidate.textContent.replace(/\s+/g, ' ').trim().includes(text));

    if (!button) {
        throw new Error(`Control "${text}" not found`);
    }

    return button;
};

const changeValue = async (element, value) => {
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

    await act(async () => {
        valueSetter.call(element, value);
        element.dispatchEvent(new Event('input', {bubbles: true}));
        element.dispatchEvent(new Event('change', {bubbles: true}));
        await flushPromises();
    });
};

const click = async (element) => {
    await act(async () => {
        element.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        await flushPromises();
    });
};

const renderElement = async (element) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
        root.render(element);
        await flushPromises();
    });

    return {
        root,
        cleanup: async () => {
            await act(async () => {
                root.unmount();
                await flushPromises();
            });
            container.remove();
        },
    };
};

const renderPasswordLoginPage = () => renderElement(<PasswordLogin/>);

describe('PasswordLogin', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window._env_ = {
            SHYNTR_PATH_PREFIX: '/',
            SHYNTR_EE_PASSWORD_LOGIN_ENABLED: 'true',
            SHYNTR_EE_BRANDING_ENABLED: 'false',
        };
        window.history.pushState({}, '', '/');
        setApiState();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('is reachable from sidebar navigation and route renders correctly', async () => {
        const view = await renderElement(<App/>);

        const navLink = getByTestId('nav-password-login');
        expect(navLink).toBeTruthy();
        expect(navLink.getAttribute('href')).toBe('/password-login');

        await click(navLink);
        await act(async () => {
            view.root.render(<App/>);
            await flushPromises();
        });

        expect(getByTestId('password-login-page')).toBeTruthy();

        await view.cleanup();
    });

    it('does not register navigation or route when the feature flag is disabled', async () => {
        window._env_.SHYNTR_EE_PASSWORD_LOGIN_ENABLED = 'false';
        window.history.pushState({}, '', '/password-login');

        const view = await renderElement(<App/>);

        expect(getByTestId('nav-password-login')).toBeNull();
        expect(getByTestId('password-login-page')).toBeNull();
        expect(getByTestId('navigate-to-/')).toBeTruthy();

        await view.cleanup();
    });

    it('lists tenants, configured URLs, missing config, and inactive endpoint status', async () => {
        const view = await renderPasswordLoginPage();

        const tenantARow = getByTestId('password-login-tenant-row-tenant-a');
        const tenantBRow = getByTestId('password-login-tenant-row-tenant-b');
        const tenantCRow = getByTestId('password-login-tenant-row-tenant-c');

        expect(tenantARow.textContent).toContain('Tenant A');
        expect(tenantARow.textContent).toContain('https://tenant-a.example.com/verify');
        expect(tenantARow.textContent).toContain('Active');
        expect(tenantBRow.textContent).toContain('Tenant B');
        expect(tenantBRow.textContent).toContain('Not configured');
        expect(tenantCRow.textContent).toContain('Disabled');
        expect(tenantCRow.textContent).not.toContain('Active');

        await view.cleanup();
    });

    it('configures password login URL for a tenant and submits trimmed values', async () => {
        const view = await renderPasswordLoginPage();

        const tenantBRow = getByTestId('password-login-tenant-row-tenant-b');
        await click(getButtonByText('Configure', tenantBRow));
        await changeValue(getByTestId('password-login-url-input'), '  https://tenant-b.example.com/verify  ');
        await click(getByTestId('save-password-login-url-btn'));

        expect(createPasswordLoginEndpoint).toHaveBeenCalledWith({
            name: 'Tenant B Password Login',
            login_url: 'https://tenant-b.example.com/verify',
            is_active: true,
        });
        expect(createPasswordLoginAssignment).toHaveBeenCalledWith({
            tenant_id: 'tenant-b',
            password_login_endpoint_id: 'endpoint-new',
            enabled: true,
        });

        await view.cleanup();
    });

    it('edits an existing tenant password login URL', async () => {
        const view = await renderPasswordLoginPage();

        const tenantARow = getByTestId('password-login-tenant-row-tenant-a');
        await click(getButtonByText('Edit', tenantARow));
        await changeValue(getByTestId('password-login-url-input'), 'https://tenant-a.example.com/updated');
        await click(getByTestId('save-password-login-url-btn'));

        expect(updatePasswordLoginEndpoint).toHaveBeenCalledWith('endpoint-a', {
            name: 'Tenant A Password Login',
            login_url: 'https://tenant-a.example.com/updated',
            is_active: true,
        });
        expect(updatePasswordLoginAssignment).toHaveBeenCalledWith('assignment-tenant-a', {
            password_login_endpoint_id: 'endpoint-a',
            enabled: true,
        });

        await view.cleanup();
    });

    it('creates an isolated endpoint when editing a reused endpoint assignment', async () => {
        setApiState({
            assignments: [
                ASSIGNMENTS[0],
                {
                    id: 'assignment-tenant-b',
                    tenant_id: 'tenant-b',
                    password_login_endpoint_id: 'endpoint-a',
                    enabled: true,
                    updated_at: '2026-04-22T09:00:00Z',
                },
            ],
        });

        const view = await renderPasswordLoginPage();

        const tenantBRow = getByTestId('password-login-tenant-row-tenant-b');
        await click(getButtonByText('Edit', tenantBRow));
        await changeValue(getByTestId('password-login-url-input'), 'https://tenant-b.example.com/isolated');
        await click(getByTestId('save-password-login-url-btn'));

        expect(updatePasswordLoginEndpoint).not.toHaveBeenCalled();
        expect(createPasswordLoginEndpoint).toHaveBeenCalledWith({
            name: 'Tenant B Password Login',
            login_url: 'https://tenant-b.example.com/isolated',
            is_active: true,
        });
        expect(updatePasswordLoginAssignment).toHaveBeenCalledWith('assignment-tenant-b', {
            password_login_endpoint_id: 'endpoint-new',
            enabled: true,
        });

        await view.cleanup();
    });

    it('removes password login URL from a tenant', async () => {
        const view = await renderPasswordLoginPage();

        const tenantARow = getByTestId('password-login-tenant-row-tenant-a');
        await click(getButtonByText('Remove', tenantARow));

        expect(deletePasswordLoginAssignment).toHaveBeenCalledWith('assignment-tenant-a');
        expect(mockToastSuccess).toHaveBeenCalledWith('Password login URL removed successfully');

        await view.cleanup();
    });

    it('rejects empty and invalid login URLs before submit', async () => {
        const view = await renderPasswordLoginPage();

        const tenantBRow = getByTestId('password-login-tenant-row-tenant-b');
        await click(getButtonByText('Configure', tenantBRow));
        await changeValue(getByTestId('password-login-url-input'), '   ');
        await click(getByTestId('save-password-login-url-btn'));

        expect(getByTestId('password-login-form-error').textContent).toContain('Login URL is required');
        expect(createPasswordLoginEndpoint).not.toHaveBeenCalled();

        await changeValue(getByTestId('password-login-url-input'), 'not-a-url');
        await click(getByTestId('save-password-login-url-btn'));

        expect(getByTestId('password-login-form-error').textContent)
            .toContain('Login URL must be an absolute http or https URL');
        expect(createPasswordLoginEndpoint).not.toHaveBeenCalled();

        await view.cleanup();
    });

    it('accepts valid absolute http and https login URLs', async () => {
        const view = await renderPasswordLoginPage();

        const tenantBRow = getByTestId('password-login-tenant-row-tenant-b');
        await click(getButtonByText('Configure', tenantBRow));
        await changeValue(getByTestId('password-login-url-input'), 'http://tenant-b.example.com/verify');
        await click(getByTestId('save-password-login-url-btn'));

        expect(createPasswordLoginEndpoint).toHaveBeenCalledWith(expect.objectContaining({
            login_url: 'http://tenant-b.example.com/verify',
        }));

        await view.cleanup();

        setApiState();
        const secondView = await renderPasswordLoginPage();
        const secondTenantBRow = getByTestId('password-login-tenant-row-tenant-b');
        await click(getButtonByText('Configure', secondTenantBRow));
        await changeValue(getByTestId('password-login-url-input'), 'https://tenant-b.example.com/verify');
        await click(getByTestId('save-password-login-url-btn'));

        expect(createPasswordLoginEndpoint).toHaveBeenCalledWith(expect.objectContaining({
            login_url: 'https://tenant-b.example.com/verify',
        }));

        await secondView.cleanup();
    });

    it('surfaces backend validation errors cleanly', async () => {
        createPasswordLoginEndpoint.mockRejectedValueOnce({message: 'Backend validation failed'});

        const view = await renderPasswordLoginPage();

        const tenantBRow = getByTestId('password-login-tenant-row-tenant-b');
        await click(getButtonByText('Configure', tenantBRow));
        await changeValue(getByTestId('password-login-url-input'), 'https://tenant-b.example.com/verify');
        await click(getByTestId('save-password-login-url-btn'));

        expect(getByTestId('password-login-form-error').textContent).toContain('Backend validation failed');
        expect(mockToastError).toHaveBeenCalledWith('Backend validation failed');

        await view.cleanup();
    });

    it('does not introduce password fields or display secrets', async () => {
        const view = await renderPasswordLoginPage();

        const passwordFields = Array.from(document.querySelectorAll('input[type="password"]'));
        expect(passwordFields).toHaveLength(0);
        expect(document.body.textContent).not.toContain('secret');
        expect(document.body.textContent).not.toContain('token');

        await view.cleanup();
    });
});
