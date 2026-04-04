import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Fingerprint, RefreshCw, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '../ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { EmptyState } from '../shared/EmptyState';
import { getTenants, getScopes, createScope, updateScope, deleteScope } from '../../lib/api';

const defaultScope = {
    name: '',
    description: '',
    claims: [],
    is_system: false
};

export function Scopes() {
    const [scopes, setScopes] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [selectedTenantId, setSelectedTenantId] = useState('default');
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedScope, setSelectedScope] = useState(null);
    const [formData, setFormData] = useState(defaultScope);
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const latestTenantsRequestRef = useRef(0);
    const activeTenantsRequestRef = useRef(null);
    const latestScopesRequestRef = useRef(0);
    const activeScopesRequestRef = useRef(null);

    useEffect(() => {
        fetchTenants();

        return () => {
            if (activeTenantsRequestRef.current) {
                activeTenantsRequestRef.current.cancelled = true;
            }
            if (activeScopesRequestRef.current) {
                activeScopesRequestRef.current.cancelled = true;
            }
        };
    }, []);

    useEffect(() => {
        if (selectedTenantId) {
            fetchScopes(selectedTenantId);
        }
    }, [selectedTenantId]);

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

            toast.error('Failed to load tenants');
        }
    };

    const fetchScopes = async (tenantId) => {
        const requestId = latestScopesRequestRef.current + 1;
        latestScopesRequestRef.current = requestId;

        if (activeScopesRequestRef.current) {
            activeScopesRequestRef.current.cancelled = true;
        }

        const requestToken = { id: requestId, cancelled: false };
        activeScopesRequestRef.current = requestToken;

        setLoading(true);

        try {
            const response = await getScopes(tenantId);

            if (
                requestToken.cancelled ||
                activeScopesRequestRef.current?.id !== requestId
            ) {
                return;
            }

            setScopes(response.data || []);
        } catch (error) {
            if (
                requestToken.cancelled ||
                activeScopesRequestRef.current?.id !== requestId
            ) {
                return;
            }

            toast.error(error.message || 'Failed to load scopes');
        } finally {
            if (
                !requestToken.cancelled &&
                activeScopesRequestRef.current?.id === requestId
            ) {
                setLoading(false);
            }
        }
    };

    const handleCreate = () => {
        if (isSubmitting || isDeleting) {
            return;
        }

        setFormData({ ...defaultScope, tenant_id: selectedTenantId });
        setSelectedScope(null);
        setIsEditing(false);
        setDialogOpen(true);
    };

    const handleEdit = (scope) => {
        if (isSubmitting || isDeleting) {
            return;
        }

        setFormData({
            ...scope,
            claims: scope.claims || []
        });
        setSelectedScope(scope);
        setIsEditing(true);
        setDialogOpen(true);
    };

    const handleDeleteClick = (scope) => {
        if (isSubmitting || isDeleting) {
            return;
        }

        if (scope.is_system) {
            toast.error('Security Protocol: System scopes cannot be deleted.');
            return;
        }

        setSelectedScope(scope);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (isDeleting || !selectedScope?.id) {
            return;
        }

        setIsDeleting(true);

        try {
            await deleteScope(selectedTenantId, selectedScope.id);
            toast.success('Scope deleted successfully');
            await fetchScopes(selectedTenantId);
        } catch (error) {
            toast.error(error.message || 'Failed to delete scope');
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
            setSelectedScope(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) {
            return;
        }

        const normalizedName = formData.name.trim().toLowerCase();

        if (!normalizedName) {
            toast.error('Scope name is required');
            return;
        }

        if (!isEditing || (isEditing && formData.name !== scopes.find(s => s.id === formData.id)?.name)) {
            const nameExists = scopes.some(s => s.name.toLowerCase() === normalizedName);
            if (nameExists) {
                toast.error(`A scope with the name "${normalizedName}" already exists. Please choose a unique name.`);
                return;
            }
        }

        const cleanData = {
            ...formData,
            name: normalizedName,
            tenant_id: selectedTenantId,
            claims: Array.isArray(formData.claims)
                ? formData.claims
                : formData.claims.split(',').map(s => s.trim()).filter(Boolean)
        };

        setIsSubmitting(true);

        try {
            if (isEditing) {
                await updateScope(selectedTenantId, formData.id, cleanData);
                toast.success('Scope updated successfully');
            } else {
                await createScope(selectedTenantId, cleanData);
                toast.success('Scope created successfully');
            }

            await fetchScopes(selectedTenantId);
            setDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || error.message || 'Failed to save scope');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="scopes-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
                            Identity Scopes
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Manage OAuth2 scopes and Attribute Release boundaries.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select Tenant" />
                        </SelectTrigger>
                        <SelectContent>
                            {tenants.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.display_name || t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={handleCreate}
                        className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                        disabled={isSubmitting || isDeleting}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Scope
                    </Button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : scopes.length === 0 ? (
                <EmptyState
                    icon={Fingerprint}
                    title="No Scopes found"
                    description="Create identity scopes to control which claims are shared with applications."
                    actionLabel="Create Scope"
                    onAction={handleCreate}
                    testId="empty-scopes"
                />
            ) : (
                <Card className="bg-card/40 backdrop-blur-sm border-border/40">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="text-xs uppercase tracking-wider">Scope Name</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Description</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider">Assigned Claims</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {scopes.map((scope) => (
                                    <TableRow key={scope.id} className="hover:bg-muted/30 border-b border-border/40">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-foreground">{scope.name}</span>
                                                {scope.is_system && (
                                                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/20 px-1.5 py-0 flex items-center gap-1">
                                                        <ShieldAlert className="w-3 h-3" /> System
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                            {scope.description || <span className="italic opacity-50">No description</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {scope.claims?.map((claim) => (
                                                    <Badge key={claim} variant="outline" className="text-xs bg-muted/30">
                                                        {claim}
                                                    </Badge>
                                                ))}
                                                {(!scope.claims || scope.claims.length === 0) && (
                                                    <span className="text-xs text-muted-foreground italic">No claims bound</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!scope.is_system && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(scope)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        title={`Edit scope ${scope.name}`}
                                                        aria-label={`Edit scope ${scope.name}`}
                                                        disabled={isSubmitting || isDeleting}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(scope)}
                                                        disabled={scope.is_system || isSubmitting || isDeleting}
                                                        title={scope.is_system ? "System scopes cannot be deleted" : `Delete scope ${scope.name}`}
                                                        aria-label={scope.is_system ? "System scope cannot be deleted" : `Delete scope ${scope.name}`}
                                                        className={`h-8 w-8 ${scope.is_system ? 'opacity-30 cursor-not-allowed' : 'text-muted-foreground hover:text-destructive'}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
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
                <DialogContent className="max-w-lg bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="font-heading">
                            {isEditing ? 'Edit Scope' : 'Create Scope'}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? 'Update the scope description and its associated claims.'
                                : 'Define a new scope and the identity claims it will release.'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label htmlFor="scope-name">Scope Name *</Label>
                            <Input
                                id="scope-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. hr_data"
                                disabled={isEditing && formData.is_system || isSubmitting}
                                className={isEditing && formData.is_system ? "bg-muted/50 text-muted-foreground" : ""}
                            />
                            {isEditing && formData.is_system && (
                                <p className="text-xs text-red-300/80 flex items-center gap-1 mt-1">
                                    <ShieldAlert className="w-3 h-3" /> System scope names are locked and cannot be modified.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Consent Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Allows the application to read your HR data."
                                rows={2}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Associated Claims (comma-separated)</Label>
                            <Input
                                value={Array.isArray(formData.claims) ? formData.claims.join(', ') : formData.claims}
                                onChange={(e) => setFormData({ ...formData, claims: e.target.value })}
                                placeholder="department, title, salary_band"
                                disabled={isSubmitting}
                            />
                            <p className="text-[10px] text-primary/80 italic">
                                Claims listed here will be released to the client when this scope is requested.
                            </p>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                                {isSubmitting
                                    ? (isEditing ? 'Updating...' : 'Creating...')
                                    : (isEditing ? 'Update Scope' : 'Create Scope')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
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
                        <AlertDialogTitle>Delete Scope</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the scope <strong>{selectedScope?.name}</strong>?
                            Any applications requesting this scope will no longer receive its associated claims.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}