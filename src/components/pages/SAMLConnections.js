import { useEffect, useRef, useState } from 'react';
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
import {
  getSAMLConnections,
  createSAMLConnection,
  updateSAMLConnection,
  deleteSAMLConnection,
  getTenants
} from '../../lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttributeMappingEditor } from "@/components/shared/AttributeMappingEditor";
import { getProviderIcon } from "@/lib/utils";

const defaultConnection = {
  name: '',
  tenant_id: 'default',
  metadata_url: '',
  idp_entity_id: '',
  idp_single_sign_on: '',
  idp_slo_url: '',
  idp_certificate: '',
  idp_encryption_certificate: '',
  sp_private_key: '',
  idp_metadata_xml: '',
  name_id_format: '',
  sign_request: true,
  force_authn: false,
  attribute_mapping: {}
};

const normalizeConnectionForForm = (connection) => ({
  ...defaultConnection,
  ...connection,
  attribute_mapping: connection?.attribute_mapping || {},
  sp_private_key: '',
});

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
      const response = await getSAMLConnections();

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

      toast.error(error.message || 'Failed to load SAML connections');
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
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEdit = (connection) => {
    if (isSubmitting || isDeleting) {
      return;
    }

    setFormData(normalizeConnectionForForm(connection));
    setAttributeMappingJson(connection.attribute_mapping || {});
    setSelectedConnection(connection);
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
      await deleteSAMLConnection(selectedConnection.tenant_id, selectedConnection.id);
      toast.success('SAML connection deleted successfully');
      await fetchConnections();
    } catch (error) {
      toast.error(error.message || 'Failed to delete connection');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedConnection(null);
    }
  };

  const handlePaste = async () => {
    if (isSubmitting) {
      return;
    }

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

    if (isSubmitting) {
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Connection name is required');
      return;
    }
    if (!formData.tenant_id.trim()) {
      toast.error('Tenant is required');
      return;
    }

    const hasMetadataUrl = formData.metadata_url && formData.metadata_url.trim() !== '';
    const hasXml = formData.idp_metadata_xml && formData.idp_metadata_xml.trim() !== '';
    const hasManual = formData.idp_entity_id && formData.idp_single_sign_on && formData.idp_certificate;

    if (!hasMetadataUrl && !hasXml && !hasManual) {
      toast.error('You must provide either a Metadata URL, IDP Metadata XML, or manual IDP configuration (Entity ID, SSO URL, Certificate)');
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
      sp_private_key: isEditing && !formData.sp_private_key.trim() ? '' : formData.sp_private_key,
      attribute_mapping: attributeMapping
    };

    setIsSubmitting(true);

    try {
      if (isEditing) {
        await updateSAMLConnection(formData.id, submitData);
        toast.success('SAML connection updated successfully');
      } else {
        await createSAMLConnection(submitData);
        toast.success('SAML connection created successfully');
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
              disabled={isSubmitting || isDeleting}
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
                                className="bg-amber-500/15 text-amber-500 border-amber-500/20"
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
                                  aria-label={`Edit SAML provider ${connection.name}`}
                                  title={`Edit SAML provider ${connection.name}`}
                                  disabled={isSubmitting || isDeleting}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(connection)}
                                  data-testid={`delete-saml-connection-${connection.id}`}
                                  className="h-8 w-8 hover:text-destructive"
                                  aria-label={`Delete SAML provider ${connection.name}`}
                                  title={`Delete SAML provider ${connection.name}`}
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

        <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              if (isSubmitting) {
                return;
              }
              setDialogOpen(open);
            }}
        >
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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="idp">Identity Provider</TabsTrigger>
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
                        disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tenant *</Label>
                    <Select
                        value={formData.tenant_id}
                        onValueChange={(value) => setFormData({ ...formData, tenant_id: value })}
                        disabled={isSubmitting || isEditing}
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
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">
                        Tenant cannot be changed during edit because update and delete operations are tenant-scoped.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metadata-url">IdP Metadata URL</Label>
                    <Input
                        id="metadata-url"
                        value={formData.metadata_url || ''}
                        onChange={(e) => setFormData({ ...formData, metadata_url: e.target.value })}
                        placeholder="https://dev-xxxx.okta.com/app/.../sso/saml/metadata"
                        disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      Easiest method. Provide the URL to auto-configure the connection.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="idp" className="space-y-4 mt-4">
                  <div className="space-y-2 pb-2 border-b border-border/40">
                    <h4 className="text-sm font-medium">Manual Configuration</h4>
                    <p className="text-xs text-muted-foreground">Fill these if you do not have a Metadata URL or XML.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="idp-entity-id">IdP Entity ID</Label>
                      <Input
                          id="idp-entity-id"
                          value={formData.idp_entity_id || ''}
                          onChange={(e) => setFormData({ ...formData, idp_entity_id: e.target.value })}
                          placeholder="http://www.okta.com/exk..."
                          disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="idp-sso-url">IdP SSO URL</Label>
                      <Input
                          id="idp-sso-url"
                          value={formData.idp_single_sign_on || ''}
                          onChange={(e) => setFormData({ ...formData, idp_single_sign_on: e.target.value })}
                          placeholder="https://dev-xxxx.okta.com/app/.../sso/saml"
                          disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idp-slo-url">IdP SLO URL</Label>
                    <Input
                        id="idp-slo-url"
                        value={formData.idp_slo_url || ''}
                        onChange={(e) => setFormData({ ...formData, idp_slo_url: e.target.value })}
                        placeholder="https://dev-xxxx.okta.com/app/.../slo/saml"
                        disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idp-name-id-format">NameID Format</Label>
                    <Input
                        id="idp-name-id-format"
                        value={formData.name_id_format || ''}
                        onChange={(e) => setFormData({ ...formData, name_id_format: e.target.value })}
                        placeholder="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified"
                        disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>IdP Certificate (Signing)</Label>
                      <Textarea
                          value={formData.idp_certificate || ''}
                          onChange={(e) => setFormData({ ...formData, idp_certificate: e.target.value })}
                          placeholder={`-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----`}
                          rows={4}
                          className="font-mono text-sm"
                          disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IdP Encryption Certificate</Label>
                      <Textarea
                          value={formData.idp_encryption_certificate || ''}
                          onChange={(e) => setFormData({ ...formData, idp_encryption_certificate: e.target.value })}
                          placeholder={`-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----`}
                          rows={4}
                          className="font-mono text-sm"
                          disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>SP Private Key</Label>
                    <Textarea
                        value={formData.sp_private_key || ''}
                        onChange={(e) => setFormData({ ...formData, sp_private_key: e.target.value })}
                        placeholder={isEditing
                          ? 'Leave blank to keep the existing private key'
                          : `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----`
                        }
                        rows={6}
                        className="font-mono text-sm"
                        disabled={isSubmitting}
                    />
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">
                        Leave blank to preserve the existing service provider private key.
                      </p>
                    )}
                  </div>

                  <div className="relative flex py-4 items-center">
                    <div className="flex-grow border-t border-border/40"></div>
                    <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase">OR PASTE XML</span>
                    <div className="flex-grow border-t border-border/40"></div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>IDP Metadata XML</Label>
                      <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handlePaste}
                          disabled={isSubmitting}
                      >
                        <ClipboardPaste className="h-4 w-4 mr-2" />
                        Paste
                      </Button>
                    </div>
                    <Textarea
                        value={formData.idp_metadata_xml || ''}
                        onChange={(e) => setFormData({ ...formData, idp_metadata_xml: e.target.value })}
                        placeholder={`<?xml version="1.0" encoding="UTF-8"?>\n<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="...">\n  \n</EntityDescriptor>`}
                        rows={6}
                        className="font-mono text-sm"
                        disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      Fallback: Paste the raw SAML metadata XML if you don't have a URL and don't want to use manual fields.
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
                          disabled={isSubmitting}
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
                          disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="mapping" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <AttributeMappingEditor
                        initialRules={formData.attribute_mapping || {}}
                        onChange={setAttributeMappingJson}
                        subtitle={"Map IdP SAML attributes to OIDC standard claims"}
                        tenantId={formData.tenant_id}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    data-testid="cancel-saml-connection-btn"
                    disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                    type="submit"
                    data-testid="save-saml-connection-btn"
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
              <AlertDialogTitle>Delete SAML Provider</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{selectedConnection?.name}</strong>?
                Users will no longer be able to sign in using this Identity Provider.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="cancel-delete-saml-connection-btn" disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                  onClick={handleDelete}
                  data-testid="confirm-delete-saml-connection-btn"
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
