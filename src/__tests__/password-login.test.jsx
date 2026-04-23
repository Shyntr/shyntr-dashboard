import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {PasswordLogin} from '../components/pages/PasswordLogin';
import {
    createPasswordLoginAssignment,
    createPasswordLoginEndpoint,
    deletePasswordLoginAssignment,
    deletePasswordLoginEndpoint,
    getPasswordLoginAssignments,
    getPasswordLoginEndpoints,
    getTenants,
    updatePasswordLoginAssignment,
    updatePasswordLoginEndpoint,
} from '../lib/api';

jest.mock('@/lib/utils', () => ({
    cn: (...classes) => classes.filter(Boolean).join(' '),
}), {virtual: true});

jest.mock('@/components/ui/button', () => require('../components/ui/button'), {virtual: true});

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
    deletePasswordLoginEndpoint: jest.fn(),
    getPasswordLoginAssignments: jest.fn(),
    getPasswordLoginEndpoints: jest.fn(),
    getTenants: jest.fn(),
    updatePasswordLoginAssignment: jest.fn(),
    updatePasswordLoginEndpoint: jest.fn(),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock('sonner', () => ({
    toast: {
        success: (...args) => mockToastSuccess(...args),
        error: (...args) => mockToastError(...args),
    },
}));

const TENANTS = [
    {id: 'tenant-a', name: 'tenant-a', display_name: 'Tenant A'},
    {id: 'tenant-b', name: 'tenant-b', display_name: 'Tenant B'},
];

const ENDPOINTS = [
    {
        id: 'endpoint-a',
        name: 'Tenant Override Endpoint',
        login_url: 'https://tenant.example.com/verify',
        is_active: true,
        created_at: '2026-04-20T10:00:00Z',
        updated_at: '2026-04-20T10:00:00Z',
    },
    {
        id: 'endpoint-b',
        name: 'Global Endpoint',
        login_url: 'https://global.example.com/verify',
        is_active: true,
        created_at: '2026-04-19T10:00:00Z',
        updated_at: '2026-04-19T10:00:00Z',
    },
    {
        id: 'endpoint-c',
        name: 'Inactive Endpoint',
        login_url: 'https://inactive.example.com/verify',
        is_active: false,
        created_at: '2026-04-18T10:00:00Z',
        updated_at: '2026-04-18T10:00:00Z',
    },
];

