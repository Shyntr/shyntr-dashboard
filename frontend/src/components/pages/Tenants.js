import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Building2, RefreshCw, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
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
import { toast } from 'sonner';
import { EmptyState } from '../shared/EmptyState';
import { CopyButton } from '../shared/CopyButton';
import { 
  getTenants, 
  createTenant, 
  updateTenant, 
  deleteTenant 
} from '../../lib/api';

const defaultTenant = {
  name: '',
  display_name: '',
  description: ''
};

export function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [formData, setFormData] = useState(defaultTenant);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await getTenants();
      setTenants(response.data);
    } catch (error) {
      toast.error(error.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData(defaultTenant);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEdit = (tenant) => {
    if (tenant.name === 'default') {
      toast.error('Cannot edit the default tenant');
      return;
    }
    setFormData(tenant);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDeleteClick = (tenant) => {
    if (tenant.name === 'default') {
      toast.error('Cannot delete the default tenant');
      return;
    }
    setSelectedTenant(tenant);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteTenant(selectedTenant.id);
      toast.success('Tenant deleted successfully');
      fetchTenants();
    } catch (error) {
      toast.error(error.message || 'Failed to delete tenant');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedTenant(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Tenant name is required');
      return;
    }

    // Validate name format (alphanumeric, lowercase, hyphens)
    if (!/^[a-z0-9-]+$/.test(formData.name)) {
      toast.error('Tenant name must be lowercase alphanumeric with hyphens only');
      return;
    }

    try {
      if (isEditing) {
        await updateTenant(formData.id, formData);
        toast.success('Tenant updated successfully');
      } else {
        await createTenant(formData);
        toast.success('Tenant created successfully');
      }
      setDialogOpen(false);
      fetchTenants();
    } catch (error) {
      toast.error(error.message || 'Failed to save tenant');
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
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="tenants-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
            Tenants
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage isolation zones for multi-tenant deployments
          </p>
        </div>
        <Button 
          onClick={handleCreate}
          data-testid="create-tenant-btn"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((tenant) => (
            <Card 
              key={tenant.id || tenant.name} 
              className="bg-card/40 backdrop-blur-sm border-border/40 hover:border-primary/30 transition-colors duration-300"
              data-testid={`tenant-card-${tenant.name}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-heading flex items-center gap-2">
                        {tenant.display_name || tenant.name}
                        {tenant.name === 'default' && (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-mono text-muted-foreground">
                          {tenant.name}
                        </code>
                        <CopyButton value={tenant.name} testId={`copy-tenant-${tenant.name}`} />
                      </div>
                    </div>
                  </div>
                  {tenant.name === 'default' && (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                      Default
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenant.description && (
                  <p className="text-sm text-muted-foreground">
                    {tenant.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created {formatDate(tenant.created_at)}</span>
                </div>
                {tenant.name !== 'default' && (
                  <div className="flex gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(tenant)}
                      data-testid={`edit-tenant-${tenant.name}`}
                      className="flex-1"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(tenant)}
                      data-testid={`delete-tenant-${tenant.name}`}
                      className="flex-1 hover:text-destructive hover:border-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-muted/30 border-border/40">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold mb-1">About Tenants</h3>
              <p className="text-sm text-muted-foreground">
                Tenants provide isolation zones for different organizations or environments.
                Each tenant can have its own set of clients, connections, and configurations.
                The <code className="px-1 bg-muted rounded">default</code> tenant is always present and cannot be deleted.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isEditing ? 'Edit Tenant' : 'Create Tenant'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update tenant details' 
                : 'Create a new isolation zone for your deployment'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Tenant Name *</Label>
              <Input
                id="tenant-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase() })}
                placeholder="acme-corp"
                disabled={isEditing}
                data-testid="tenant-name-input"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase alphanumeric with hyphens only (e.g., acme-corp)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={formData.display_name || ''}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="ACME Corporation"
                data-testid="tenant-display-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Production tenant for ACME Corp"
                rows={3}
                data-testid="tenant-description-input"
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                data-testid="cancel-tenant-btn"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                data-testid="save-tenant-btn"
                className="bg-primary hover:bg-primary/90"
              >
                {isEditing ? 'Update Tenant' : 'Create Tenant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedTenant?.display_name || selectedTenant?.name}</strong>? 
              All associated clients and connections in this tenant will also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-tenant-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              data-testid="confirm-delete-tenant-btn"
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
