import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Server, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { EmptyState } from '../shared/EmptyState';
import { SecretInput } from '../shared/SecretInput';
import { AttributeMappingEditor } from '../shared/AttributeMappingEditor';
import {
  createLDAPConnection,
  deleteLDAPConnection,
  getLDAPConnections,
  getTenants,
  testLDAPConnection,
  updateLDAPConnection
} from '../../lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const defaultConnection = {
  name: '',
  tenant_id: 'default',
  server_url: '',
  base_dn: '',
  bind_dn: '',
  bind_password: '',
  user_search_filter: '',
  user_search_attributes: [],
  group_search_filter: '',
  group_search_base_dn: '',
  attribute_mapping: {},
  attribute_passthrough: false,
  attribute_exclude: [],
  start_tls: false,
  tls_insecure_skip_verify: false,
};

const PASSWORD_KEEP_SENTINEL = '*****';

const normalizeConnectionForForm = (connection) => ({
  ...defaultConnection,
  ...connection,
  user_search_attributes: Array.isArray(connection?.user_search_attributes)
    ? connection.user_search_attributes
    : [],
  attribute_mapping: connection?.attribute_mapping || {},
  attribute_passthrough: connection?.attribute_passthrough ?? false,
  attribute_exclude: Array.isArray(connection?.attribute_exclude) ? connection.attribute_exclude : [],
  bind_password: '',
});

