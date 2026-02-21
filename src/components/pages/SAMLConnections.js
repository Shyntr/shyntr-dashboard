import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, KeyRound, RefreshCw, ClipboardPaste } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { EmptyState } from '../shared/EmptyState';
import { ProtocolBadge } from '../shared/ProtocolBadge';
import { JsonEditor } from '../shared/JsonEditor';
import { 
  getSAMLConnections, 
  createSAMLConnection, 
  updateSAMLConnection, 
  deleteSAMLConnection,
  getTenants
} from '../../lib/api';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {AttributeMappingEditor} from "@/components/shared/AttributeMappingEditor";
import {getProviderIcon} from "@/lib/utils";

const defaultConnection = {
  name: '',
  tenant_id: 'default',
  idp_metadata_xml: '',
  sign_request: true,
  force_authn: false,
  attribute_mapping: {}
};

export function SAMLConnections() {
  const [connections, setConnections] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [formData, setFormData] = useState(defaultConnection);
  const [attributeMappingJson, setAttributeMappingJson] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchConnections();
    fetchTenants();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await getSAMLConnections();
      setConnections(response.data);
    } catch (error) {
      toast.error(error.message || 'Failed to load SAML connections');
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
      await deleteSAMLConnection(selectedConnection.id);
      toast.success('SAML connection deleted successfully');
      fetchConnections();
    } catch (error) {
      toast.error(error.message || 'Failed to delete connection');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedConnection(null);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setFormData({ ...formData, idp_metadata_xml: text });
      toast.success('Metadata pasted from clipboard');
    } catch (err) {
      toast.error('Failed to read from clipboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Connection name is required');
      return;
    }
    if (!formData.idp_metadata_xml.trim()) {
      toast.error('IDP Metadata XML is required');
      return;
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
        await updateSAMLConnection(formData.id, submitData);
        toast.success('SAML connection updated successfully');
      } else {
        await createSAMLConnection(submitData);
        toast.success('SAML connection created successfully');
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

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="saml-connections-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
              SAML Providers
            </h1>
            <ProtocolBadge protocol="saml" />
          </div>
          <p className="text-sm text-muted-foreground">
            Enterprise Identity Providers (IdPs) for SAML-based SSO
          </p>
        </div>
        <Button 
          onClick={handleCreate}
          data-testid="create-saml-connection-btn"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add SAML Provider
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : connections.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No SAML providers yet"
          description="Connect your enterprise Identity Provider (Okta, Azure AD, etc.) to enable SAML-based SSO."
          actionLabel="Add SAML Provider"
          onAction={handleCreate}
          testId="empty-saml-connections"
        />
      ) : (
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Tenant</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Settings</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((connection) => (
                  <TableRow 
                    key={connection.id} 
                    className="hover:bg-muted/30 border-b border-border/40"
                    data-testid={`saml-connection-row-${connection.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-xl">
                          {getProviderIcon(connection.name)}
                        </div>
                        <div>
                          <p className="font-medium">{connection.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {connection.id.slice(0, 8)}...
                          </p>
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
                      <div className="flex gap-2">
                        <Badge 
                          variant="outline"
                          className={connection.sign_request 
                            ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20' 
                            : 'bg-slate-500/15 text-slate-400 border-slate-500/20'
                          }
                        >
                          {connection.sign_request ? 'Signed' : 'Unsigned'}
                        </Badge>
                        {connection.force_authn && (
                          <Badge variant="outline" className="bg-amber-500/15 text-amber-500 border-amber-500/20">
                            Force AuthN
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
                          data-testid={`edit-saml-connection-${connection.id}`}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(connection)}
                          data-testid={`delete-saml-connection-${connection.id}`}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {isEditing ? 'Edit SAML Provider' : 'Add SAML Provider'}
              <ProtocolBadge protocol="saml" />
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update your SAML Identity Provider configuration' 
                : 'Configure a SAML connection to your enterprise IdP'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="mapping">Attribute Mapping</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="connection-name">Connection Name *</Label>
                  <Input
                    id="connection-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Okta Employee Login"
                    data-testid="saml-connection-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tenant *</Label>
                  <Select
                      value={formData.tenant_id}
                      onValueChange={(value) => setFormData({ ...formData, tenant_id: value })}
                      // disabled={isEditing} // Optional: Disable if moving tenants isn't allowed
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
                  <div className="flex items-center justify-between">
                    <Label>IDP Metadata XML *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePaste}
                      data-testid="paste-metadata-btn"
                    >
                      <ClipboardPaste className="h-4 w-4 mr-2" />
                      Paste
                    </Button>
                  </div>
                  <Textarea
                    value={formData.idp_metadata_xml}
                    onChange={(e) => setFormData({ ...formData, idp_metadata_xml: e.target.value })}
                    placeholder={`<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="...">
  <!-- Paste your IdP metadata here -->
</EntityDescriptor>`}
                    rows={12}
                    className="font-mono text-sm"
                    data-testid="saml-metadata-textarea"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the SAML metadata XML from your Identity Provider (Okta, Azure AD, etc.)
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                    <div>
                      <Label className="text-sm font-medium">Sign Request</Label>
                      <p className="text-xs text-muted-foreground">
                        Sign the AuthnRequest sent to IdP
                      </p>
                    </div>
                    <Switch
                      checked={formData.sign_request}
                      onCheckedChange={(checked) => setFormData({ ...formData, sign_request: checked })}
                      data-testid="saml-sign-request-toggle"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                    <div>
                      <Label className="text-sm font-medium">Force AuthN</Label>
                      <p className="text-xs text-muted-foreground">
                        Always require re-authentication
                      </p>
                    </div>
                    <Switch
                      checked={formData.force_authn}
                      onCheckedChange={(checked) => setFormData({ ...formData, force_authn: checked })}
                      data-testid="saml-force-authn-toggle"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mapping" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <AttributeMappingEditor initialRules={formData.attribute_mapping || {}} onChange={setAttributeMappingJson} subtitle={"Map IdP SAML attributes to OIDC standard claims"} />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                data-testid="cancel-saml-connection-btn"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                data-testid="save-saml-connection-btn"
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
            <AlertDialogTitle>Delete SAML Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedConnection?.name}</strong>? 
              Users will no longer be able to sign in using this Identity Provider.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-saml-connection-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              data-testid="confirm-delete-saml-connection-btn"
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
