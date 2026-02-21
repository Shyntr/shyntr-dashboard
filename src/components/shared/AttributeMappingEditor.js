import React, { useState } from 'react';
import { Plus, Trash2, Pencil, X, Check, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
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

export function AttributeMappingEditor({ initialRules = {}, onChange, subtitle = ""  }) {
    // Convert incoming Object to Array for the Table
    const [rules, setRules] = useState(() => {
        return Object.entries(initialRules || {}).map(([key, val]) => ({
            target: key,
            source: val.source || '',
            type: val.type || 'string',
            fallback: val.fallback || '',
            value: val.value || '',
        }));
    });

    // State to manage which rule is being edited.
    // null = viewing table, -1 = adding new, 0+ = editing existing index
    const [editingIndex, setEditingIndex] = useState(null);

    // Temporary state for the form inputs
    const [draftRule, setDraftRule] = useState({
        target: '', source: '', type: 'string', fallback: '', value: ''
    });

    // --- Handlers for List View ---

    const handleAddNew = () => {
        setDraftRule({ target: '', source: '', type: 'string', fallback: '', value: '' });
        setEditingIndex(-1);
    };

    const handleEdit = (index) => {
        setDraftRule({ ...rules[index] });
        setEditingIndex(index);
    };

    const handleDelete = (index) => {
        const newRules = rules.filter((_, i) => i !== index);
        setRules(newRules);
        emitChange(newRules);
    };

    // --- Handlers for Form View ---

    const saveDraft = () => {
        if (!draftRule.target || draftRule.target.trim() === '') {
            // In a real app, you might want to show a toast error here
            return;
        }

        let newRules = [...rules];
        if (editingIndex === -1) {
            newRules.push(draftRule); // Add new
        } else {
            newRules[editingIndex] = draftRule; // Update existing
        }

        setRules(newRules);
        emitChange(newRules);
        setEditingIndex(null); // Close form, go back to table
    };

    const cancelEdit = () => {
        setEditingIndex(null);
    };

    // Convert the UI Array back to the JSON Map object expected by the Backend
    const emitChange = (currentRules) => {
        const mapObj = {};
        currentRules.forEach((r) => {
            if (r.target && r.target.trim() !== '') {
                mapObj[r.target.trim()] = {
                    source: r.source || '',
                    type: r.type || 'string',
                    fallback: r.fallback || '',
                    value: r.value || '',
                };
            }
        });
        onChange(mapObj);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Label>Attribute Mapping (JSON)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                        {subtitle || ""}
                    </p>
                </div>
                {editingIndex === null && (
                    <Button onClick={handleAddNew} type="button" variant="outline" size="sm" className="h-8">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Rule
                    </Button>
                )}
            </div>

            {/* Editor Form (Visible only when adding or editing) */}
            {editingIndex !== null && (
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-foreground">
                            {editingIndex === -1 ? 'Add New Rule' : 'Edit Rule'}
                        </h4>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}>
                            <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Target Field (Internal)</Label>
                            <Input
                                type="text"
                                placeholder="e.g. email"
                                className="h-8 font-mono text-xs"
                                value={draftRule.target}
                                onChange={(e) => setDraftRule({ ...draftRule, target: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Source Field (External)</Label>
                            <Input
                                type="text"
                                placeholder="e.g. idp.mail"
                                className="h-8 font-mono text-xs"
                                value={draftRule.source}
                                disabled={!!draftRule.value}
                                onChange={(e) => setDraftRule({ ...draftRule, source: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Data Type</Label>
                            <Select
                                value={draftRule.type}
                                onValueChange={(val) => setDraftRule({ ...draftRule, type: val })}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                    <SelectItem value="integer">Integer</SelectItem>
                                    <SelectItem value="string_array">Array</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Fallback Field (Optional)</Label>
                            <Input
                                type="text"
                                placeholder="e.g. upn"
                                className="h-8 font-mono text-xs"
                                value={draftRule.fallback}
                                disabled={!!draftRule.value}
                                onChange={(e) => setDraftRule({ ...draftRule, fallback: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-primary/80">Static Value (Overrides Source)</Label>
                            <Input
                                type="text"
                                placeholder="e.g. tr_123"
                                className="h-8 font-mono text-xs border-primary/30"
                                value={draftRule.value}
                                onChange={(e) => setDraftRule({ ...draftRule, value: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                            Cancel
                        </Button>
                        <Button type="button" size="sm" onClick={saveDraft} disabled={!draftRule.target}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Save Rule
                        </Button>
                    </div>
                </div>
            )}

            {/* Table View (Always visible, but empty state shows if no rules) */}
            {rules.length > 0 ? (
                <div className="border rounded-md overflow-hidden bg-card">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="text-xs h-8">Target</TableHead>
                                <TableHead className="text-xs h-8">Source</TableHead>
                                <TableHead className="text-xs h-8">Type</TableHead>
                                <TableHead className="text-xs h-8 hidden sm:table-cell">Advanced</TableHead>
                                <TableHead className="text-xs h-8 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rules.map((rule, idx) => (
                                <TableRow key={idx} className={editingIndex === idx ? 'bg-muted/30' : ''}>
                                    <TableCell className="font-mono text-xs py-2">{rule.target}</TableCell>
                                    <TableCell className="py-2">
                                        {rule.value ? (
                                            <span className="text-xs italic text-muted-foreground">Static Value</span>
                                        ) : (
                                            <span className="font-mono text-xs">{rule.source}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                                            {rule.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-2 hidden sm:table-cell">
                                        <div className="flex flex-col gap-1">
                                            {rule.fallback && (
                                                <span className="text-[10px] text-muted-foreground flex items-center">
                          Fallback: <code className="ml-1">{rule.fallback}</code>
                        </span>
                                            )}
                                            {rule.value && (
                                                <span className="text-[10px] text-primary flex items-center">
                          Value: <code className="ml-1">{rule.value}</code>
                        </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-2">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => handleEdit(idx)}
                                                disabled={editingIndex !== null}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(idx)}
                                                disabled={editingIndex !== null}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                editingIndex === null && (
                    <div className="text-center py-8 border border-dashed rounded-lg bg-muted/10">
                        <p className="text-sm text-muted-foreground mb-2">No mapping rules configured.</p>
                        <Button onClick={handleAddNew} type="button" variant="outline" size="sm">
                            Create your first rule
                        </Button>
                    </div>
                )
            )}
        </div>
    );
}