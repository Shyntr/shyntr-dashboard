import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, GlobeLock, RefreshCw, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { toast } from 'sonner';
import { EmptyState } from '../shared/EmptyState';
import { SecretInput } from '../shared/SecretInput';
import { ProtocolBadge } from '../shared/ProtocolBadge';
import { CopyButton } from '../shared/CopyButton';
import { 
  getOIDCConnections, 
  createOIDCConnection, 
  updateOIDCConnection, 
  deleteOIDCConnection,
  getTenants
} from '../../lib/api';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {AttributeMappingEditor} from "@/components/shared/AttributeMappingEditor";
import {getProviderIcon} from "@/lib/utils";

const defaultConnection = {
  name: '',
  tenant_id: 'default',
  issuer_url: '',
  client_id: '',
  client_secret: '',
  scopes: ['openid', 'email', 'profile'],
  authorization_endpoint: '',
  token_endpoint: '',
  userinfo_endpoint: '',
  attribute_mapping: {}
};

export function OIDCConnections() {
  const { t } = useTranslation();
  const [connections, setConnections] = useState([]);
  const [attributeMappingJson, setAttributeMappingJson] = useState({});
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [formData, setFormData] = useState(defaultConnection);
  const [isEditing, setIsEditing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    fetchConnections();
    fetchTenants();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await getOIDCConnections();
      setConnections(response.data);
    } catch (error) {
      toast.error(error.message || t('common.error_load', 'Failed to load'));
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
    setFormData(defaultConnection);
    setAdvancedOpen(false);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEdit = (connection) => {
    setFormData(connection);
    setAdvancedOpen(!!connection.authorization_endpoint || !!connection.token_endpoint || !!connection.userinfo_endpoint);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDeleteClick = (connection) => {
    setSelectedConnection(connection);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteOIDCConnection(selectedConnection.id, selectedConnection.tenant_id);
      toast.success(t('common.deleted_success', 'Deleted successfully'));
      fetchConnections();
    } catch (error) {
      toast.error(error.message || t('common.error_delete', 'Failed to delete'));
    } finally {
      setDeleteDialogOpen(false);
      setSelectedConnection(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error(t('oidc_connections.error_name', 'Provider name is required')); return; }
    if (!formData.issuer_url.trim()) { toast.error(t('oidc_connections.error_issuer', 'Issuer URL is required')); return; }
    if (!formData.client_id.trim()) { toast.error(t('oidc_clients.error_client_id', 'Client ID is required')); return; }

    let attributeMapping = {};
    try {
      attributeMapping = Object.assign(attributeMappingJson, {});
    } catch (err) { toast.error(t('common.error_json', 'Invalid JSON mapping')); return; }

    const submitData = {
      ...formData,
      attribute_mapping: attributeMapping
    };

    try {
      if (isEditing) {
        await updateOIDCConnection(formData.id, submitData);
        toast.success(t('common.updated_success', 'Updated successfully'));
      } else {
        await createOIDCConnection(submitData);
        toast.success(t('common.created_success', 'Created successfully'));
      }
      setDialogOpen(false);
      fetchConnections();
    } catch (error) {
      toast.error(error.message || t('common.error_save', 'Failed to save'));
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
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="oidc-connections-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">{t('oidc_connections.title', 'OIDC Providers')}</h1>
            <ProtocolBadge protocol="oidc" />
          </div>
          <p className="text-sm text-muted-foreground">{t('oidc_connections.subtitle', 'External OpenID Connect providers for social & modern SSO')}</p>
        </div>
        <Button onClick={handleCreate} data-testid="create-oidc-connection-btn" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" />{t('oidc_connections.add_btn', 'Add OIDC Provider')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : connections.length === 0 ? (
        <EmptyState
          icon={GlobeLock}
          title={t('oidc_connections.empty_title', 'No OIDC providers connected')}
          description={t('oidc_connections.empty_desc', 'Connect external identity providers like Google, Microsoft, or Auth0 to enable social login.')}
          actionLabel={t('oidc_connections.add_btn', 'Add OIDC Provider')}
          onAction={handleCreate}
          testId="empty-oidc-connections"
        />
      ) : (
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider">{t('common.provider', 'Provider')}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t('common.tenant', 'Tenant')}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">{t('common.issuer_url', 'Issuer URL')}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">{t('common.scopes', 'Scopes')}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">{t('common.created', 'Created')}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((connection) => (
                  <TableRow 
                    key={connection.id} 
                    className="hover:bg-muted/30 border-b border-border/40"
                    data-testid={`oidc-connection-row-${connection.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-xl">
                          {getProviderIcon(connection.issuer_url)}
                        </div>
                        <div>
                          <p className="font-medium">{connection.name}</p>
                          <div className="flex items-center gap-1">
                            <code className="text-xs font-mono text-muted-foreground">
                              {connection.client_id?.slice(0, 16)}...
                            </code>
                            <CopyButton value={connection.client_id} testId={`copy-client-id-${connection.id}`} />
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                          variant="outline"
                          className='bg-amber-500/15 text-amber-500 border-amber-500/20'
                      >
                        {getTenantName(connection.tenant_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <code className="text-sm font-mono text-muted-foreground">
                        {connection.issuer_url?.replace('https://', '')}
                      </code>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {connection.scopes?.slice(0, 3).map((scope) => (
                          <Badge 
                            key={scope}
                            variant="outline"
                            className="text-xs bg-muted/30"
                          >
                            {scope}
                          </Badge>
                        ))}
                        {connection.scopes?.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-muted/30">
                            +{connection.scopes.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {formatDate(connection.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(connection)}
                          data-testid={`edit-oidc-connection-${connection.id}`}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(connection)}
                          data-testid={`delete-oidc-connection-${connection.id}`}
                          className="h-8 w-8 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {isEditing ? t('oidc_connections.edit_title', 'Edit OIDC Provider') : t('oidc_connections.add_title', 'Add OIDC Provider')}
              <ProtocolBadge protocol="oidc" />
            </DialogTitle>
            <DialogDescription>
              {isEditing ? t('oidc_connections.edit_desc', 'Update your OIDC provider configuration') : t('oidc_connections.add_desc', 'Connect an external identity provider using OpenID Connect')}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="provider-name">{t('oidc_connections.provider_name', 'Provider Name')} *</Label>
              <Input id="provider-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Google Workspace" />
            </div>
            <div className="space-y-2">
              <Label>{t('common.tenant', 'Tenant')} *</Label>
              <Select value={formData.tenant_id} onValueChange={(value) => setFormData({ ...formData, tenant_id: value })}>
                <SelectTrigger><SelectValue placeholder={t('common.select_tenant', 'Select a tenant')} /></SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (<SelectItem key={tenant.id} value={tenant.id}>{tenant.display_name || tenant.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer-url">{t('common.issuer_url', 'Issuer URL')} *</Label>
              <Input id="issuer-url" value={formData.issuer_url} onChange={(e) => setFormData({ ...formData, issuer_url: e.target.value })} placeholder="https://accounts.google.com" />
              <p className="text-xs text-muted-foreground">{t('oidc_connections.issuer_desc', 'Used for OIDC Auto-Discovery')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-id">{t('common.client_id', 'Client ID')} *</Label>
                <Input id="client-id" value={formData.client_id} onChange={(e) => setFormData({ ...formData, client_id: e.target.value })} placeholder="your-client-id" />
              </div>
              <div className="space-y-2">
                <Label>{t('common.client_secret', 'Client Secret')}</Label>
                <SecretInput value={formData.client_secret} onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })} placeholder={t('common.client_secret', 'Client Secret')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('common.scopes_csv', 'Scopes (comma-separated)')}</Label>
              <Input value={formData.scopes?.join(', ') || ''} onChange={(e) => setFormData({ ...formData, scopes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="openid, email, profile" />
            </div>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="w-full justify-between">
                  <span>{t('common.advanced_settings', 'Advanced Settings')}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <AttributeMappingEditor initialRules={formData.attribute_mapping || {}} onChange={setAttributeMappingJson} subtitle={t('oidc_connections.mapping_desc', 'Map external OIDC claims to standard internal claims')} tenantId={formData.tenant_id}/>
                </div>
                <p className="text-xs text-muted-foreground">{t('oidc_connections.override_endpoints', 'Override auto-discovered endpoints if needed')}</p>
                <div className="space-y-2">
                  <Label>{t('oidc_connections.auth_endpoint', 'Authorization Endpoint')}</Label>
                  <Input value={formData.authorization_endpoint || ''} onChange={(e) => setFormData({ ...formData, authorization_endpoint: e.target.value })} placeholder="https://accounts.google.com/o/oauth2/v2/auth" />
                </div>
                <div className="space-y-2">
                  <Label>{t('oidc_connections.token_endpoint', 'Token Endpoint')}</Label>
                  <Input value={formData.token_endpoint || ''} onChange={(e) => setFormData({ ...formData, token_endpoint: e.target.value })} placeholder="https://oauth2.googleapis.com/token" />
                </div>
                <div className="space-y-2">
                  <Label>{t('oidc_connections.userinfo_endpoint', 'UserInfo Endpoint')}</Label>
                  <Input value={formData.userinfo_endpoint || ''} onChange={(e) => setFormData({ ...formData, userinfo_endpoint: e.target.value })} placeholder="https://openidconnect.googleapis.com/v1/userinfo" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{isEditing ? t('common.update', 'Update') : t('common.add', 'Add')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('oidc_connections.delete_title', 'Delete OIDC Provider')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.delete_confirm', 'Are you sure you want to delete')} <strong>{selectedConnection?.name}</strong>? {t('oidc_connections.delete_desc', 'Users will no longer be able to sign in using this provider.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">{t('common.delete', 'Delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
