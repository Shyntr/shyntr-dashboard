import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, GlobeLock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
import { toast } from 'sonner';
import { EmptyState } from '../shared/EmptyState';
import { SecretInput } from '../shared/SecretInput';
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
  scopes: ['openid', 'email', 'profile']
};

export function OIDCConnections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [formData, setFormData] = useState(defaultConnection);
  const [isEditing, setIsEditing] = useState(false);

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
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEdit = (connection) => {
    setFormData(connection);
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
    
    // Validate
    if (!formData.name.trim()) {
      toast.error('Connection name is required');
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
    if (issuerUrl.includes('google')) return '🔵';
    if (issuerUrl.includes('microsoft') || issuerUrl.includes('azure')) return '🟢';
    if (issuerUrl.includes('github')) return '⚫';
    if (issuerUrl.includes('auth0')) return '🔴';
    return '🟣';
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="oidc-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
            OIDC Connections
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect external identity providers using OpenID Connect
          </p>
        </div>
        <Button 
          onClick={handleCreate}
          data-testid="create-oidc-btn"
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
          description="Connect external identity providers like Google, Microsoft, or Auth0 to enable social login for your users."
          actionLabel="Connect your first provider"
          onAction={handleCreate}
          testId="empty-oidc"
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
                    data-testid={`oidc-row-${connection.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                          {getProviderIcon(connection.issuer_url)}
                        </div>
                        <div>
                          <p className="font-medium">{connection.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {connection.client_id.slice(0, 16)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <code className="text-sm font-mono text-muted-foreground">
                        {connection.issuer_url.replace('https://', '')}
                      </code>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {connection.scopes.slice(0, 3).map((scope) => (
                          <Badge 
                            key={scope}
                            variant="outline"
                            className="text-xs bg-muted/30"
                          >
                            {scope}
                          </Badge>
                        ))}
                        {connection.scopes.length > 3 && (
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
                          data-testid={`edit-oidc-${connection.id}`}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(connection)}
                          data-testid={`delete-oidc-${connection.id}`}
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
            <DialogTitle className="font-heading">
              {isEditing ? 'Edit OIDC Provider' : 'Add OIDC Provider'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update your OIDC provider configuration' 
                : 'Connect an external identity provider using OpenID Connect'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Provider Name */}
            <div className="space-y-2">
              <Label htmlFor="provider-name">Provider Name *</Label>
              <Input
                id="provider-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Google Workspace"
                data-testid="oidc-name-input"
              />
            </div>

            {/* Issuer URL */}
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
                The OIDC issuer URL (e.g., https://accounts.google.com, https://login.microsoftonline.com/tenant-id/v2.0)
              </p>
            </div>

            {/* Client ID */}
            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID *</Label>
              <Input
                id="client-id"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                placeholder="your-client-id.apps.googleusercontent.com"
                data-testid="oidc-client-id-input"
              />
            </div>

            {/* Client Secret */}
            <div className="space-y-2">
              <Label>Client Secret *</Label>
              <SecretInput
                value={formData.client_secret}
                onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                placeholder="Enter client secret from provider"
                testId="oidc-client-secret-input"
              />
            </div>

            {/* Scopes */}
            <div className="space-y-2">
              <Label>Scopes (comma-separated)</Label>
              <Input
                value={formData.scopes.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  scopes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                })}
                placeholder="openid, email, profile"
                data-testid="oidc-scopes-input"
              />
              <p className="text-xs text-muted-foreground">
                Standard scopes: openid, email, profile. Check your provider's documentation for additional scopes.
              </p>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                data-testid="cancel-oidc-btn"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                data-testid="save-oidc-btn"
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
            <AlertDialogCancel data-testid="cancel-delete-oidc-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              data-testid="confirm-delete-oidc-btn"
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
