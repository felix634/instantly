'use client';

import React, { useState } from 'react';
import { useAppState } from '../context/UserContext';
import { EmailAccount, AccountTag } from '../types';

const TAG_PALETTE = [
    { key: 'primary', cls: 'bg-primary/15 text-primary border-primary/40' },
    { key: 'emerald', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' },
    { key: 'blue', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
    { key: 'amber', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
    { key: 'rose', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/40' },
    { key: 'violet', cls: 'bg-violet-500/15 text-violet-400 border-violet-500/40' },
];

export function tagColorClass(color: string, selected = false) {
    const hit = TAG_PALETTE.find(p => p.key === color) ?? TAG_PALETTE[0];
    return selected
        ? hit.cls.replace('/15', '/30')
        : hit.cls;
}

export default function AccountsManager() {
    const { currentUserState, addAccount, updateAccount, deleteAccount, addTag, deleteTag } = useAppState();
    const { accounts, tags } = currentUserState;

    const [newEmail, setNewEmail] = useState('');
    const [newLimit, setNewLimit] = useState(50);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editEmail, setEditEmail] = useState('');
    const [editLimit, setEditLimit] = useState(50);
    const [editTagIds, setEditTagIds] = useState<string[]>([]);

    const [showTagForm, setShowTagForm] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('primary');

    const totalCapacity = accounts.reduce((s, a) => s + a.dailyLimit, 0);

    const handleAdd = () => {
        if (!newEmail.trim()) return;
        addAccount({ email: newEmail.trim(), dailyLimit: newLimit, tagIds: [] });
        setNewEmail('');
        setNewLimit(50);
    };

    const startEdit = (a: EmailAccount) => {
        setEditingId(a.id);
        setEditEmail(a.email);
        setEditLimit(a.dailyLimit);
        setEditTagIds(a.tagIds);
    };

    const saveEdit = (id: string) => {
        updateAccount(id, { email: editEmail.trim(), dailyLimit: editLimit, tagIds: editTagIds });
        setEditingId(null);
    };

    const handleAddTag = () => {
        const name = newTagName.trim();
        if (!name) return;
        if (tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
            setNewTagName('');
            return;
        }
        addTag({ name, color: newTagColor });
        setNewTagName('');
        setNewTagColor('primary');
        setShowTagForm(false);
    };

    const handleDeleteTag = (tag: AccountTag) => {
        const usage = accounts.filter(a => a.tagIds.includes(tag.id)).length;
        const msg = usage > 0
            ? `Delete tag "${tag.name}"? It is assigned to ${usage} account${usage === 1 ? '' : 's'} and will be removed from them.`
            : `Delete tag "${tag.name}"?`;
        if (confirm(msg)) deleteTag(tag.id);
    };

    const toggleEditTag = (tagId: string) => {
        setEditTagIds(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
    };

    return (
        <div className="p-8 rounded-2xl glass">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Email Accounts</h2>
                <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm font-bold text-primary">
                    Total capacity: <span className="text-white">{totalCapacity}/day</span>
                </div>
            </div>

            {/* Tags row */}
            <div className="mb-6 pb-6 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Tags</label>
                    <button
                        onClick={() => setShowTagForm(s => !s)}
                        className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                    >
                        {showTagForm ? 'Cancel' : '+ New Tag'}
                    </button>
                </div>

                {tags.length === 0 && !showTagForm && (
                    <p className="text-muted-foreground italic text-xs">No tags yet. Group accounts (e.g. "old", "new", "@prometheus") to bulk-select them in campaigns.</p>
                )}

                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {tags.map(tag => {
                            const count = accounts.filter(a => a.tagIds.includes(tag.id)).length;
                            return (
                                <span
                                    key={tag.id}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${tagColorClass(tag.color)} group/tag`}
                                >
                                    <span>{tag.name}</span>
                                    <span className="opacity-60 font-normal">{count}</span>
                                    <button
                                        onClick={() => handleDeleteTag(tag)}
                                        className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:scale-110"
                                        title="Delete tag"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                )}

                {showTagForm && (
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end mt-3">
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Tag Name</label>
                            <input
                                value={newTagName}
                                onChange={e => setNewTagName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                placeholder="e.g. old, new, @prometheus"
                                className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border text-sm outline-none focus:border-primary"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Color</label>
                            <div className="flex gap-1">
                                {TAG_PALETTE.map(p => (
                                    <button
                                        key={p.key}
                                        onClick={() => setNewTagColor(p.key)}
                                        className={`w-7 h-7 rounded-md border-2 transition-all ${tagColorClass(p.key, true)} ${newTagColor === p.key ? 'ring-2 ring-foreground/60' : 'opacity-70'}`}
                                        title={p.key}
                                    />
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={handleAddTag}
                            disabled={!newTagName.trim()}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/80 transition-all disabled:opacity-40 whitespace-nowrap"
                        >
                            Add Tag
                        </button>
                    </div>
                )}
            </div>

            {/* Account list */}
            <div className="space-y-3 mb-6">
                {accounts.length === 0 && (
                    <p className="text-muted-foreground italic text-sm">No accounts yet. Add one below.</p>
                )}
                {accounts.map(account => (
                    <div key={account.id} className="rounded-xl bg-background/30 border border-border group">
                        {editingId === account.id ? (
                            <div className="p-4 space-y-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <input
                                        value={editEmail}
                                        onChange={e => setEditEmail(e.target.value)}
                                        className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-background/60 border border-border text-sm outline-none focus:border-primary"
                                        placeholder="email@domain.com"
                                    />
                                    <input
                                        type="number"
                                        value={editLimit}
                                        onChange={e => setEditLimit(parseInt(e.target.value) || 0)}
                                        className="w-20 px-3 py-1.5 rounded-lg bg-background/60 border border-border text-sm outline-none focus:border-primary text-center"
                                        min={1}
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">/day</span>
                                    <button
                                        onClick={() => saveEdit(account.id)}
                                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/80 transition-colors"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:bg-muted/80 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground self-center mr-1">Tags:</span>
                                        {tags.map(tag => {
                                            const on = editTagIds.includes(tag.id);
                                            return (
                                                <button
                                                    key={tag.id}
                                                    onClick={() => toggleEditTag(tag.id)}
                                                    className={`px-2.5 py-1 rounded-md border text-[11px] font-bold transition-all ${tagColorClass(tag.color, on)} ${on ? 'ring-1 ring-foreground/30' : 'opacity-50 hover:opacity-100'}`}
                                                >
                                                    {tag.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-4">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{account.email}</p>
                                    {account.tagIds.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {account.tagIds.map(tid => {
                                                const tag = tags.find(t => t.id === tid);
                                                if (!tag) return null;
                                                return (
                                                    <span
                                                        key={tid}
                                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${tagColorClass(tag.color)}`}
                                                    >
                                                        {tag.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-primary whitespace-nowrap">{account.dailyLimit}<span className="text-muted-foreground font-normal">/day</span></span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEdit(account)}
                                        className="px-3 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:text-foreground transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => deleteAccount(account.id)}
                                        className="px-3 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add new account */}
            <div className="flex gap-3 items-end pt-4 border-t border-border">
                <div className="flex-1 space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Email Address</label>
                    <input
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder="outreach@company.com"
                        className="w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                </div>
                <div className="w-28 space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Daily Limit</label>
                    <input
                        type="number"
                        value={newLimit}
                        onChange={e => setNewLimit(parseInt(e.target.value) || 0)}
                        min={1}
                        className="w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-center"
                    />
                </div>
                <button
                    onClick={handleAdd}
                    disabled={!newEmail.trim()}
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                    + Add
                </button>
            </div>
        </div>
    );
}
