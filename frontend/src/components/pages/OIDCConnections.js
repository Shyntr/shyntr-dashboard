import { useEffect, useState } from 'react';
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
  deleteOIDCConnection 
} from '../../lib/api';

const defaultConnection = {
  name: '',
  tenant_id: 'default',
  issuer_url: '',
  client_id: '',
  client_secret: '',
  scopes: ['openid', 'email', 'profile'],
  authorization_endpoint: '',
  token_endpoint: '',
  userinfo_endpoint: ''
};

export function OIDCConnections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [formData, setFormData] = useState(defaultConnection);
  const [isEditing, setIsEditing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await getOIDCConnections();
      setConnections(response.data);
    } catch (error) {
      toast.error(error.message || 'Failed to load OIDC connections');
    } finally {
      setLoading(false);
    }
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
      await deleteOIDCConnection(selectedConnection.id);
      toast.success('OIDC connection deleted successfully');
      fetchConnections();
    } catch (error) {
      toast.error(error.message || 'Failed to delete connection');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedConnection(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
    if (!formData.client_secret.trim()) {
      toast.error('Client Secret is required');
      return;
    }

    try {
      if (isEditing) {
        await updateOIDCConnection(formData.id, formData);
        toast.success('OIDC connection updated successfully');
      } else {
        await createOIDCConnection(formData);
        toast.success('OIDC connection created successfully');
      }
      setDialogOpen(false);
      fetchConnections();
    } catch (error) {
      toast.error(error.message || 'Failed to save connection');
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

  const getProviderIcon = (issuerUrl) => {
    if (issuerUrl?.includes('google')) return '🔵';
    if (issuerUrl?.includes('microsoft') || issuerUrl?.includes('azure')) return '🟢';
    if (issuerUrl?.includes('github')) return '⚫';
    if (issuerUrl?.includes('auth0')) return '🔴';
    if (issuerUrl?.includes('okta')) return '🔷';
    return '🟣';
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issuer-url">Issuer URL *</Label>
              <Input
                id="issuer-url"
                value={formData.issuer_url}
                onChange={(e) => setFormData({ ...formData, issuer_url: e.target.value })}
                placeholder="https://accounts.google.com"
                data-testid="oidc-issuer-input"
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
                />
              </div>
              <div className="space-y-2">
                <Label>Client Secret *</Label>
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
              />
            </div>

            {/* Advanced Endpoint Overrides */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between"
                  data-testid="advanced-toggle"
                >
                  <span>Advanced: Endpoint Overrides</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
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
                  />
                </div>
                <div className="space-y-2">
                  <Label>Token Endpoint</Label>
                  <Input
                    value={formData.token_endpoint || ''}
                    onChange={(e) => setFormData({ ...formData, token_endpoint: e.target.value })}
                    placeholder="https://oauth2.googleapis.com/token"
                    data-testid="oidc-token-endpoint-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UserInfo Endpoint</Label>
                  <Input
                    value={formData.userinfo_endpoint || ''}
                    onChange={(e) => setFormData({ ...formData, userinfo_endpoint: e.target.value })}
                    placeholder="https://openidconnect.googleapis.com/v1/userinfo"
                    data-testid="oidc-userinfo-endpoint-input"
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
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                data-testid="save-oidc-connection-btn"
                className="bg-primary hover:bg-primary/90"
              >
                {isEditing ? 'Update Provider' : 'Add Provider'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete OIDC Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedConnection?.name}</strong>? 
              Users will no longer be able to sign in using this provider.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-oidc-connection-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              data-testid="confirm-delete-oidc-connection-btn"
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
