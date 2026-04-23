import {useEffect, useMemo, useState} from 'react';
import {
    KeyRound,
    Plus,
    Pencil,
    Trash2,
    RefreshCw,
    Power,
    Globe,
    Building2,
} from 'lucide-react';
import {toast} from 'sonner';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '../ui/card';
import {Button} from '../ui/button';
import {Badge} from '../ui/badge';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {Alert, AlertDescription, AlertTitle} from '../ui/alert';
import {Switch} from '../ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog';
import {EmptyState} from '../shared/EmptyState';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
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
} from '../../lib/api';
import {
    buildPasswordLoginManagementModel,
    PASSWORD_LOGIN_ASSIGNMENT_FORM_DEFAULTS,
    PASSWORD_LOGIN_ENDPOINT_FORM_DEFAULTS,
    normalizePasswordLoginEndpointForm,
    validatePasswordLoginEndpointForm,
} from '../../lib/password-login';

const EMPTY_ASSIGNMENT_ERROR = 'Select a Password Login Endpoint';

const formatDateTime = (value) => {
    if (!value) {
        return 'N/A';
    }

    return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getEndpointLabel = (endpoint) => {
    if (!endpoint) {
        return 'Password login not active';
    }

    return endpoint.name;
};

const StatusBadge = ({status, className = ''}) => (
    <Badge variant={status.variant} className={className}>
        {status.label}
    </Badge>
);

export function PasswordLogin() {
    const [tenants, setTenants] = useState([]);
    const [endpoints, setEndpoints] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [refreshToken, setRefreshToken] = useState(0);

    const [endpointDialogOpen, setEndpointDialogOpen] = useState(false);
    const [endpointForm, setEndpointForm] = useState(PASSWORD_LOGIN_ENDPOINT_FORM_DEFAULTS);
    const [editingEndpoint, setEditingEndpoint] = useState(null);
    const [endpointError, setEndpointError] = useState('');
    const [savingEndpoint, setSavingEndpoint] = useState(false);

    const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
    const [assignmentScope, setAssignmentScope] = useState('global');
    const [assignmentTenant, setAssignmentTenant] = useState(null);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [assignmentForm, setAssignmentForm] = useState(PASSWORD_LOGIN_ASSIGNMENT_FORM_DEFAULTS);
    const [assignmentError, setAssignmentError] = useState('');
    const [savingAssignment, setSavingAssignment] = useState(false);

    const [deleteState, setDeleteState] = useState({type: '', item: null});
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setLoadError('');

            try {
                const [tenantResponse, endpointResponse, assignmentResponse] = await Promise.all([
                    getTenants(),
                    getPasswordLoginEndpoints(),
                    getPasswordLoginAssignments(),
                ]);

                if (cancelled) {
                    return;
                }

                setTenants(tenantResponse.data || []);
                setEndpoints(endpointResponse.data || []);
                setAssignments(assignmentResponse.data || []);
            } catch (error) {
                if (cancelled) {
                    return;
                }

                const message = error.message || 'Failed to load password login management data';
                setLoadError(message);
                toast.error(message);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [refreshToken]);

    const model = useMemo(
        () => buildPasswordLoginManagementModel({tenants, endpoints, assignments}),
        [assignments, endpoints, tenants]
    );

    const endpointOptions = model.endpointRows.map((endpoint) => ({
        id: endpoint.id,
        name: endpoint.name,
        is_active: endpoint.is_active,
    }));

    const refreshData = () => setRefreshToken((current) => current + 1);

    const openCreateEndpointDialog = () => {
        setEditingEndpoint(null);
        setEndpointForm(PASSWORD_LOGIN_ENDPOINT_FORM_DEFAULTS);
        setEndpointError('');
        setEndpointDialogOpen(true);
    };

    const openEditEndpointDialog = (endpoint) => {
        setEditingEndpoint(endpoint);
        setEndpointForm({
            name: endpoint.name,
            login_url: endpoint.login_url,
            is_active: endpoint.is_active,
        });
        setEndpointError('');
        setEndpointDialogOpen(true);
    };

    const handleEndpointSubmit = async (event) => {
        event.preventDefault();

        if (savingEndpoint) {
            return;
        }

        const validationError = validatePasswordLoginEndpointForm(endpointForm);
        if (validationError) {
            setEndpointError(validationError);
            return;
        }

        setSavingEndpoint(true);
        setEndpointError('');

        const payload = normalizePasswordLoginEndpointForm(endpointForm);

        try {
            if (editingEndpoint) {
                await updatePasswordLoginEndpoint(editingEndpoint.id, payload);
                toast.success('Password Login Endpoint updated successfully');
            } else {
                await createPasswordLoginEndpoint(payload);
                toast.success('Password Login Endpoint created successfully');
            }

            setEndpointDialogOpen(false);
            refreshData();
        } catch (error) {
            const message = error.message || 'Failed to save Password Login Endpoint';
            setEndpointError(message);
            toast.error(message);
        } finally {
            setSavingEndpoint(false);
        }
    };

    const handleEndpointToggle = async (endpoint) => {
        if (savingEndpoint || deleting) {
            return;
        }

        try {
            await updatePasswordLoginEndpoint(endpoint.id, {
                name: endpoint.name,
                login_url: endpoint.login_url,
                is_active: !endpoint.is_active,
            });
            toast.success(`Password Login Endpoint ${endpoint.is_active ? 'disabled' : 'enabled'} successfully`);
            refreshData();
        } catch (error) {
            toast.error(error.message || 'Failed to update Password Login Endpoint');
        }
    };

    const openAssignmentDialog = ({scope, tenant = null, assignment = null}) => {
        setAssignmentScope(scope);
        setAssignmentTenant(tenant);
        setEditingAssignment(assignment);
        setAssignmentForm(assignment
            ? {
                password_login_endpoint_id: assignment.password_login_endpoint_id || '',
                enabled: assignment.enabled !== false,
            }
            : PASSWORD_LOGIN_ASSIGNMENT_FORM_DEFAULTS
        );
        setAssignmentError('');
        setAssignmentDialogOpen(true);
    };

    const handleAssignmentSubmit = async (event) => {
        event.preventDefault();

        if (savingAssignment) {
            return;
        }

        if (!assignmentForm.password_login_endpoint_id) {
            setAssignmentError(EMPTY_ASSIGNMENT_ERROR);
            return;
        }

        setSavingAssignment(true);
        setAssignmentError('');

        try {
            const payload = {
                password_login_endpoint_id: assignmentForm.password_login_endpoint_id,
                enabled: assignmentForm.enabled,
            };

            if (!editingAssignment && assignmentScope === 'tenant' && assignmentTenant?.id) {
                payload.tenant_id = assignmentTenant.id;
            }

            if (!editingAssignment && assignmentScope === 'global') {
                payload.tenant_id = null;
            }

            if (editingAssignment) {
                await updatePasswordLoginAssignment(editingAssignment.id, payload);
                toast.success('Tenant Assignment updated successfully');
            } else {
                await createPasswordLoginAssignment(payload);
                toast.success(`${assignmentScope === 'global' ? 'Global Default' : 'Tenant Assignment'} created successfully`);
            }

            setAssignmentDialogOpen(false);
            refreshData();
        } catch (error) {
            const message = error.message || 'Failed to save Tenant Assignment';
            setAssignmentError(message);
            toast.error(message);
        } finally {
            setSavingAssignment(false);
        }
    };

    const requestDelete = (type, item) => {
        setDeleteState({type, item});
    };

    const handleDelete = async () => {
        if (!deleteState.item || deleting) {
            return;
        }

        setDeleting(true);

        try {
            if (deleteState.type === 'endpoint') {
                await deletePasswordLoginEndpoint(deleteState.item.id);
                toast.success('Password Login Endpoint deleted successfully');
            } else {
                await deletePasswordLoginAssignment(deleteState.item.id);
                toast.success(deleteState.type === 'global-assignment'
                    ? 'Global Default removed successfully'
                    : 'Tenant Assignment removed successfully'
                );
            }

            setDeleteState({type: '', item: null});
            refreshData();
        } catch (error) {
            toast.error(error.message || 'Delete operation failed');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="password-login-page">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
                        Password Login
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage reusable Password Login Endpoint definitions and tenant/global assignments.
                    </p>
                </div>
                <Button variant="outline" onClick={refreshData} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>
                    Refresh
                </Button>
            </div>

            {loadError ? (
                <Alert variant="destructive" data-testid="password-login-load-error">
                    <AlertTitle>Failed to load Password Login management</AlertTitle>
                    <AlertDescription>{loadError}</AlertDescription>
                </Alert>
            ) : null}

            <Card className="bg-card/40 border-border/40">
                <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-primary"/>
                            Password Login Endpoints
                        </CardTitle>
                        <CardDescription>
                            Reusable external verifier endpoints that can be assigned per tenant or as the Global Default.
                        </CardDescription>
                    </div>
                    <Button onClick={openCreateEndpointDialog} data-testid="create-password-login-endpoint-btn">
                        <Plus className="mr-2 h-4 w-4"/>
                        Create Endpoint
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground"/>
                        </div>
                    ) : model.endpointRows.length === 0 ? (
                        <EmptyState
                            icon={KeyRound}
                            title="No Password Login Endpoints"
                            description="Create a Password Login Endpoint before configuring tenant assignments."
                            actionLabel="Create Endpoint"
                            onAction={openCreateEndpointDialog}
                            testId="password-login-endpoints-empty"
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Login URL</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Assignments</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {model.endpointRows.map((endpoint) => (
                                    <TableRow key={endpoint.id} data-testid={`password-login-endpoint-row-${endpoint.id}`}>
                                        <TableCell className="font-medium">{endpoint.name}</TableCell>
                                        <TableCell>
                                            <div className="max-w-[360px] truncate text-xs text-muted-foreground">
                                                {endpoint.login_url}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={endpoint.status}/>
                                        </TableCell>
                                        <TableCell>{endpoint.usageCount}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditEndpointDialog(endpoint)}
                                            >
                                                <Pencil className="mr-1 h-3.5 w-3.5"/>
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEndpointToggle(endpoint)}
                                            >
                                                <Power className="mr-1 h-3.5 w-3.5"/>
                                                {endpoint.is_active ? 'Disable' : 'Enable'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="hover:text-destructive hover:border-destructive"
                                                onClick={() => requestDelete('endpoint', endpoint)}
                                            >
                                                <Trash2 className="mr-1 h-3.5 w-3.5"/>
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-card/40 border-border/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary"/>
                        Tenant Password Login Assignments
                    </CardTitle>
                    <CardDescription>
                        Configure the Global Default and tenant-specific overrides. Tenant-specific active assignments take precedence over the Global Default.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4" data-testid="password-login-global-default">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-primary"/>
                                    <h3 className="font-semibold">Global Default</h3>
                                    <StatusBadge status={model.globalStatus}/>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {model.globalAssignment
                                        ? `${getEndpointLabel(model.globalEndpoint)}`
                                        : 'No Global Default is configured.'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {model.globalAssignment
                                        ? `Updated ${formatDateTime(model.globalAssignment.updated_at)}`
                                        : 'Tenants without an active Tenant Override will show no password login until a Global Default is configured.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => openAssignmentDialog({
                                        scope: 'global',
                                        assignment: model.globalAssignment,
                                    })}
                                    disabled={!endpointOptions.length}
                                >
                                    <Pencil className="mr-2 h-4 w-4"/>
                                    {model.globalAssignment ? 'Edit Global Default' : 'Set Global Default'}
                                </Button>
                                {model.globalAssignment ? (
                                    <Button
                                        variant="outline"
                                        className="hover:text-destructive hover:border-destructive"
                                        onClick={() => requestDelete('global-assignment', model.globalAssignment)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4"/>
                                        Remove Global Default
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground"/>
                        </div>
                    ) : model.tenantRows.length === 0 ? (
                        <EmptyState
                            icon={Building2}
                            title="No tenants found"
                            description="Create a tenant before assigning a Password Login Endpoint."
                            testId="password-login-tenant-assignments-empty"
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tenant</TableHead>
                                    <TableHead>Resolved Source</TableHead>
                                    <TableHead>Assigned Endpoint</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {model.tenantRows.map((row) => (
                                    <TableRow key={row.tenant.id} data-testid={`tenant-assignment-row-${row.tenant.id}`}>
                                        <TableCell className="font-medium">
                                            {row.tenant.display_name || row.tenant.name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <StatusBadge
                                                    status={{
                                                        label: row.resolvedSource,
                                                        variant: row.resolvedSource === 'Tenant-specific'
                                                            ? 'default'
                                                            : row.resolvedSource === 'Global'
                                                                ? 'outline'
                                                                : 'secondary',
                                                    }}
                                                />
                                                <p className="text-xs text-muted-foreground">{row.resolutionDetail}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div>{getEndpointLabel(row.resolvedEndpoint)}</div>
                                                {row.resolvedEndpoint ? (
                                                    <div className="max-w-[320px] truncate text-xs text-muted-foreground">
                                                        {row.resolvedEndpoint.login_url}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <StatusBadge status={row.resolvedStatus}/>
                                                {row.tenantAssignment ? (
                                                    <div className="text-xs text-muted-foreground">
                                                        Override record: {row.tenantAssignmentStatus.label}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openAssignmentDialog({
                                                    scope: 'tenant',
                                                    tenant: row.tenant,
                                                    assignment: row.tenantAssignment,
                                                })}
                                                disabled={!endpointOptions.length}
                                            >
                                                <Pencil className="mr-1 h-3.5 w-3.5"/>
                                                {row.tenantAssignment ? 'Edit Override' : 'Set Override'}
                                            </Button>
                                            {row.tenantAssignment ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="hover:text-destructive hover:border-destructive"
                                                    onClick={() => requestDelete('tenant-assignment', row.tenantAssignment)}
                                                >
                                                    <Trash2 className="mr-1 h-3.5 w-3.5"/>
                                                    Clear Override
                                                </Button>
                                            ) : null}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={endpointDialogOpen}
                onOpenChange={(open) => {
                    if (!savingEndpoint) {
                        setEndpointDialogOpen(open);
                    }
                }}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingEndpoint ? 'Edit Password Login Endpoint' : 'Create Password Login Endpoint'}
                        </DialogTitle>
                        <DialogDescription>
                            Configure a reusable external password verifier endpoint.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEndpointSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password-login-endpoint-name">Name</Label>
                            <Input
                                id="password-login-endpoint-name"
                                data-testid="password-login-endpoint-name-input"
                                value={endpointForm.name}
                                onChange={(event) => setEndpointForm((current) => ({
                                    ...current,
                                    name: event.target.value,
                                }))}
                                disabled={savingEndpoint}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password-login-endpoint-url">Login URL</Label>
                            <Input
                                id="password-login-endpoint-url"
                                data-testid="password-login-endpoint-url-input"
                                value={endpointForm.login_url}
                                onChange={(event) => setEndpointForm((current) => ({
                                    ...current,
                                    login_url: event.target.value,
                                }))}
                                placeholder="https://login.example.com/verify"
                                disabled={savingEndpoint}
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                            <div>
                                <Label htmlFor="password-login-endpoint-active">Active</Label>
                                <p className="text-xs text-muted-foreground">
                                    Inactive endpoints remain defined but do not activate password login.
                                </p>
                            </div>
                            <Switch
                                id="password-login-endpoint-active"
                                checked={endpointForm.is_active}
                                onCheckedChange={(checked) => setEndpointForm((current) => ({
                                    ...current,
                                    is_active: checked,
                                }))}
                                disabled={savingEndpoint}
                            />
                        </div>

                        {endpointError ? (
                            <p className="text-sm text-destructive" data-testid="password-login-endpoint-form-error">
                                {endpointError}
                            </p>
                        ) : null}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEndpointDialogOpen(false)} disabled={savingEndpoint}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={savingEndpoint} data-testid="save-password-login-endpoint-btn">
                                {savingEndpoint ? 'Saving...' : editingEndpoint ? 'Update Endpoint' : 'Create Endpoint'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={assignmentDialogOpen}
                onOpenChange={(open) => {
                    if (!savingAssignment) {
                        setAssignmentDialogOpen(open);
                    }
                }}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {assignmentScope === 'global'
                                ? 'Configure Global Default'
                                : `Configure Tenant Assignment: ${assignmentTenant?.display_name || assignmentTenant?.name}`}
                        </DialogTitle>
                        <DialogDescription>
                            {assignmentScope === 'global'
                                ? 'This Password Login Endpoint is inherited by tenants without an active Tenant Override.'
                                : 'Tenant-specific assignments override the Global Default when the assignment is enabled and the endpoint is active.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password-login-assignment-endpoint">Password Login Endpoint</Label>
                            <select
                                id="password-login-assignment-endpoint"
                                data-testid="password-login-assignment-endpoint-select"
                                value={assignmentForm.password_login_endpoint_id}
                                onChange={(event) => setAssignmentForm((current) => ({
                                    ...current,
                                    password_login_endpoint_id: event.target.value,
                                }))}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                disabled={savingAssignment}
                            >
                                <option value="">Select a Password Login Endpoint</option>
                                {endpointOptions.map((endpoint) => (
                                    <option key={endpoint.id} value={endpoint.id}>
                                        {endpoint.name}{endpoint.is_active ? '' : ' (inactive)'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                            <div>
                                <Label htmlFor="password-login-assignment-enabled">Enabled</Label>
                                <p className="text-xs text-muted-foreground">
                                    Disabled assignments remain stored but do not activate password login.
                                </p>
                            </div>
                            <Switch
                                id="password-login-assignment-enabled"
                                checked={assignmentForm.enabled}
                                onCheckedChange={(checked) => setAssignmentForm((current) => ({
                                    ...current,
                                    enabled: checked,
                                }))}
                                disabled={savingAssignment}
                            />
                        </div>

                        {assignmentError ? (
                            <p className="text-sm text-destructive" data-testid="password-login-assignment-form-error">
                                {assignmentError}
                            </p>
                        ) : null}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAssignmentDialogOpen(false)} disabled={savingAssignment}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={savingAssignment} data-testid="save-password-login-assignment-btn">
                                {savingAssignment ? 'Saving...' : editingAssignment ? 'Update Assignment' : 'Save Assignment'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={Boolean(deleteState.item)}
                onOpenChange={(open) => {
                    if (!open && !deleting) {
                        setDeleteState({type: '', item: null});
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {deleteState.type === 'endpoint'
                                ? 'Delete Password Login Endpoint'
                                : deleteState.type === 'global-assignment'
                                    ? 'Remove Global Default'
                                    : 'Clear Tenant Override'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteState.type === 'endpoint'
                                ? 'This permanently removes the Password Login Endpoint definition.'
                                : 'This permanently removes the selected assignment record.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                handleDelete();
                            }}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
