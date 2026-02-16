import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, FileCode2, RefreshCw } from 'lucide-react';
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
import { CopyButton } from '../shared/CopyButton';
import { ProtocolBadge } from '../shared/ProtocolBadge';
import { JsonEditor } from '../shared/JsonEditor';
import { 
  getSAMLClients, 
  createSAMLClient, 
  updateSAMLClient, 
  deleteSAMLClient 
} from '../../lib/api';

const defaultClient = {
  entity_id: '',
  name: '',
  tenant_id: 'default',
  acs_url: '',
  sp_certificate: '',
  sign_response: true,
  sign_assertion: true,
  encrypt_assertion: false,
  force_authn: false,
  attribute_mapping: {}
};

export function SAMLClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState(defaultClient);
  const [attributeMappingJson, setAttributeMappingJson] = useState('{}');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchClients();
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

  const handleCreate = () => {
    setFormData(defaultClient);
    setAttributeMappingJson('{\n  "email": "user_email",\n  "name": "displayName"\n}');
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEdit = (client) => {
    setFormData(client);
    setAttributeMappingJson(JSON.stringify(client.attribute_mapping || {}, null, 2));
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDeleteClick = (client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteSAMLClient(selectedClient.id);
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
    
    if (!formData.entity_id.trim()) {
      toast.error('Entity ID is required');
      return;
    }
    if (!formData.acs_url.trim()) {
      toast.error('ACS URL is required');
      return;
    }

    let attributeMapping = {};
    try {
      attributeMapping = JSON.parse(attributeMappingJson);
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
              SAML Clients
            </h1>
            <ProtocolBadge protocol="saml" />
          </div>
          <p className="text-sm text-muted-foreground">
            Service Providers (SPs) receiving SAML assertions from Shyntr
          </p>
        </div>
        <Button 
          onClick={handleCreate}
          data-testid="create-saml-client-btn"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create SAML Client
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={FileCode2}
          title="No SAML clients yet"
          description="Create your first SAML Service Provider to enable enterprise SSO integration."
          actionLabel="Create SAML Client"
          onAction={handleCreate}
          testId="empty-saml-clients"
        />
      ) : (
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider">Entity ID</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">ACS URL</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">Settings</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
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
                          <code className="text-sm font-mono bg-muted/50 px-2 py-1 rounded max-w-[200px] truncate">
                            {client.entity_id}
                          </code>
                          <CopyButton value={client.entity_id} testId={`copy-entity-id-${client.id}`} />
                        </div>
                        {client.name && (
                          <span className="text-xs text-muted-foreground">{client.name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <code className="text-sm font-mono text-muted-foreground max-w-[200px] truncate block">
                        {client.acs_url}
                      </code>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {client.sign_response && (
                          <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                            Signed
                          </Badge>
                        )}
                        {client.encrypt_assertion && (
                          <Badge variant="outline" className="text-xs bg-blue-500/15 text-blue-500 border-blue-500/20">
                            Encrypted
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
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(client)}
                          data-testid={`delete-saml-client-${client.id}`}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {isEditing ? 'Edit SAML Client' : 'Create SAML Client'}
              <ProtocolBadge protocol="saml" />
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update your SAML Service Provider configuration' 
                : 'Configure a new SAML Service Provider'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="mapping">Attribute Mapping</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entity-id">Entity ID *</Label>
                    <Input
                      id="entity-id"
                      value={formData.entity_id}
                      onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                      placeholder="https://jira.corp.com/shyntr-app"
                      data-testid="saml-entity-id-input"
                    />
                    <p className="text-xs text-muted-foreground">Unique URI identifying this SP</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Jira Corporate"
                      data-testid="saml-client-name-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="acs-url">ACS URL (Assertion Consumer Service) *</Label>
                  <Input
                    id="acs-url"
                    value={formData.acs_url}
                    onChange={(e) => setFormData({ ...formData, acs_url: e.target.value })}
                    placeholder="https://jira.corp.com/SAML/ACS"
                    data-testid="saml-acs-url-input"
                  />
                  <p className="text-xs text-muted-foreground">Where Shyntr sends the SAML assertion</p>
                </div>

                <div className="space-y-2">
                  <Label>SP Certificate (PEM format)</Label>
                  <Textarea
                    value={formData.sp_certificate || ''}
                    onChange={(e) => setFormData({ ...formData, sp_certificate: e.target.value })}
                    placeholder={`-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiU...
-----END CERTIFICATE-----`}
                    rows={5}
                    className="font-mono text-sm"
                    data-testid="saml-sp-cert-textarea"
                  />
                  <p className="text-xs text-muted-foreground">Optional: For encrypted assertions</p>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                    <div>
                      <Label className="text-sm font-medium">Sign Response</Label>
                      <p className="text-xs text-muted-foreground">
                        Sign the entire SAML response
                      </p>
                    </div>
                    <Switch
                      checked={formData.sign_response}
                      onCheckedChange={(checked) => setFormData({ ...formData, sign_response: checked })}
                      data-testid="saml-sign-response-toggle"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                    <div>
                      <Label className="text-sm font-medium">Sign Assertion</Label>
                      <p className="text-xs text-muted-foreground">
                        Sign the SAML assertion
                      </p>
                    </div>
                    <Switch
                      checked={formData.sign_assertion}
                      onCheckedChange={(checked) => setFormData({ ...formData, sign_assertion: checked })}
                      data-testid="saml-sign-assertion-toggle"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                    <div>
                      <Label className="text-sm font-medium">Encrypt Assertion</Label>
                      <p className="text-xs text-muted-foreground">
                        Encrypt using SP certificate
                      </p>
                    </div>
                    <Switch
                      checked={formData.encrypt_assertion}
                      onCheckedChange={(checked) => setFormData({ ...formData, encrypt_assertion: checked })}
                      data-testid="saml-encrypt-toggle"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                    <div>
                      <Label className="text-sm font-medium">Force AuthN</Label>
                      <p className="text-xs text-muted-foreground">
                        Require re-authentication
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
                  <Label>Attribute Mapping (JSON)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Map SAML assertion attributes to standard claims
                  </p>
                  <JsonEditor
                    value={attributeMappingJson}
                    onChange={setAttributeMappingJson}
                    height="200px"
                    testId="saml-attribute-mapping-editor"
                  />
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
            <AlertDialogTitle>Delete SAML Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedClient?.name || selectedClient?.entity_id}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-saml-client-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              data-testid="confirm-delete-saml-client-btn"
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
