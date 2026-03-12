import {useEffect, useState} from 'react';
import { useTranslation } from 'react-i18next';
import {Plus, Pencil, Trash2, Fingerprint, RefreshCw, ShieldAlert} from 'lucide-react';
import {Card, CardContent} from '../ui/card';
import {Button} from '../ui/button';
import {Badge} from '../ui/badge';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {Textarea} from '../ui/textarea';
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
import {toast} from 'sonner';
import {EmptyState} from '../shared/EmptyState';
import { getTenants, getScopes, createScope, updateScope, deleteScope } from '../../lib/api';

const defaultScope = {
    name: '',
    description: '',
    claims: [],
    is_system: false
};

export function Scopes() {
    const { t } = useTranslation();
    const [scopes, setScopes] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [selectedTenantId, setSelectedTenantId] = useState('default');
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedScope, setSelectedScope] = useState(null);
    const [formData, setFormData] = useState(defaultScope);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => { fetchTenants(); }, []);
    useEffect(() => { if (selectedTenantId) { fetchScopes(selectedTenantId); } }, [selectedTenantId]);

    const fetchTenants = async () => {
        try {
            const response = await getTenants();
            setTenants(response.data);
        } catch (error) { toast.error(t('common.error_load', 'Failed to load')); }
    };

    const fetchScopes = async (tenantId) => {
        setLoading(true);
        try {
            const response = await getScopes(tenantId);
            setScopes(response.data || []);
        } catch (error) { toast.error(error.message || t('common.error_load', 'Failed to load')); } finally { setLoading(false); }
    };

    const handleCreate = () => { setFormData({ ...defaultScope, tenant_id: selectedTenantId }); setIsEditing(false); setDialogOpen(true); };
    const handleEdit = (scope) => { setFormData({ ...scope, claims: scope.claims || [] }); setIsEditing(true); setDialogOpen(true); };

    const handleDeleteClick = (scope) => {
        if (scope.is_system) { toast.error(t('scopes.system_cannot_delete', 'System scopes cannot be deleted.')); return; }
        setSelectedScope(scope);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        try {
            await deleteScope(selectedTenantId, selectedScope.id);
            toast.success(t('common.deleted_success', 'Deleted successfully'));
            fetchScopes(selectedTenantId);
        } catch (error) { toast.error(error.message || t('common.error_delete', 'Failed to delete')); } finally { setDeleteDialogOpen(false); setSelectedScope(null); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const normalizedName = formData.name.trim().toLowerCase();
        if (!normalizedName) { toast.error(t('scopes.error_name_required', 'Scope name is required')); return; }

        if (!isEditing || (isEditing && formData.name !== scopes.find(s => s.id === formData.id)?.name)) {
            const nameExists = scopes.some(s => s.name.toLowerCase() === normalizedName);
            if (nameExists) { toast.error(t('scopes.error_exists', 'Scope already exists')); return; }
        }

        const cleanData = { ...formData, name: normalizedName, tenant_id: selectedTenantId, claims: Array.isArray(formData.claims) ? formData.claims : formData.claims.split(',').map(s => s.trim()).filter(Boolean) };
        try {
            if (isEditing) { await updateScope(selectedTenantId, formData.id, cleanData); toast.success(t('common.updated_success', 'Updated successfully')); }
            else { await createScope(selectedTenantId, cleanData); toast.success(t('common.created_success', 'Created successfully')); }
            setDialogOpen(false);
            fetchScopes(selectedTenantId);
        } catch (error) { toast.error(error.message || t('common.error_save', 'Failed to save')); }
    };

    return (
        <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="scopes-page">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">{t('scopes.title', 'Identity Scopes')}</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">{t('scopes.subtitle', 'Manage OAuth2 scopes and Attribute Release boundaries.')}</p>
                </div>
                <div className="flex items-center gap-4">
                    <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                        <SelectTrigger className="w-[200px]"><SelectValue placeholder={t('common.select_tenant', 'Select Tenant')} /></SelectTrigger>
                        <SelectContent>{tenants.map(t => (<SelectItem key={t.id} value={t.id}>{t.display_name || t.name}</SelectItem>))}</SelectContent>
                    </Select>
                    <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                        <Plus className="h-4 w-4 mr-2" /> {t('scopes.create_btn', 'Create Scope')}
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : scopes.length === 0 ? (
                <EmptyState
                    icon={Fingerprint}
                    title={t('scopes.empty_title', 'No Scopes found')}
                    description={t('scopes.empty_desc', 'Create identity scopes to control which claims are shared with applications.')}
                    actionLabel={t('scopes.create_btn', 'Create Scope')}
                    onAction={handleCreate}
                    testId="empty-scopes"
                />
            ) : (
                <Card className="bg-card/40 backdrop-blur-sm border-border/40">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="text-xs uppercase tracking-wider">{t('scopes.scope_name', 'Scope Name')}</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">{t('common.description', 'Description')}</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider">{t('scopes.assigned_claims', 'Assigned Claims')}</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-right">{t('common.actions', 'Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {scopes.map((scope) => (
                                    <TableRow key={scope.id} className="hover:bg-muted/30 border-b border-border/40">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-foreground">{scope.name}</span>
                                                {scope.is_system && (<Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/20 px-1.5 py-0 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> System</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                            {scope.description || <span className="italic opacity-50">{t('common.no_description', 'No description')}</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {scope.claims?.map((claim) => (<Badge key={claim} variant="outline" className="text-xs bg-muted/30">{claim}</Badge>))}
                                                {(!scope.claims || scope.claims.length === 0) && (<span className="text-xs text-muted-foreground italic">{t('scopes.no_claims', 'No claims bound')}</span>)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!scope.is_system && <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(scope)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(scope)} className="h-8 w-8 hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                            </div>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="font-heading">{isEditing ? t('scopes.edit_title', 'Edit Scope') : t('scopes.create_title', 'Create Scope')}</DialogTitle>
                        <DialogDescription>{isEditing ? t('scopes.edit_desc', 'Update the scope description and its associated claims.') : t('scopes.create_desc', 'Define a new scope and the identity claims it will release.')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label htmlFor="scope-name">{t('scopes.scope_name', 'Scope Name')} *</Label>
                            <Input id="scope-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isEditing && formData.is_system} className={isEditing && formData.is_system ? "bg-muted/50 text-muted-foreground" : ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('scopes.consent_desc', 'Consent Description')}</Label>
                            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('scopes.assoc_claims', 'Associated Claims (comma-separated)')}</Label>
                            <Input value={Array.isArray(formData.claims) ? formData.claims.join(', ') : formData.claims} onChange={(e) => setFormData({ ...formData, claims: e.target.value })} />
                            <p className="text-[10px] text-primary/80 italic">{t('scopes.claims_hint', 'Claims listed here will be released to the client when this scope is requested.')}</p>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                            <Button type="submit" className="bg-primary hover:bg-primary/90">{isEditing ? t('common.update', 'Update') : t('common.create', 'Create')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('scopes.delete_title', 'Delete Scope')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('common.delete_confirm', 'Are you sure you want to delete')} <strong>{selectedScope?.name}</strong>? {t('scopes.delete_desc', 'Applications requesting this scope will no longer receive its associated claims.')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">{t('common.delete', 'Delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}