const ASSIGNMENTS = [
    {
        id: 'assignment-global',
        tenant_id: null,
        password_login_endpoint_id: 'endpoint-b',
        enabled: true,
        updated_at: '2026-04-21T09:00:00Z',
    },
    {
        id: 'assignment-tenant-a',
        tenant_id: 'tenant-a',
        password_login_endpoint_id: 'endpoint-a',
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
    createPasswordLoginEndpoint.mockResolvedValue({data: {}});
    updatePasswordLoginEndpoint.mockResolvedValue({data: {}});
    deletePasswordLoginEndpoint.mockResolvedValue({data: {}});
    createPasswordLoginAssignment.mockResolvedValue({data: {}});
    updatePasswordLoginAssignment.mockResolvedValue({data: {}});
    deletePasswordLoginAssignment.mockResolvedValue({data: {}});
};

const getByTestId = (testId) => document.querySelector(`[data-testid="${testId}"]`);

const getButtonByText = (text, root = document) => {
    const button = Array.from(root.querySelectorAll('button'))
        .find((candidate) => candidate.textContent.replace(/\s+/g, ' ').trim().includes(text));

    if (!button) {
        throw new Error(`Button "${text}" not found`);
    }

    return button;
};

const getInputByTestId = (testId) => {
    const input = getByTestId(testId);
    if (!input) {
        throw new Error(`Input "${testId}" not found`);
    }
    return input;
};

const changeValue = async (element, value) => {
    const prototype = element.tagName === 'SELECT'
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

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

const renderPasswordLoginPage = async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
        root.render(<PasswordLogin/>);
        await flushPromises();
    });

    return {
        container,
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

describe('PasswordLogin', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setApiState();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('lists password login endpoints', async () => {
        const view = await renderPasswordLoginPage();

        expect(document.body.textContent).toContain('Tenant Override Endpoint');
        expect(document.body.textContent).toContain('Global Endpoint');
        expect(document.body.textContent).toContain('Inactive Endpoint');

        await view.cleanup();
    });

    it('creates an endpoint with trimmed values', async () => {
        const view = await renderPasswordLoginPage();

        await click(getByTestId('create-password-login-endpoint-btn'));
        await changeValue(getInputByTestId('password-login-endpoint-name-input'), '  New Endpoint  ');
        await changeValue(getInputByTestId('password-login-endpoint-url-input'), '  https://new.example.com/login  ');
        await click(getByTestId('save-password-login-endpoint-btn'));

        expect(createPasswordLoginEndpoint).toHaveBeenCalledWith({
            name: 'New Endpoint',
            login_url: 'https://new.example.com/login',
            is_active: true,
        });
        expect(mockToastSuccess).toHaveBeenCalledWith('Password Login Endpoint created successfully');

        await view.cleanup();
    });

    it('edits an endpoint', async () => {
        const view = await renderPasswordLoginPage();

        const row = getByTestId('password-login-endpoint-row-endpoint-a');
        await click(getButtonByText('Edit', row));
        await changeValue(getInputByTestId('password-login-endpoint-name-input'), 'Updated Endpoint');
        await click(getByTestId('save-password-login-endpoint-btn'));

        expect(updatePasswordLoginEndpoint).toHaveBeenCalledWith('endpoint-a', expect.objectContaining({
            name: 'Updated Endpoint',
            login_url: 'https://tenant.example.com/verify',
            is_active: true,
        }));

        await view.cleanup();
    });

    it('creates a tenant-specific assignment', async () => {
        const view = await renderPasswordLoginPage();

        const row = getByTestId('tenant-assignment-row-tenant-b');
        await click(getButtonByText('Set Override', row));
        await changeValue(getByTestId('password-login-assignment-endpoint-select'), 'endpoint-a');
        await click(getByTestId('save-password-login-assignment-btn'));

        expect(createPasswordLoginAssignment).toHaveBeenCalledWith({
            tenant_id: 'tenant-b',
            password_login_endpoint_id: 'endpoint-a',
            enabled: true,
        });

        await view.cleanup();
    });

    it('displays the global assignment', async () => {
        const view = await renderPasswordLoginPage();

        const globalDefault = getByTestId('password-login-global-default');
        expect(globalDefault.textContent).toContain('Global Endpoint');
        expect(globalDefault.textContent).toContain('Active');

        await view.cleanup();
    });

    it('shows tenant-specific override display', async () => {
        const view = await renderPasswordLoginPage();

        const row = getByTestId('tenant-assignment-row-tenant-a');
        expect(row.textContent).toContain('Tenant-specific');
        expect(row.textContent).toContain('Tenant Override Endpoint');
        expect(row.textContent).toContain('Tenant Override');

        await view.cleanup();
    });

    it('shows inherited global display', async () => {
        const view = await renderPasswordLoginPage();

        const row = getByTestId('tenant-assignment-row-tenant-b');
        expect(row.textContent).toContain('Global');
        expect(row.textContent).toContain('Global Endpoint');
        expect(row.textContent).toContain('Inherited from Global');

        await view.cleanup();
    });

    it('shows the no-password-login state display', async () => {
        setApiState({
            assignments: [],
        });

        const view = await renderPasswordLoginPage();

        const row = getByTestId('tenant-assignment-row-tenant-a');
        expect(row.textContent).toContain('None');
        expect(row.textContent).toContain('Password login not active');
        expect(row.textContent).toContain('Not active');

        await view.cleanup();
    });

    it('renders validation errors for invalid login_url', async () => {
        const view = await renderPasswordLoginPage();

        await click(getByTestId('create-password-login-endpoint-btn'));
        await changeValue(getInputByTestId('password-login-endpoint-name-input'), 'Broken Endpoint');
        await changeValue(getInputByTestId('password-login-endpoint-url-input'), 'not-a-url');
        await click(getByTestId('save-password-login-endpoint-btn'));

        expect(getByTestId('password-login-endpoint-form-error').textContent)
            .toContain('Login URL must be an absolute http or https URL');
        expect(createPasswordLoginEndpoint).not.toHaveBeenCalled();

        await view.cleanup();
    });

    it('surfaces mutation success and error states', async () => {
        createPasswordLoginEndpoint.mockRejectedValueOnce({message: 'Backend validation failed'});

        const view = await renderPasswordLoginPage();

        await click(getByTestId('create-password-login-endpoint-btn'));
        await changeValue(getInputByTestId('password-login-endpoint-name-input'), 'Failing Endpoint');
        await changeValue(getInputByTestId('password-login-endpoint-url-input'), 'https://failing.example.com/login');
        await click(getByTestId('save-password-login-endpoint-btn'));

        expect(getByTestId('password-login-endpoint-form-error').textContent).toContain('Backend validation failed');
        expect(mockToastError).toHaveBeenCalledWith('Backend validation failed');

        await view.cleanup();
    });
});
