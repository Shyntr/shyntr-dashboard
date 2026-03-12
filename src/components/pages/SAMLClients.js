import {useEffect, useState} from 'react';
import {FileCode2, Pencil, Plus, RefreshCw, Trash2} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {Card, CardContent} from '../ui/card';
import {Button} from '../ui/button';
import {Badge} from '../ui/badge';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {Switch} from '../ui/switch';
import {Textarea} from '../ui/textarea';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '../ui/dialog';
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
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '../ui/table';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../ui/tabs';
import {toast} from 'sonner';
import {EmptyState} from '../shared/EmptyState';
import {CopyButton} from '../shared/CopyButton';
import {ProtocolBadge} from '../shared/ProtocolBadge';
import {createSAMLClient, deleteSAMLClient, getSAMLClients, getTenants, updateSAMLClient} from '../../lib/api';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {AttributeMappingEditor} from "@/components/shared/AttributeMappingEditor";

const defaultClient = {
    entity_id: '',
    name: '',
    tenant_id: 'default',
    metadata_url: '',
    acs_url: '',
    slo_url: '',
    sp_certificate: '',
    sp_encryption_certificate: '',
    sign_response: true,
    sign_assertion: true,
    encrypt_assertion: false,
    force_authn: false,
    attribute_mapping: {}
};

