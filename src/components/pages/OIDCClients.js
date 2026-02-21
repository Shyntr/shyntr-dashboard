import {useEffect, useState} from 'react';
import {Plus, Pencil, Trash2, AppWindow, RefreshCw} from 'lucide-react';
import {Card, CardContent} from '../ui/card';
import {Button} from '../ui/button';
import {Badge} from '../ui/badge';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {Switch} from '../ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../ui/tabs';
import {toast} from 'sonner';
import {EmptyState} from '../shared/EmptyState';
import {CopyButton} from '../shared/CopyButton';
import {SecretInput} from '../shared/SecretInput';
import {MultiInput} from '../shared/MultiInput';
import {ProtocolBadge} from '../shared/ProtocolBadge';
import {
    getOIDCClients,
    createOIDCClient,
    updateOIDCClient,
    deleteOIDCClient,
    getTenants
} from '../../lib/api';

const GRANT_TYPES = [
    'authorization_code',
    'refresh_token',
    'client_credentials',
    'implicit',
    'urn:ietf:params:oauth:grant-type:jwt-bearer'
];

const RESPONSE_TYPES = [
    'code',
    'token',
    'id_token',
    'code id_token',
    'code token',
    'code id_token token'
];

const RESPONSE_TYPE_LABELS = {
    'code': 'Code',
    'token': 'Token',
    'id_token': 'ID Token',
    'code id_token': 'Code + ID Token (Hybrid)',
    'code token': 'Code + Token (Hybrid)',
    'code id_token token': 'Code + ID Token + Token (Hybrid)'
};


const AUTH_METHODS = [
    {value: 'client_secret_basic', label: 'Client Secret Basic'},
    {value: 'client_secret_post', label: 'Client Secret Post'},
    {value: 'private_key_jwt', label: 'Private Key JWT'},
    {value: 'none', label: 'None (Public)'}
];

const defaultClient = {
    client_id: '',
    name: '',
    tenant_id: 'default',
    client_secret: '',
    redirect_uris: [''],
    allowed_cors_origins: [''],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    scopes: ['openid', 'profile', 'email'],
    audience: [],
    public: false,
    enforce_pkce: true,
    token_endpoint_auth_method: 'client_secret_basic'
};

