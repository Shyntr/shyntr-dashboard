import {useEffect, useState, useCallback} from 'react';
import {Plus, Pencil, Trash2, ShieldAlert, RefreshCw, Network} from 'lucide-react';
import {Card, CardContent} from '../ui/card';
import {Button} from '../ui/button';
import {Badge} from '../ui/badge';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {Switch} from '../ui/switch';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../ui/tabs';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '../ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import {toast} from 'sonner';
import {EmptyState} from '../shared/EmptyState';
import {MultiInput} from '../shared/MultiInput';
import {
    getTenants,
    getOutboundPolicies,
    createOutboundPolicy,
    updateOutboundPolicy,
    deleteOutboundPolicy
} from '../../lib/api';

const TARGET_TYPES = [
    {value: 'webhook_delivery', label: 'Webhook Delivery'},
    {value: 'jwks_fetch', label: 'JWKS Fetch'},
    {value: 'oidc_discovery', label: 'OIDC Discovery'},
    {value: 'all', label: 'All Targets (Global)'}
];

const defaultPolicy = {
    name: '',
    tenant_id: 'default',
    target: 'webhook_delivery',
    enabled: false,

    // Secure by default SSRF settings
    block_private_ips: true,
    block_loopback_ips: true,
    block_link_local_ips: true,
    block_multicast_ips: true,
    block_localhost_names: true,
    disable_redirects: true,
    require_dns_resolve: true,
    // Restrictions
    allowed_host_patterns: ['*'],
    allowed_path_patterns: ['/*'],
    allowed_schemes: ['https'],
    allowed_ports: ['443'],
    max_response_bytes: 5242880, // 5MB
    request_timeout_seconds: 10
};

