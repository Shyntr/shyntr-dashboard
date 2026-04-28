import {useEffect, useMemo, useState} from 'react';
import {Building2, KeyRound, Pencil, RefreshCw, Trash2} from 'lucide-react';
import {toast} from 'sonner';
import {Alert, AlertDescription, AlertTitle} from '../ui/alert';
import {Badge} from '../ui/badge';
import {Button} from '../ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '../ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
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
    getPasswordLoginAssignments,
    getPasswordLoginEndpoints,
    getTenants,
    updatePasswordLoginAssignment,
    updatePasswordLoginEndpoint,
} from '../../lib/api';
import {
    buildPasswordLoginManagementModel,
    normalizePasswordLoginForm,
    PASSWORD_LOGIN_FORM_DEFAULTS,
    validatePasswordLoginForm,
} from '../../lib/password-login';

const StatusBadge = ({status}) => (
    <Badge variant={status.variant}>
        {status.label}
    </Badge>
);

const getTenantLabel = (tenant) => tenant.display_name || tenant.name || tenant.id;

const getEndpointName = (tenant) => `${getTenantLabel(tenant)} Password Login`;

export function PasswordLogin() {
    const [tenants, setTenants] = useState([]);
    const [endpoints, setEndpoints] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [refreshToken, setRefreshToken] = useState(0);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [formData, setFormData] = useState(PASSWORD_LOGIN_FORM_DEFAULTS);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [removingTenantId, setRemovingTenantId] = useState('');

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

                const message = error.message || 'Failed to load password login configuration';
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

    const refreshData = () => setRefreshToken((current) => current + 1);

    const openConfigureDialog = (row) => {
        setSelectedRow(row);
        setFormData({
            login_url: row.tenantEndpoint?.login_url || row.resolvedEndpoint?.login_url || '',
        });
        setFormError('');
        setDialogOpen(true);
    };

    const getReusableEndpoint = (row) => {
        if (!row.tenantAssignment || !row.tenantEndpoint) {
            return null;
        }

        const usageCount = model.endpointUsageCount[row.tenantAssignment.password_login_endpoint_id] || 0;
        return usageCount <= 1 ? row.tenantEndpoint : null;
    };

    const savePasswordLogin = async (event) => {
        event.preventDefault();

        if (saving || !selectedRow) {
            return;
        }

        const validationError = validatePasswordLoginForm(formData);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        const normalized = normalizePasswordLoginForm(formData);
        const tenant = selectedRow.tenant;
        const reusableEndpoint = getReusableEndpoint(selectedRow);

        setSaving(true);
        setFormError('');

        try {
            if (selectedRow.tenantAssignment && reusableEndpoint) {
                await updatePasswordLoginEndpoint(reusableEndpoint.id, {
                    name: reusableEndpoint.name || getEndpointName(tenant),
                    login_url: normalized.login_url,
                    is_active: true,
                });
                await updatePasswordLoginAssignment(selectedRow.tenantAssignment.id, {
                    password_login_endpoint_id: reusableEndpoint.id,
                    enabled: true,
                });
            } else {
                const endpointResponse = await createPasswordLoginEndpoint({
                    name: getEndpointName(tenant),
                    login_url: normalized.login_url,
                    is_active: true,
                });
                const endpointId = endpointResponse.data?.id;

                if (!endpointId) {
                    throw new Error('Password Login Endpoint response did not include an id');
                }

                if (selectedRow.tenantAssignment) {
                    await updatePasswordLoginAssignment(selectedRow.tenantAssignment.id, {
                        password_login_endpoint_id: endpointId,
                        enabled: true,
                    });
                } else {
                    await createPasswordLoginAssignment({
                        tenant_id: tenant.id,
                        password_login_endpoint_id: endpointId,
                        enabled: true,
                    });
                }
            }

            toast.success('Password login URL saved successfully');
            setDialogOpen(false);
            refreshData();
        } catch (error) {
            const message = error.message || 'Failed to save password login URL';
            setFormError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const removePasswordLogin = async (row) => {
        if (!row.tenantAssignment || removingTenantId) {
            return;
        }

        setRemovingTenantId(row.tenant.id);

        try {
            await deletePasswordLoginAssignment(row.tenantAssignment.id);
            toast.success('Password login URL removed successfully');
            refreshData();
        } catch (error) {
            toast.error(error.message || 'Failed to remove password login URL');
        } finally {
            setRemovingTenantId('');
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
                        Manage tenant password login URLs.
                    </p>
                </div>
                <Button variant="outline" onClick={refreshData} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>
                    Refresh
                </Button>
            </div>

            {loadError ? (
                <Alert variant="destructive" data-testid="password-login-load-error">
                    <AlertTitle>Failed to load password login configuration</AlertTitle>
                    <AlertDescription>{loadError}</AlertDescription>
                </Alert>
            ) : null}

            <Card className="bg-card/40 border-border/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-primary"/>
                        Tenant Password Login URLs
                    </CardTitle>
                    <CardDescription>
                        Configure the backend-managed password login URL for each tenant.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground"/>
                        </div>
                    ) : model.tenantRows.length === 0 ? (
                        <div
                            className="flex flex-col items-center justify-center py-16 px-4"
                            data-testid="password-login-tenants-empty"
                        >
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-6">
                                <Building2 className="h-8 w-8 text-muted-foreground" strokeWidth={1.5}/>
                            </div>
                            <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                                No tenants found
                            </h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm">
                                Create a tenant before configuring password login.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tenant</TableHead>
                                    <TableHead>Password Login URL</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {model.tenantRows.map((row) => (
                                    <TableRow key={row.tenant.id} data-testid={`password-login-tenant-row-${row.tenant.id}`}>
                                        <TableCell className="font-medium">
                                            <div>{getTenantLabel(row.tenant)}</div>
                                            <code className="text-xs text-muted-foreground">{row.tenant.name || row.tenant.id}</code>
                                        </TableCell>
                                        <TableCell>
                                            {row.resolvedEndpoint?.login_url ? (
                                                <div className="max-w-[420px] truncate text-sm">
                                                    {row.resolvedEndpoint.login_url}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Not configured</span>
                                            )}
                                            <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={row.status}/>
                                        </TableCell>
                                        <TableCell>{row.resolvedSource}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openConfigureDialog(row)}
                                                disabled={saving || Boolean(removingTenantId)}
                                            >
                                                <Pencil className="mr-1 h-3.5 w-3.5"/>
                                                {row.tenantAssignment ? 'Edit' : 'Configure'}
                                            </Button>
                                            {row.canRemove ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="hover:text-destructive hover:border-destructive"
                                                    onClick={() => removePasswordLogin(row)}
                                                    disabled={saving || removingTenantId === row.tenant.id}
                                                >
                                                    <Trash2 className="mr-1 h-3.5 w-3.5"/>
                                                    {removingTenantId === row.tenant.id ? 'Removing...' : 'Remove'}
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
                open={dialogOpen}
                onOpenChange={(open) => {
                    if (!saving) {
                        setDialogOpen(open);
                    }
                }}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedRow?.tenantAssignment ? 'Edit Password Login URL' : 'Configure Password Login URL'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedRow
                                ? `Set the password login URL for ${getTenantLabel(selectedRow.tenant)}.`
                                : 'Set the tenant password login URL.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={savePasswordLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password-login-url">Login URL</Label>
                            <Input
                                id="password-login-url"
                                data-testid="password-login-url-input"
                                value={formData.login_url}
                                onChange={(event) => setFormData({login_url: event.target.value})}
                                placeholder="https://login.example.com/verify"
                                disabled={saving}
                            />
                            <p className="text-xs text-muted-foreground">
                                Use an absolute http or https URL. Passwords are never collected or stored in the dashboard.
                            </p>
                        </div>

                        {formError ? (
                            <p className="text-sm text-destructive" data-testid="password-login-form-error">
                                {formError}
                            </p>
                        ) : null}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving} data-testid="save-password-login-url-btn">
                                {saving ? 'Saving...' : 'Save URL'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