export function LDAPConnections() {
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
  const [testingConnectionId, setTestingConnectionId] = useState(null);

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
      const response = await getLDAPConnections();

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

      toast.error(error.message || 'Failed to load LDAP connections');
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
    const tenant = tenants.find((item) => item.id === tenantId);
    return tenant ? (tenant.display_name || tenant.name) : tenantId;
  };

  const handleCreate = () => {
    if (isSubmitting || isDeleting || testingConnectionId) {
      return;
    }

    setFormData(defaultConnection);
    setAttributeMappingJson({});
    setSelectedConnection(null);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEdit = (connection) => {
    if (isSubmitting || isDeleting || testingConnectionId) {
      return;
    }

    setFormData(normalizeConnectionForForm(connection));
    setAttributeMappingJson(connection.attribute_mapping || {});
    setSelectedConnection(connection);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDeleteClick = (connection) => {
    if (isSubmitting || isDeleting || testingConnectionId) {
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
      await deleteLDAPConnection(selectedConnection.tenant_id, selectedConnection.id);
      toast.success('LDAP connection deleted successfully');
      await fetchConnections();
    } catch (error) {
      toast.error(error.message || 'Failed to delete LDAP connection');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedConnection(null);
    }
  };

  const handleTest = async (connection) => {
    if (
      isSubmitting ||
      isDeleting ||
      testingConnectionId ||
      !connection?.id ||
      !connection?.tenant_id
    ) {
      return;
    }

    setTestingConnectionId(connection.id);

    try {
      await testLDAPConnection(connection.tenant_id, connection.id);
      toast.success(`LDAP connection "${connection.name}" tested successfully`);
    } catch (error) {
      toast.error(error.message || 'Failed to test LDAP connection');
    } finally {
      setTestingConnectionId(null);
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
    if (!formData.server_url.trim()) {
      toast.error('Server URL is required');
      return;
    }
    if (!formData.base_dn.trim()) {
      toast.error('Base DN is required');
      return;
    }

    let attributeMapping = {};
    try {
      attributeMapping = Object.assign({}, attributeMappingJson);
    } catch (error) {
      toast.error('Invalid attribute mapping');
      return;
    }

    const bindPassword =
      isEditing &&
      (!formData.bind_password.trim() || formData.bind_password.trim() === PASSWORD_KEEP_SENTINEL)
        ? ''
        : formData.bind_password;

    const submitData = {
      ...formData,
      bind_password: bindPassword,
      user_search_attributes: (formData.user_search_attributes || []).map((value) => value.trim()).filter(Boolean),
      attribute_mapping: attributeMapping,
    };

    setIsSubmitting(true);

    try {
      if (isEditing) {
        await updateLDAPConnection(selectedConnection.tenant_id, formData.id, submitData);
        toast.success('LDAP connection updated successfully');
      } else {
        await createLDAPConnection(submitData);
        toast.success('LDAP connection created successfully');
      }

      await fetchConnections();
      setDialogOpen(false);
    } catch (error) {
      toast.error(error.message || 'Failed to save LDAP connection');
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
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="ldap-connections-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
              LDAP Providers
            </h1>
            <Badge variant="outline" className="bg-sky-500/10 text-sky-500 border-sky-500/20">
              LDAP
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Directory-backed identity providers for LDAP and Active Directory authentication
          </p>
        </div>
        <Button
          onClick={handleCreate}
          data-testid="create-ldap-connection-btn"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          disabled={isSubmitting || isDeleting || !!testingConnectionId}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add LDAP Provider
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : connections.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No LDAP providers yet"
          description="Connect your LDAP or Active Directory directory to enable federated directory authentication."
          actionLabel="Add LDAP Provider"
          onAction={handleCreate}
          testId="empty-ldap-connections"
        />
      ) : (
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Tenant</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Directory</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">TLS</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((connection) => {
                  const isTesting = testingConnectionId === connection.id;

                  return (
                    <TableRow
                      key={connection.id}
                      className="hover:bg-muted/30 border-b border-border/40"
                      data-testid={`ldap-connection-row-${connection.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                            <Server className="h-5 w-5 text-sky-500" />
                          </div>
                          <div>
                            <p className="font-medium">{connection.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {connection.bind_dn || 'Anonymous bind'}
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
                        <div className="space-y-1">
                          <code className="block text-sm font-mono text-muted-foreground">
                            {connection.server_url}
                          </code>
                          <code className="block text-xs font-mono text-muted-foreground/80">
                            {connection.base_dn}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-2 flex-wrap">
                          {connection.start_tls && (
                            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                              StartTLS
                            </Badge>
                          )}
                          {connection.tls_insecure_skip_verify && (
                            <Badge variant="outline" className="bg-amber-500/15 text-amber-500 border-amber-500/20">
                              Insecure TLS
                            </Badge>
                          )}
                          {!connection.start_tls && !connection.tls_insecure_skip_verify && (
                            <Badge variant="outline" className="bg-muted/30">
                              Default
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
                            size="sm"
                            onClick={() => handleTest(connection)}
                            data-testid={`test-ldap-connection-${connection.id}`}
                            disabled={isSubmitting || isDeleting || (!!testingConnectionId && !isTesting)}
                          >
                            {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Test'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(connection)}
                            data-testid={`edit-ldap-connection-${connection.id}`}
                            className="h-8 w-8"
                            aria-label={`Edit LDAP provider ${connection.name}`}
                            title={`Edit LDAP provider ${connection.name}`}
                            disabled={isSubmitting || isDeleting || !!testingConnectionId}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(connection)}
                            data-testid={`delete-ldap-connection-${connection.id}`}
                            className="h-8 w-8 hover:text-destructive"
                            aria-label={`Delete LDAP provider ${connection.name}`}
                            title={`Delete LDAP provider ${connection.name}`}
                            disabled={isSubmitting || isDeleting || !!testingConnectionId}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
              {isEditing ? 'Edit LDAP Provider' : 'Add LDAP Provider'}
              <Badge variant="outline" className="bg-sky-500/10 text-sky-500 border-sky-500/20">
                LDAP
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update your LDAP directory connection'
                : 'Configure an LDAP or Active Directory connection for tenant-scoped authentication'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="mapping">Attribute Mapping</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="ldap-connection-name">Connection Name *</Label>
                  <Input
                    id="ldap-connection-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Corporate Active Directory"
                    data-testid="ldap-connection-name-input"
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
                      Tenant cannot be changed during edit because update, delete, and test operations are tenant-scoped.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ldap-server-url">Server URL *</Label>
                  <Input
                    id="ldap-server-url"
                    value={formData.server_url}
                    onChange={(e) => setFormData({ ...formData, server_url: e.target.value })}
                    placeholder="ldaps://ldap.corp.example.com:636"
                    data-testid="ldap-connection-server-url-input"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use `ldap://` or `ldaps://` with the correct host and port.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ldap-base-dn">Base DN *</Label>
                  <Input
                    id="ldap-base-dn"
                    value={formData.base_dn}
                    onChange={(e) => setFormData({ ...formData, base_dn: e.target.value })}
                    placeholder="dc=corp,dc=example,dc=com"
                    data-testid="ldap-connection-base-dn-input"
                    disabled={isSubmitting}
                  />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ldap-bind-dn">Bind DN</Label>
                    <Input
                      id="ldap-bind-dn"
                      value={formData.bind_dn || ''}
                      onChange={(e) => setFormData({ ...formData, bind_dn: e.target.value })}
                      placeholder="cn=svc-shyntr,ou=ServiceAccounts,dc=corp,dc=example,dc=com"
                      data-testid="ldap-connection-bind-dn-input"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bind Password</Label>
                    <SecretInput
                      value={formData.bind_password}
                      onChange={(e) => setFormData({ ...formData, bind_password: e.target.value })}
                      placeholder={isEditing ? 'Leave blank or enter ***** to keep existing password' : 'Enter bind password'}
                      readOnly={isSubmitting}
                      testId="ldap-connection-bind-password-input"
                    />
                    <p className="text-xs text-muted-foreground">
                      This value is write-only and is never returned by the API.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ldap-user-search-filter">User Search Filter</Label>
                  <Input
                    id="ldap-user-search-filter"
                    value={formData.user_search_filter || ''}
                    onChange={(e) => setFormData({ ...formData, user_search_filter: e.target.value })}
                    placeholder="(sAMAccountName={0})"
                    data-testid="ldap-connection-user-search-filter-input"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use <code>{'{0}'}</code> as the username placeholder in the backend LDAP filter.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ldap-user-search-attributes">User Search Attributes</Label>
                  <Input
                    id="ldap-user-search-attributes"
                    value={(formData.user_search_attributes || []).join(', ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      user_search_attributes: e.target.value.split(',').map((value) => value.trim()).filter(Boolean)
                    })}
                    placeholder="cn, mail, memberOf"
                    data-testid="ldap-connection-user-search-attributes-input"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ldap-group-search-filter">Group Search Filter</Label>
                    <Input
                      id="ldap-group-search-filter"
                      value={formData.group_search_filter || ''}
                      onChange={(e) => setFormData({ ...formData, group_search_filter: e.target.value })}
                      placeholder="(member={0})"
                      data-testid="ldap-connection-group-search-filter-input"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ldap-group-search-base-dn">Group Search Base DN</Label>
                    <Input
                      id="ldap-group-search-base-dn"
                      value={formData.group_search_base_dn || ''}
                      onChange={(e) => setFormData({ ...formData, group_search_base_dn: e.target.value })}
                      placeholder="ou=Groups,dc=corp,dc=example,dc=com"
                      data-testid="ldap-connection-group-search-base-dn-input"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                    <div>
                      <Label className="text-sm font-medium">StartTLS</Label>
                      <p className="text-xs text-muted-foreground">
                        Upgrade a plain LDAP connection to TLS after connect.
                      </p>
                    </div>
                    <Switch
                      checked={formData.start_tls}
                      onCheckedChange={(checked) => setFormData({ ...formData, start_tls: checked })}
                      data-testid="ldap-start-tls-toggle"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                    <div>
                      <Label className="text-sm font-medium">Skip TLS Verification</Label>
                      <p className="text-xs text-muted-foreground">
                        Accept invalid or self-signed certificates.
                      </p>
                    </div>
                    <Switch
                      checked={formData.tls_insecure_skip_verify}
                      onCheckedChange={(checked) => setFormData({ ...formData, tls_insecure_skip_verify: checked })}
                      data-testid="ldap-tls-insecure-skip-verify-toggle"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mapping" className="space-y-4 mt-4">
                <AttributeMappingEditor
                  initialRules={formData.attribute_mapping || {}}
                  onChange={setAttributeMappingJson}
                  subtitle="Map LDAP attributes to internal claims and token fields"
                  tenantId={formData.tenant_id}
                  attributePassthrough={formData.attribute_passthrough}
                  onPassthroughChange={(checked) => setFormData((prev) => ({...prev, attribute_passthrough: checked}))}
                  attributeExclude={formData.attribute_exclude || []}
                  onExcludeChange={(vals) => setFormData((prev) => ({...prev, attribute_exclude: vals}))}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-testid="cancel-ldap-connection-btn"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid="save-ldap-connection-btn"
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
            <AlertDialogTitle>Delete LDAP Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedConnection?.name}</strong>?
              Users will no longer be able to authenticate through this directory connection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-testid="cancel-delete-ldap-connection-btn"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-testid="confirm-delete-ldap-connection-btn"
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