export function OutboundPolicies() {
    const [policies, setPolicies] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [selectedTenantFilter, setSelectedTenantFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [formData, setFormData] = useState(defaultPolicy);
    const [isEditing, setIsEditing] = useState(false);

    const fetchTenants = useCallback(async () => {
        try {
            const response = await getTenants();
            setTenants(response.data || []);
        } catch (error) {
            toast.error('Failed to load tenants');
        }
    }, []);

    const fetchPolicies = useCallback(async () => {
        setLoading(true);
        try {
            const tenantId = selectedTenantFilter === 'all' ? undefined : selectedTenantFilter;
            const response = await getOutboundPolicies(tenantId);
            setPolicies(response.data || []);
        } catch (error) {
            toast.error(error.message || 'Failed to load outbound policies');
        } finally {
            setLoading(false);
        }
    }, [selectedTenantFilter]);

    useEffect(() => {
        fetchTenants();
        fetchPolicies();
    }, [fetchTenants, fetchPolicies]);

    const getTenantName = (tenantId) => {
        if (!tenantId) return 'Global / All';
        const tenant = tenants.find(t => t.id === tenantId);
        return tenant ? (tenant.display_name || tenant.name) : tenantId;
    };

    const handleCreateClick = () => {
        setFormData(defaultPolicy);
        setIsEditing(false);
        setDialogOpen(true);
    };

    const handleEditClick = (policy) => {
        setFormData({
        ...defaultPolicy,
            ...policy,
        enabled: policy.enabled ?? true,
        block_private_ips: policy.block_private_ips ?? true,
        block_loopback_ips: policy.block_loopback_ips ?? true,
        block_link_local_ips: policy.block_link_local_ips ?? true,
        block_multicast_ips: policy.block_multicast_ips ?? true,
        block_localhost_names: policy.block_localhost_names ?? true,
        disable_redirects: policy.disable_redirects ?? true,
        require_dns_resolve: policy.require_dns_resolve ?? true,
            allowed_ports: policy.allowed_ports?.map(String) || ['443']
        });
        setSelectedPolicy(policy);
        setIsEditing(true);
        setDialogOpen(true);
    };

    const handleDeleteClick = (policy) => {
        setSelectedPolicy(policy);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        try {
            await deleteOutboundPolicy(selectedPolicy.id);
            toast.success('Outbound policy deleted successfully');
            fetchPolicies();
        } catch (error) {
            toast.error(error.message || 'Failed to delete outbound policy');
        } finally {
            setDeleteDialogOpen(false);
            setSelectedPolicy(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Policy name is required');
            return;
        }

        const cleanData = {
            ...formData,
            allowed_host_patterns: formData.allowed_host_patterns.filter(p => p.trim()),
            allowed_path_patterns: formData.allowed_path_patterns.filter(p => p.trim()),
            allowed_ports: formData.allowed_ports
                .filter(p => p.trim() && !isNaN(p))
                .map(p => parseInt(p, 10)),
            max_response_bytes: parseInt(formData.max_response_bytes, 10) || 5242880,
            request_timeout_seconds: parseInt(formData.request_timeout_seconds, 10) || 10
        };

        try {
            if (isEditing) {
                await updateOutboundPolicy(formData.id, cleanData);
                toast.success('Outbound policy updated successfully');
            } else {
                await createOutboundPolicy(cleanData);
                toast.success('Outbound policy created successfully');
            }
            setDialogOpen(false);
            fetchPolicies();
        } catch (error) {
            toast.error(error.message || 'Failed to save outbound policy');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const getTargetLabel = (targetValue) => {
        const target = TARGET_TYPES.find(t => t.value === targetValue);
        return target ? target.label : targetValue?.replace('_', ' ');
    };

    return (
        <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="outbound-policies-page">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
                            Outbound Policies
                        </h1>
                        <ShieldAlert className="h-6 w-6 text-destructive"/>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Manage egress rules and SSRF protections for Shyntr's external network calls.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <Select value={selectedTenantFilter} onValueChange={setSelectedTenantFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by Tenant"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tenants</SelectItem>
                            {tenants.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.display_name || t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={handleCreateClick}
                        className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                    >
                        <Plus className="h-4 w-4 mr-2"/>
                        Create Policy
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground"/>
                </div>
            ) : policies.length === 0 ? (
                <EmptyState
                    icon={Network}
                    title="No Outbound Policies"
                    description="Zero Trust architecture requires explicit outbound policies. Create a policy to allow outbound network traffic."
                    actionLabel="Create Policy"
                    onAction={handleCreateClick}
                    testId="empty-outbound-policies"
                />
            ) : (
                <Card className="bg-card/40 backdrop-blur-sm border-border/40">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="text-xs uppercase tracking-wider">Policy Name</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider">Target</TableHead>
                                    <TableHead
                                        className="text-xs uppercase tracking-wider hidden md:table-cell">Tenant</TableHead>
                                    <TableHead
                                        className="text-xs uppercase tracking-wider hidden lg:table-cell">Restrictions</TableHead>
                                    <TableHead
                                        className="text-xs uppercase tracking-wider hidden lg:table-cell">Created</TableHead>
                                    <TableHead
                                        className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {policies.map((policy) => (
                                    <TableRow key={policy.id} className="hover:bg-muted/30 border-b border-border/40">
                                        <TableCell>
                                                <span className="font-medium text-foreground">{policy.name}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    policy.enabled
                                                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20'
                                                        : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                                                }
                                            >
                                                {policy.enabled ? 'Enabled' : 'Disabled'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs bg-muted/30">
                                                {getTargetLabel(policy.target)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge variant="outline"
                                                   className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                {getTenantName(policy.tenant_id)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                                {policy.block_link_local_ips && (
                                                    <span
                                                        className="text-[10px] bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/30">No Local IP</span>
                                                )}
                                                {policy.block_multicast_ips && (
                                                    <span
                                                        className="text-[10px] bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/30">No Multicast</span>
                                                )}
                                                {policy.block_private_ips && (
                                                    <span
                                                        className="text-[10px] bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/30">No Private IP</span>
                                                )}
                                                {policy.block_localhost_names && (
                                                    <span
                                                        className="text-[10px] bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/30">No Localhost</span>
                                                )}
                                                {policy.allowed_host_patterns?.length > 0 && (
                                                    <span
                                                        className="text-[10px] bg-blue-500/15 text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/30">Hosts Restricted</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                            {formatDate(policy.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditClick(policy)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                >
                                                    <Pencil className="h-4 w-4"/>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteClick(policy)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-primary"/>
                            {isEditing ? 'Edit Outbound Policy' : 'Create Outbound Policy'}
                        </DialogTitle>
                        <DialogDescription>
                            Configure strict egress controls for external requests (SSRF prevention).
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="basic">Basic & Targets</TabsTrigger>
                                <TabsTrigger value="security">Network Security</TabsTrigger>
                                <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
                            </TabsList>

                            <TabsContent value="basic" className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">Enabled</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Enable or disable this outbound policy
                                            </p>
                                        </div>
                                        <Switch
                                            checked={!!formData.enabled}
                                            onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                                            data-testid="outbound-policy-enabled-toggle"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="policy-name">Policy Name *</Label>
                                        <Input
                                            id="policy-name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            placeholder="my-webhook-policy"
                                            disabled={isEditing}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tenant *</Label>
                                        <Select
                                            value={formData.tenant_id}
                                            onValueChange={(value) => setFormData({...formData, tenant_id: value})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a tenant"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="global">Global (All Tenants)</SelectItem>
                                                {tenants.map((tenant) => (
                                                    <SelectItem key={tenant.id} value={tenant.id}>
                                                        {tenant.display_name || tenant.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Traffic Target *</Label>
                                    <Select
                                        value={formData.target}
                                        onValueChange={(value) => setFormData({...formData, target: value})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TARGET_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Which backend service context does this policy apply to?
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="security" className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div
                                        className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">Block Private IPs</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Prevent routing to RFC 1918 addresses
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.block_private_ips}
                                            onCheckedChange={(c) => setFormData({...formData, block_private_ips: c})}
                                        />
                                    </div>
                                    <div
                                        className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">Block Loopback IPs</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Prevent routing to 127.x.x.x
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.block_loopback_ips}
                                            onCheckedChange={(c) => setFormData({...formData, block_loopback_ips: c})}
                                        />
                                    </div>
                                    <div
                                        className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">Block Localhost Names</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Prevent routing to 'localhost'
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.block_localhost_names}
                                            onCheckedChange={(c) => setFormData({
                                                ...formData,
                                                block_localhost_names: c
                                            })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">Block Link-Local IPs</Label>
                                            <p className="text-xs text-muted-foreground">Block 169.254.0.0/16 and link-local ranges</p>
                                        </div>
                                        <Switch
                                            checked={!!formData.block_link_local_ips}
                                            onCheckedChange={(checked) => setFormData({ ...formData, block_link_local_ips: checked })}
                                            data-testid="outbound-policy-block-link-local-ips"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">Block Multicast IPs</Label>
                                            <p className="text-xs text-muted-foreground">Prevent multicast/broadcast-style destinations</p>
                                        </div>
                                        <Switch
                                            checked={!!formData.block_multicast_ips}
                                            onCheckedChange={(checked) => setFormData({ ...formData, block_multicast_ips: checked })}
                                            data-testid="outbound-policy-block-multicast-ips"
                                        />
                                    </div>
                                    <div
                                        className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">Require DNS Resolve</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Ensure target resolves before routing
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.require_dns_resolve}
                                            onCheckedChange={(c) => setFormData({...formData, require_dns_resolve: c})}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">Disable Redirects</Label>
                                            <p className="text-xs text-muted-foreground">Do not follow HTTP redirects</p>
                                        </div>
                                        <Switch
                                            checked={!!formData.disable_redirects}
                                            onCheckedChange={(checked) => setFormData({ ...formData, disable_redirects: checked })}
                                            data-testid="outbound-policy-disable-redirects"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="restrictions" className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Max Response Bytes</Label>
                                        <Input
                                            type="number"
                                            value={formData.max_response_bytes}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                max_response_bytes: e.target.value
                                            })}
                                            min="0"
                                        />
                                        <p className="text-xs text-muted-foreground">Limit body size (DoS
                                            protection)</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Request Timeout (Seconds)</Label>
                                        <Input
                                            type="number"
                                            value={formData.request_timeout_seconds}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                request_timeout_seconds: e.target.value
                                            })}
                                            min="1"
                                            max="300"
                                        />
                                        <p className="text-xs text-muted-foreground">Max duration for external call</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Allowed Schemes</Label>
                                    <MultiInput
                                        values={formData.allowed_schemes}
                                        onChange={(values) => setFormData({...formData, allowed_schemes: values})}
                                        placeholder="https"
                                        testId="outbound-schemes"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Allowed Host Patterns</Label>
                                    <MultiInput
                                        values={formData.allowed_host_patterns}
                                        onChange={(values) => setFormData({...formData, allowed_host_patterns: values})}
                                        placeholder="*.example.com"
                                        testId="outbound-host"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Allowed Path Patterns</Label>
                                    <MultiInput
                                        values={formData.allowed_path_patterns}
                                        onChange={(values) => setFormData({...formData, allowed_path_patterns: values})}
                                        placeholder="/api/*"
                                        testId="outbound-path"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Allowed Ports</Label>
                                    <MultiInput
                                        values={formData.allowed_ports}
                                        onChange={(values) => setFormData({...formData, allowed_ports: values})}
                                        placeholder="443"
                                        testId="outbound-port"
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary hover:bg-primary/90"
                            >
                                {isEditing ? 'Update Policy' : 'Create Policy'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Outbound Policy</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the policy <strong>{selectedPolicy?.name}</strong>?
                            <br/><br/>
                            Network traffic depending on this rule will be immediately blocked according to Zero Trust
                            principles.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}