function SAMLClients() {
    const { t } = useTranslation();
    const [clients, setClients] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [formData, setFormData] = useState(defaultClient);
    const [attributeMappingJson, setAttributeMappingJson] = useState({});
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchClients();
        fetchTenants();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await getSAMLClients();
            setClients(response.data);
        } catch (error) {
            toast.error(error.message || 'Failed to load SAML clients');
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

    const getTenantName = (tenantId) => {
        const tenant = tenants.find(t => t.id === tenantId);
        return tenant ? (tenant.display_name || tenant.name) : tenantId;
    };

    const handleCreate = () => {
        setFormData(defaultClient);
        setIsEditing(false);
        setDialogOpen(true);
    };

    const handleEdit = (client) => {
        setFormData(client);
        setIsEditing(true);
        setDialogOpen(true);
    };

    const handleDeleteClick = (client) => {
        setSelectedClient(client);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        try {
            await deleteSAMLClient(selectedClient.id, selectedClient.tenant_id);
            toast.success('SAML client deleted successfully');
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

        if (!formData.metadata_url?.trim()) {
            if (!formData.entity_id.trim()) {
                toast.error('Entity ID is required if Metadata URL is not provided');
                return;
            }
            if (!formData.acs_url.trim()) {
                toast.error('ACS URL is required if Metadata URL is not provided');
                return;
            }
        }

        let attributeMapping = {};
        try {
            attributeMapping = Object.assign(attributeMappingJson, {});
        } catch (err) {
            toast.error('Invalid JSON in attribute mapping');
            return;
        }

        const submitData = {
            ...formData,
            attribute_mapping: attributeMapping
        };

        try {
            if (isEditing) {
                await updateSAMLClient(formData.id, submitData);
                toast.success('SAML client updated successfully');
            } else {
                await createSAMLClient(submitData);
                toast.success('SAML client created successfully');
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

    return (
        <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="saml-clients-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
                            {t('saml_clients.title', 'SAML Clients')}
                        </h1>
                        <ProtocolBadge protocol="saml"/>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t('saml_clients.subtitle', 'Service Providers (SPs) receiving SAML assertions from Shyntr')}
                    </p>
                </div>
                <Button
                    onClick={handleCreate}
                    data-testid="create-saml-client-btn"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                >
                    <Plus className="h-4 w-4 mr-2"/>
                    {t('saml_clients.create_btn', 'Create SAML Client')}
                </Button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground"/>
                </div>
            ) : clients.length === 0 ? (
                <EmptyState
                    icon={FileCode2}
                    title={t('saml_clients.empty_title', 'No SAML clients yet')}
                    description={t('saml_clients.empty_desc', 'Create your first SAML Service Provider to enable enterprise SSO integration.')}
                    actionLabel={t('saml_clients.create_btn', 'Create SAML Client')}
                    onAction={handleCreate}
                    testId="empty-saml-clients"
                />
            ) : (
                <Card className="bg-card/40 backdrop-blur-sm border-border/40">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="text-xs uppercase tracking-wider">{t('common.entity_id', 'Entity ID')}</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider">{t('common.tenant', 'Tenant')}</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">{t('saml_clients.acs_url', 'ACS URL')}</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">{t('saml_clients.slo_url', 'SLO URL')}</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">{t('common.settings', 'Settings')}</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">{t('common.created', 'Created')}</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-right">{t('common.actions', 'Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clients.map((client) => (
                                    <TableRow
                                        key={client.id}
                                        className="hover:bg-muted/30 border-b border-border/40"
                                        data-testid={`saml-client-row-${client.id}`}
                                    >
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <code
                                                        className="text-sm font-mono bg-muted/50 px-2 py-1 rounded max-w-[200px] truncate">
                                                        {client.entity_id}
                                                    </code>
                                                    <CopyButton value={client.entity_id}
                                                                testId={`copy-entity-id-${client.id}`}/>
                                                </div>
                                                {client.name && (
                                                    <span className="text-xs text-muted-foreground">{client.name}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className='bg-amber-500/15 text-amber-500 border-amber-500/20'
                                            >
                                                {getTenantName(client.tenant_id)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <code
                                                className="text-sm font-mono text-muted-foreground max-w-[200px] truncate block">
                                                {client.acs_url}
                                            </code>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <code
                                                className="text-sm font-mono text-muted-foreground max-w-[200px] truncate block">
                                                {client.slo_url}
                                            </code>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                                {client.sign_response && (
                                                    <Badge variant="outline"
                                                           className="text-xs bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                                                        {t('common.signed', 'Signed')}
                                                    </Badge>
                                                )}
                                                {client.encrypt_assertion && (
                                                    <Badge variant="outline"
                                                           className="text-xs bg-blue-500/15 text-blue-500 border-blue-500/20">
                                                        {t('common.encrypted', 'Encrypted')}
                                                    </Badge>
                                                )}
                                            </div>
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
                                                    data-testid={`edit-saml-client-${client.id}`}
                                                    className="h-8 w-8"
                                                >
                                                    <Pencil className="h-4 w-4"/>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteClick(client)}
                                                    data-testid={`delete-saml-client-${client.id}`}
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
                            {isEditing ? t('saml_clients.edit_title', 'Edit SAML Client') : t('saml_clients.create_title', 'Create SAML Client')}
                            <ProtocolBadge protocol="saml"/>
                        </DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? t('saml_clients.edit_desc', 'Update your SAML Service Provider configuration')
                                : t('saml_clients.create_desc', 'Configure a new SAML Service Provider')
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="basic">{t('common.basic', 'Basic')}</TabsTrigger>
                                <TabsTrigger value="security">{t('common.security', 'Security')}</TabsTrigger>
                                <TabsTrigger value="mapping">{t('common.attribute_mapping', 'Attribute Mapping')}</TabsTrigger>
                            </TabsList>

                            <TabsContent value="basic" className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('common.tenant', 'Tenant')} *</Label>
                                        <Select
                                            value={formData.tenant_id}
                                            onValueChange={(value) => setFormData({...formData, tenant_id: value})}
                                            // disabled={isEditing} // Optional: Disable if moving tenants isn't allowed
                                        >
                                            <SelectTrigger>
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
                                        <Label htmlFor="name">{t('common.display_name', 'Display Name')}</Label>
                                        <Input
                                            id="name"
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            placeholder="Jira Corporate"
                                            data-testid="saml-client-name-input"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="metadata-url">{t('saml_clients.sp_metadata_url', 'SP Metadata URL')}</Label>
                                    <Input
                                        id="metadata-url"
                                        value={formData.metadata_url || ''}
                                        onChange={(e) => setFormData({...formData, metadata_url: e.target.value})}
                                        placeholder="https://jira.corp.com/SAML/metadata"
                                        data-testid="saml-metadata-url-input"
                                    />
                                    <p className="text-xs text-muted-foreground">{t('saml_clients.sp_metadata_desc', 'Provide a Metadata URL to auto-fill SP details. If provided, fields below are optional.')}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="entity-id">{t('common.entity_id', 'Entity ID')} {formData.metadata_url ? '' : '*'}</Label>
                                    <Input
                                        id="entity-id"
                                        value={formData.entity_id}
                                        onChange={(e) => setFormData({...formData, entity_id: e.target.value})}
                                        placeholder="https://jira.corp.com/shyntr-app"
                                        data-testid="saml-entity-id-input"
                                    />
                                    <p className="text-xs text-muted-foreground">{t('saml_clients.entity_id_desc', 'Unique URI identifying this SP')}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="acs-url">{t('saml_clients.acs_url', 'ACS URL')} ({t('saml_clients.acs_url_full', 'Assertion Consumer Service')}) {formData.metadata_url ? '' : '*'}</Label>
                                    <Input
                                        id="acs-url"
                                        value={formData.acs_url}
                                        onChange={(e) => setFormData({...formData, acs_url: e.target.value})}
                                        placeholder="https://jira.corp.com/SAML/ACS"
                                        data-testid="saml-acs-url-input"
                                    />
                                    <p className="text-xs text-muted-foreground">{t('saml_clients.acs_desc', 'Where Shyntr sends the SAML assertion')}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="slo-url">{t('saml_clients.slo_url', 'SLO URL')} ({t('saml_clients.slo_url_full', 'Single Logout Service')})</Label>
                                    <Input
                                        id="slo-url"
                                        value={formData.slo_url}
                                        onChange={(e) => setFormData({...formData, slo_url: e.target.value})}
                                        placeholder="https://jira.corp.com/SAML/SLO"
                                        data-testid="saml-slo-url-input"
                                    />
                                    <p className="text-xs text-muted-foreground">{t('saml_clients.slo_desc', 'Optional: For Single Logout Support')}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('saml_clients.sp_cert', 'SP Certificate (Signing)')}</Label>
                                        <Textarea
                                            value={formData.sp_certificate || ''}
                                            onChange={(e) => setFormData({...formData, sp_certificate: e.target.value})}
                                            placeholder={`-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----`}
                                            rows={5}
                                            className="font-mono text-sm"
                                        />
                                        <p className="text-xs text-muted-foreground">{t('saml_clients.sp_cert_desc', 'Optional: Base SP Certificate (PEM)')}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('saml_clients.sp_enc_cert', 'SP Encryption Certificate')}</Label>
                                        <Textarea
                                            value={formData.sp_encryption_certificate || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                sp_encryption_certificate: e.target.value
                                            })}
                                            placeholder={`-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----`}
                                            rows={5}
                                            className="font-mono text-sm"
                                        />
                                        <p className="text-xs text-muted-foreground">{t('saml_clients.sp_enc_cert_desc', 'Optional: Separate cert for encryption')}</p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="security" className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div
                                        className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">{t('saml_clients.sign_response', 'Sign Response')}</Label>
                                            <p className="text-xs text-muted-foreground">
                                                {t('saml_clients.sign_response_desc', 'Sign the entire SAML response')}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.sign_response}
                                            onCheckedChange={(checked) => setFormData({
                                                ...formData,
                                                sign_response: checked
                                            })}
                                            data-testid="saml-sign-response-toggle"
                                        />
                                    </div>
                                    <div
                                        className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">{t('saml_clients.sign_assertion', 'Sign Assertion')}</Label>
                                            <p className="text-xs text-muted-foreground">
                                                {t('saml_clients.sign_assertion_desc', 'Sign the SAML assertion')}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.sign_assertion}
                                            onCheckedChange={(checked) => setFormData({
                                                ...formData,
                                                sign_assertion: checked
                                            })}
                                            data-testid="saml-sign-assertion-toggle"
                                        />
                                    </div>
                                    <div
                                        className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">{t('saml_clients.encrypt_assertion', 'Encrypt Assertion')}</Label>
                                            <p className="text-xs text-muted-foreground">
                                                {t('saml_clients.encrypt_assertion_desc', 'Encrypt using SP certificate')}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.encrypt_assertion}
                                            onCheckedChange={(checked) => setFormData({
                                                ...formData,
                                                encrypt_assertion: checked
                                            })}
                                            data-testid="saml-encrypt-toggle"
                                        />
                                    </div>
                                    <div
                                        className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                                        <div>
                                            <Label className="text-sm font-medium">{t('saml_clients.force_authn', 'Force AuthN')}</Label>
                                            <p className="text-xs text-muted-foreground">
                                                {t('saml_clients.force_authn_desc', 'Require re-authentication')}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.force_authn}
                                            onCheckedChange={(checked) => setFormData({
                                                ...formData,
                                                force_authn: checked
                                            })}
                                            data-testid="saml-force-authn-toggle"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="mapping" className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <AttributeMappingEditor initialRules={formData.attribute_mapping || {}}
                                                            onChange={setAttributeMappingJson}
                                                            subtitle={t('saml_clients.mapping_desc', 'Map SAML assertion attributes to standard claims')}
                                                            tenantId={formData.tenant_id}/>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                data-testid="cancel-saml-client-btn"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                data-testid="save-saml-client-btn"
                                className="bg-primary hover:bg-primary/90"
                            >
                                {isEditing ? t('common.update', 'Update') : t('common.create', 'Create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('saml_clients.delete_title', 'Delete SAML Client')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('common.delete_confirm', 'Are you sure you want to delete')} <strong>{selectedClient?.name || selectedClient?.entity_id}</strong>?
                            {t('common.cannot_undone', 'This action cannot be undone.')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel data-testid="cancel-delete-saml-client-btn">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            data-testid="confirm-delete-saml-client-btn"
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {t('common.delete', 'Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default SAMLClients
