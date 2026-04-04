import { useEffect, useRef, useState } from 'react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const latestConnectionsRequestRef = useRef(0);
  const activeConnectionsRequestRef = useRef(null);
  const latestTenantsRequestRef = useRef(0);
  const activeTenantsRequestRef = useRef(null);

  useEffect(() => {
    fetchConnections();
    fetchTenants();

    return () => {
      if (activeConnectionsRequestRef.current) {
        activeConnectionsRequestRef.current.cancelled = true;
      }
      if (activeTenantsRequestRef.current) {
        activeTenantsRequestRef.current.cancelled = true;
      }
    };
  }, []);

  const fetchConnections = async () => {
    const requestId = latestConnectionsRequestRef.current + 1;
    latestConnectionsRequestRef.current = requestId;

    if (activeConnectionsRequestRef.current) {
      activeConnectionsRequestRef.current.cancelled = true;
    }

    const requestToken = { id: requestId, cancelled: false };
    activeConnectionsRequestRef.current = requestToken;

    setLoading(true);

    try {
      const response = await getOIDCConnections();

      if (
        requestToken.cancelled ||
        activeConnectionsRequestRef.current?.id !== requestId
      ) {
        return;
      }

      setConnections(response.data || []);
    } catch (error) {
      if (
        requestToken.cancelled ||
        activeConnectionsRequestRef.current?.id !== requestId
      ) {
        return;
      }

      toast.error(error.message || 'Failed to load OIDC connections');
    } finally {
      if (
        !requestToken.cancelled &&
        activeConnectionsRequestRef.current?.id === requestId
      ) {
      setLoading(false);
    }
    }
  };

  const fetchTenants = async () => {
    const requestId = latestTenantsRequestRef.current + 1;
    latestTenantsRequestRef.current = requestId;

    if (activeTenantsRequestRef.current) {
      activeTenantsRequestRef.current.cancelled = true;
    }

    const requestToken = { id: requestId, cancelled: false };
    activeTenantsRequestRef.current = requestToken;

    try {
      const response = await getTenants();

      if (
        requestToken.cancelled ||
        activeTenantsRequestRef.current?.id !== requestId
      ) {
        return;
      }

      setTenants(response.data || []);
    } catch (error) {
      if (
        requestToken.cancelled ||
        activeTenantsRequestRef.current?.id !== requestId
      ) {
        return;
      }

      console.error('Failed to load tenants:', error);
    }
  };

  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant ? (tenant.display_name || tenant.name) : tenantId;
  };

  const handleCreate = () => {
    if (isSubmitting || isDeleting) {
      return;
    }

    setFormData(defaultConnection);
    setAttributeMappingJson({});
    setSelectedConnection(null);
    setAdvancedOpen(false);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEdit = (connection) => {
    if (isSubmitting || isDeleting) {
      return;
    }

    setFormData(connection);
    setAttributeMappingJson(connection.attribute_mapping || {});
    setSelectedConnection(connection);
    setAdvancedOpen(!!connection.authorization_endpoint || !!connection.token_endpoint || !!connection.userinfo_endpoint);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDeleteClick = (connection) => {
    if (isSubmitting || isDeleting) {
      return;
    }

    setSelectedConnection(connection);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (isDeleting || !selectedConnection?.id || !selectedConnection?.tenant_id) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteOIDCConnection(selectedConnection.id, selectedConnection.tenant_id);
      toast.success('OIDC connection deleted successfully');
      await fetchConnections();
    } catch (error) {
      toast.error(error.message || 'Failed to delete connection');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedConnection(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) {
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Provider name is required');
      return;
    }
    if (!formData.issuer_url.trim()) {
      toast.error('Issuer URL is required');
      return;
    }
    if (!formData.client_id.trim()) {
      toast.error('Client ID is required');
      return;
    }

    let attributeMapping = {};
    try {
      attributeMapping = Object.assign({}, attributeMappingJson);
    } catch (err) {
      toast.error('Invalid JSON in attribute mapping');
      return;
    }

    const submitData = {
      ...formData,
      attribute_mapping: attributeMapping
    };

    setIsSubmitting(true);

    try {
      if (isEditing) {
        await updateOIDCConnection(formData.id, submitData);
        toast.success('OIDC connection updated successfully');
      } else {
        await createOIDCConnection(submitData);
        toast.success('OIDC connection created successfully');
      }

      await fetchConnections();
      setDialogOpen(false);
    } catch (error) {
      toast.error(error.message || 'Failed to save connection');
    } finally {
      setIsSubmitting(false);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
              OIDC Providers
            </h1>
            <ProtocolBadge protocol="oidc" />
          </div>
          <p className="text-sm text-muted-foreground">
            External OpenID Connect providers for social & modern SSO
          </p>
        </div>
        <Button 
          onClick={handleCreate}
          data-testid="create-oidc-connection-btn"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          disabled={isSubmitting || isDeleting}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add OIDC Provider
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : connections.length === 0 ? (
        <EmptyState
          icon={GlobeLock}
          title="No OIDC providers connected"
          description="Connect external identity providers like Google, Microsoft, or Auth0 to enable social login."
          actionLabel="Add OIDC Provider"
          onAction={handleCreate}
          testId="empty-oidc-connections"
        />
      ) : (
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider">Provider</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Tenant</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Issuer URL</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">Scopes</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
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
                        className="bg-amber-500/15 text-amber-500 border-amber-500/20"
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
                          aria-label={`Edit OIDC provider ${connection.name}`}
                          title={`Edit OIDC provider ${connection.name}`}
                          disabled={isSubmitting || isDeleting}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(connection)}
                          data-testid={`delete-oidc-connection-${connection.id}`}
                          className="h-8 w-8 hover:text-destructive"
                          aria-label={`Delete OIDC provider ${connection.name}`}
                          title={`Delete OIDC provider ${connection.name}`}
                          disabled={isSubmitting || isDeleting}
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

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (isSubmitting) {
            return;
          }
          setDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {isEditing ? 'Edit OIDC Provider' : 'Add OIDC Provider'}
              <ProtocolBadge protocol="oidc" />
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update your OIDC provider configuration' 
                : 'Connect an external identity provider using OpenID Connect'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="provider-name">Provider Name *</Label>
              <Input
                id="provider-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Google Workspace"
                data-testid="oidc-connection-name-input"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Tenant *</Label>
              <Select
                  value={formData.tenant_id}
                  onValueChange={(value) => setFormData({ ...formData, tenant_id: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tenant" />
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
              <Label htmlFor="issuer-url">Issuer URL *</Label>
              <Input
                id="issuer-url"
                value={formData.issuer_url}
                onChange={(e) => setFormData({ ...formData, issuer_url: e.target.value })}
                placeholder="https://accounts.google.com"
                data-testid="oidc-issuer-input"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Used for OIDC Auto-Discovery (/.well-known/openid-configuration)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-id">Client ID *</Label>
                <Input
                  id="client-id"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  placeholder="your-client-id.apps.googleusercontent.com"
                  data-testid="oidc-connection-client-id-input"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <SecretInput
                  value={formData.client_secret}
                  onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                  placeholder="Enter client secret"
                  testId="oidc-connection-client-secret-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Scopes (comma-separated)</Label>
              <Input
                value={formData.scopes?.join(', ') || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  scopes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                })}
                placeholder="openid, email, profile"
                data-testid="oidc-connection-scopes-input"
                disabled={isSubmitting}
              />
            </div>

            {/* Advanced Endpoint Overrides */}
            <Collapsible open={advancedOpen} onOpenChange={(open) => {
              if (isSubmitting) {
                return;
              }
              setAdvancedOpen(open);
            }}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between"
                  data-testid="advanced-toggle"
                  disabled={isSubmitting}
                >
                  <span>Advanced Settings</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <AttributeMappingEditor initialRules={formData.attribute_mapping || {}} onChange={setAttributeMappingJson}
                                          subtitle={"Map external OIDC claims to standard internal claims"} tenantId={formData.tenant_id}/>
                </div>
                <p className="text-xs text-muted-foreground">
                  Override auto-discovered endpoints if needed
                </p>
                <div className="space-y-2">
                  <Label>Authorization Endpoint</Label>
                  <Input
                    value={formData.authorization_endpoint || ''}
                    onChange={(e) => setFormData({ ...formData, authorization_endpoint: e.target.value })}
                    placeholder="https://accounts.google.com/o/oauth2/v2/auth"
                    data-testid="oidc-auth-endpoint-input"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Token Endpoint</Label>
                  <Input
                    value={formData.token_endpoint || ''}
                    onChange={(e) => setFormData({ ...formData, token_endpoint: e.target.value })}
                    placeholder="https://oauth2.googleapis.com/token"
                    data-testid="oidc-token-endpoint-input"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label>UserInfo Endpoint</Label>
                  <Input
                    value={formData.userinfo_endpoint || ''}
                    onChange={(e) => setFormData({ ...formData, userinfo_endpoint: e.target.value })}
                    placeholder="https://openidconnect.googleapis.com/v1/userinfo"
                    data-testid="oidc-userinfo-endpoint-input"
                    disabled={isSubmitting}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                data-testid="cancel-oidc-connection-btn"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                data-testid="save-oidc-connection-btn"
                className="bg-primary hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? (isEditing ? 'Updating...' : 'Adding...')
                  : (isEditing ? 'Update Provider' : 'Add Provider')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (isDeleting) {
            return;
          }
          setDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete OIDC Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedConnection?.name}</strong>? 
              Users will no longer be able to sign in using this provider.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-testid="cancel-delete-oidc-connection-btn"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              data-testid="confirm-delete-oidc-connection-btn"
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