export function OIDCClients() {
    const [clients, setClients] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [formData, setFormData] = useState(defaultClient);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchClients();
        fetchTenants();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await getOIDCClients();
            setClients(response.data);
        } catch (error) {
            toast.error(error.message || 'Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    const fetchTenants = async () => {
        try {
            const response = await getTenants();
            setTenants(response.data);
        } catch (error) {
            console.error('Failed to load tenants:', error);
        }
    };

    const handleCreate = () => {
        setFormData(defaultClient);
        setIsEditing(false);
        setDialogOpen(true);
    };

    const handleEdit = (client) => {
        setFormData({
            ...client,
            redirect_uris: client.redirect_uris?.length ? client.redirect_uris : [''],
            allowed_cors_origins: client.allowed_cors_origins?.length ? client.allowed_cors_origins : [''],
            audience: client.audience || []
        });
        setIsEditing(true);
        setDialogOpen(true);
    };

    const handleDeleteClick = (client) => {
        setSelectedClient(client);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        try {
            await deleteOIDCClient(selectedClient.client_id);
            toast.success('Client deleted successfully');
            fetchClients();
        } catch (error) {
            toast.error(error.message || 'Failed to delete client');
        } finally {
            setDeleteDialogOpen(false);
            setSelectedClient(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.client_id.trim()) {
            toast.error('Client ID is required');
            return;
        }

        const cleanData = {
            ...formData,
            redirect_uris: formData.redirect_uris.filter(u => u.trim()),
            allowed_cors_origins: formData.allowed_cors_origins.filter(o => o.trim()),
            scopes: formData.scopes.filter(s => s.trim()),
            audience: formData.audience.filter(a => a.trim())
        };

        try {
            if (isEditing) {
                await updateOIDCClient(formData.client_id, cleanData);
                toast.success('Client updated successfully');
            } else {
                await createOIDCClient(cleanData);
                toast.success('Client created successfully');
            }
            setDialogOpen(false);
            fetchClients();
        } catch (error) {
            toast.error(error.message || 'Failed to save client');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const toggleArrayItem = (array, item, setter, field) => {
        setter(prev => ({
            ...prev,
            [field]: array.includes(item)
                ? array.filter(t => t !== item)
                : [...array, item]
        }));
    };

    return (
        <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="oidc-clients-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
                            OIDC Clients
                        </h1>
                        <ProtocolBadge protocol="oidc"/>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        OAuth2/OpenID Connect applications consuming identity from Shyntr
                    </p>
                </div>
                <Button
                    onClick={handleCreate}
                    data-testid="create-oidc-client-btn"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                >
                    <Plus className="h-4 w-4 mr-2"/>
                    Create OIDC Client
                </Button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground"/>
                </div>
            ) : clients.length === 0 ? (
                <EmptyState
                    icon={AppWindow}
                    title="No OIDC clients yet"
                    description="Create your first OIDC client to start authenticating users via OAuth2/OpenID Connect."
                    actionLabel="Create OIDC Client"
                    onAction={handleCreate}
                    testId="empty-oidc-clients"
                />
            ) : (
                <Card className="bg-card/40 backdrop-blur-sm border-border/40">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="text-xs uppercase tracking-wider">Client ID</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider">Tenant</TableHead>
                                    <TableHead
                                        className="text-xs uppercase tracking-wider hidden md:table-cell">Secret</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">Auth
                                        Method</TableHead>
                                    <TableHead
                                        className="text-xs uppercase tracking-wider hidden lg:table-cell">Created</TableHead>
                                    <TableHead
                                        className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clients.map((client) => (
                                    <TableRow
                                        key={client.client_id}
                                        className="hover:bg-muted/30 border-b border-border/40"
                                        data-testid={`oidc-client-row-${client.client_id}`}
                                    >
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <code className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">
                                                        {client.client_id}
                                                    </code>
                                                    <CopyButton value={client.client_id}
                                                                testId={`copy-client-id-${client.client_id}`}/>
                                                </div>
                                                {client.name && (
                                                    <span className="text-xs text-muted-foreground">{client.name}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={client.public
                                                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/20'
                                                    : 'bg-violet-500/15 text-violet-500 border-violet-500/20'
                                                }
                                            >
                                                {client.public ? 'Public' : 'Confidential'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={client.tenant_id
                                                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/20'
                                                    : 'bg-violet-500/15 text-violet-500 border-violet-500/20'
                                                }
                                            >
                                                {tenants.find(t => t.id === client?.tenant_id || t.name === client?.tenant_id)?.name || 'default'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono text-muted-foreground">
                                                    ••••••••
                                                </code>
                                                <CopyButton value={client.client_secret}
                                                            testId={`copy-secret-${client.client_id}`}/>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {client.token_endpoint_auth_method?.replace(/_/g, ' ')}
                      </span>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                            {formatDate(client.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(client)}
                                                    data-testid={`edit-oidc-client-${client.client_id}`}
                                                    className="h-8 w-8"
                                                >
                                                    <Pencil className="h-4 w-4"/>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteClick(client)}
                                                    data-testid={`delete-oidc-client-${client.client_id}`}
                                                    className="h-8 w-8 hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            {isEditing ? 'Edit OIDC Client' : 'Create OIDC Client'}
                            <ProtocolBadge protocol="oidc"/>
                        </DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? 'Update your OAuth2/OIDC client configuration'
                                : 'Configure a new OAuth2/OIDC client for your application'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="basic">Basic</TabsTrigger>
                                <TabsTrigger value="oauth">OAuth Settings</TabsTrigger>
                                <TabsTrigger value="security">Security</TabsTrigger>
                            </TabsList>

                            <TabsContent value="basic" className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="client-id">Client ID *</Label>
                                        <Input
                                            id="client-id"
                                            value={formData.client_id}
                                            onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                                            placeholder="my-react-app"
                                            disabled={isEditing}
                                            data-testid="oidc-client-id-input"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Display Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            placeholder="My React Application"
                                            data-testid="oidc-client-name-input"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Tenant</Label>
                                    <Select
                                        value={formData.tenant_id}
                                        onValueChange={(value) => setFormData({...formData, tenant_id: value})}
                                        // disabled={isEditing}
                                    >
                                        <SelectTrigger data-testid="oidc-tenant-select">
                                            <SelectValue placeholder="Select a tenant"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tenants.map((tenant) => (
                                                <SelectItem key={tenant.id} value={tenant.id}>
                                                    {tenant.display_name || tenant.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Client Secret</Label>
                                    <SecretInput
                                        value={formData.client_secret}
                                        onChange={(e) => setFormData({...formData, client_secret: e.target.value})}
                                        placeholder="Leave empty to auto-generate"
                                        showCopy={isEditing}
                                        testId="oidc-client-secret-input"
                                    />
                                    {!isEditing && (
                                        <p className="text-xs text-muted-foreground">
                                            Leave empty to auto-generate a secure secret
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Redirect URIs</Label>
                                    <MultiInput
                                        values={formData.redirect_uris}
                                        onChange={(values) => setFormData({...formData, redirect_uris: values})}
                                        placeholder="https://app.example.com/callback"
                                        testId="oidc-redirect-uri"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Allowed CORS Origins</Label>
                                    <MultiInput
                                        values={formData.allowed_cors_origins}
                                        onChange={(values) => setFormData({...formData, allowed_cors_origins: values})}
                                        placeholder="https://app.example.com"
                                        testId="oidc-cors-origin"
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="oauth" className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label>Grant Types</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {GRANT_TYPES.map((type) => (
                                            <Badge
                                                key={type}
                                                variant="outline"
                                                className={`cursor-pointer transition-colors ${
                                                    formData.grant_types.includes(type)
                                                        ? 'bg-teal-500/20 text-teal-400 border-teal-500/40'
                                                        : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
                                                }`}
                                                onClick={() => toggleArrayItem(formData.grant_types, type, setFormData, 'grant_types')}
                                                data-testid={`grant-type-${type}`}
                                            >
                                                {type.replace(/urn:ietf:params:oauth:grant-type:/g, '')}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Response Types</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {RESPONSE_TYPES.map((type) => (
                                            <Badge
                                                key={type}
                                                variant="outline"
                                                className={`cursor-pointer transition-colors ${
                                                    formData.response_types.includes(type)
                                                        ? 'bg-teal-500/20 text-teal-400 border-teal-500/40'
                                                        : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
                                                }`}
                                                onClick={() => toggleArrayItem(formData.response_types, type, setFormData, 'response_types')}
                                                data-testid={`response-type-${type.replace(/\s+/g, '-')}`}
                                            >
                                                {RESPONSE_TYPE_LABELS[type] || type}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Scopes (comma-separated)</Label>
                                    <Input
                                        value={formData.scopes.join(', ')}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            scopes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                        })}
                                        placeholder="openid, profile, email"
                                        data-testid="oidc-scopes-input"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Audience (comma-separated)</Label>
                                    <Input
                                        value={(formData.audience || []).join(', ')}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            audience: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                        })}
                                        placeholder="https://api.example.com"
                                        data-testid="oidc-audience-input"
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="security" className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label>Authentication Method</Label>
                                    <Select
                                        value={formData.token_endpoint_auth_method}
                                        onValueChange={(value) => setFormData({
                                            ...formData,
                                            token_endpoint_auth_method: value
                                        })}
                                    >
                                        <SelectTrigger data-testid="oidc-auth-method-select">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {AUTH_METHODS.map((method) => (
                                                <SelectItem key={method.value} value={method.value}>
                                                    {method.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div
                                        className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">Public Client</Label>
                                            <p className="text-xs text-muted-foreground">
                                                For SPAs and mobile apps (no secret)
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.public}
                                            onCheckedChange={(checked) => setFormData({...formData, public: checked})}
                                            data-testid="oidc-public-toggle"
                                        />
                                    </div>
                                    <div
                                        className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">Enforce PKCE</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Proof Key for Code Exchange
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.enforce_pkce}
                                            onCheckedChange={(checked) => setFormData({
                                                ...formData,
                                                enforce_pkce: checked
                                            })}
                                            data-testid="oidc-pkce-toggle"
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                data-testid="cancel-oidc-client-btn"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                data-testid="save-oidc-client-btn"
                                className="bg-primary hover:bg-primary/90"
                            >
                                {isEditing ? 'Update Client' : 'Create Client'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete OIDC Client</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{selectedClient?.client_id}</strong>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel data-testid="cancel-delete-btn">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            data-testid="confirm-delete-btn"
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
