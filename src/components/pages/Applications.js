import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, AppWindow, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
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
import { toast } from 'sonner';
import { EmptyState } from '../shared/EmptyState';
import { CopyButton } from '../shared/CopyButton';
import { SecretInput } from '../shared/SecretInput';
import { MultiInput } from '../shared/MultiInput';
import { 
  getClients, 
  createClient, 
  updateClient, 
  deleteClient 
} from '../../lib/api';

const GRANT_TYPES = [
  'authorization_code',
  'refresh_token',
  'client_credentials',
  'implicit'
];

const defaultClient = {
  id: '',
  tenant_id: 'default',
  secret: '',
  redirect_uris: [''],
  grant_types: ['authorization_code'],
  response_types: ['code'],
  scopes: ['openid', 'profile', 'email'],
  public: false,
  enforce_pkce: true,
  allowed_cors_origins: ['']
};

export function Applications() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState(defaultClient);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await getClients();
      setClients(response.data);
    } catch (error) {
      toast.error(error.message || 'Failed to load clients');
    } finally {
      setLoading(false);
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
      allowed_cors_origins: client.allowed_cors_origins?.length ? client.allowed_cors_origins : ['']
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
      await deleteClient(selectedClient.id);
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
    
    // Validate
    if (!formData.id.trim()) {
      toast.error('Client ID is required');
      return;
    }

    // Clean up empty values
    const cleanData = {
      ...formData,
      redirect_uris: formData.redirect_uris.filter(u => u.trim()),
      allowed_cors_origins: formData.allowed_cors_origins.filter(o => o.trim()),
      scopes: formData.scopes.filter(s => s.trim())
    };

    try {
      if (isEditing) {
        await updateClient(formData.id, cleanData);
        toast.success('Client updated successfully');
      } else {
        await createClient(cleanData);
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

  const toggleGrantType = (type) => {
    setFormData(prev => ({
      ...prev,
      grant_types: prev.grant_types.includes(type)
        ? prev.grant_types.filter(t => t !== type)
        : [...prev.grant_types, type]
    }));
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="applications-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
            Applications
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your OAuth2 clients and applications
          </p>
        </div>
        <Button 
          onClick={handleCreate}
          data-testid="create-client-btn"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Client
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={AppWindow}
          title="No clients yet"
          description="Create your first OAuth2 client to start authenticating users in your applications."
          actionLabel="Create your first Client"
          onAction={handleCreate}
          testId="empty-clients"
        />
      ) : (
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider">Client ID</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Secret</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow 
                    key={client.id} 
                    className="hover:bg-muted/30 border-b border-border/40"
                    data-testid={`client-row-${client.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">
                          {client.id}
                        </code>
                        <CopyButton value={client.id} testId={`copy-client-id-${client.id}`} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={client.public 
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20' 
                          : 'bg-violet-500/15 text-violet-500 border-violet-500/20'
                        }
                      >
                        {client.public ? 'Public' : 'Confidential'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-muted-foreground">
                          ••••••••
                        </code>
                        <CopyButton value={client.secret} testId={`copy-secret-${client.id}`} />
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
                          data-testid={`edit-client-${client.id}`}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(client)}
                          data-testid={`delete-client-${client.id}`}
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
              {isEditing ? 'Edit Client' : 'Create Client'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update your OAuth2 client configuration' 
                : 'Configure a new OAuth2 client for your application'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client ID */}
            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID *</Label>
              <Input
                id="client-id"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="my-react-app"
                disabled={isEditing}
                data-testid="client-id-input"
              />
            </div>

            {/* Client Secret */}
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <SecretInput
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                placeholder="Leave empty to auto-generate"
                showCopy={isEditing}
                testId="client-secret-input"
              />
              {!isEditing && (
                <p className="text-xs text-muted-foreground">
                  Leave empty to auto-generate a secure secret
                </p>
              )}
            </div>

            {/* Redirect URIs */}
            <div className="space-y-2">
              <Label>Redirect URIs</Label>
              <MultiInput
                values={formData.redirect_uris}
                onChange={(values) => setFormData({ ...formData, redirect_uris: values })}
                placeholder="https://app.example.com/api/callback"
                testId="redirect-uri"
              />
            </div>

            {/* Allowed CORS Origins */}
            <div className="space-y-2">
              <Label>Allowed CORS Origins</Label>
              <MultiInput
                values={formData.allowed_cors_origins}
                onChange={(values) => setFormData({ ...formData, allowed_cors_origins: values })}
                placeholder="https://app.example.com"
                testId="cors-origin"
              />
            </div>

            {/* Grant Types */}
            <div className="space-y-2">
              <Label>Grant Types</Label>
              <div className="flex flex-wrap gap-2">
                {GRANT_TYPES.map((type) => (
                  <Badge
                    key={type}
                    variant="outline"
                    className={`cursor-pointer transition-colors ${
                      formData.grant_types.includes(type)
                        ? 'bg-primary/20 text-primary border-primary/40'
                        : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
                    }`}
                    onClick={() => toggleGrantType(type)}
                    data-testid={`grant-type-${type}`}
                  >
                    {type.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
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
                placeholder="openid, profile, email"
                data-testid="scopes-input"
              />
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                <div>
                  <Label className="text-sm font-medium">Public Client</Label>
                  <p className="text-xs text-muted-foreground">
                    For SPAs and mobile apps
                  </p>
                </div>
                <Switch
                  checked={formData.public}
                  onCheckedChange={(checked) => setFormData({ ...formData, public: checked })}
                  data-testid="public-toggle"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                <div>
                  <Label className="text-sm font-medium">Enforce PKCE</Label>
                  <p className="text-xs text-muted-foreground">
                    Recommended for security
                  </p>
                </div>
                <Switch
                  checked={formData.enforce_pkce}
                  onCheckedChange={(checked) => setFormData({ ...formData, enforce_pkce: checked })}
                  data-testid="pkce-toggle"
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                data-testid="cancel-client-btn"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                data-testid="save-client-btn"
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
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedClient?.id}</strong>? 
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
