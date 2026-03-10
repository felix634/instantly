'use client';

import React, { useState } from 'react';
import { useAppState } from '../context/UserContext';
import { EmailAccount } from '../types';

export default function AccountsManager() {
    const { currentUserState, addAccount, updateAccount, deleteAccount } = useAppState();
    const { accounts } = currentUserState;

    const [newEmail, setNewEmail] = useState('');
    const [newLimit, setNewLimit] = useState(50);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editEmail, setEditEmail] = useState('');
    const [editLimit, setEditLimit] = useState(50);

    const totalCapacity = accounts.reduce((s, a) => s + a.dailyLimit, 0);

    const handleAdd = () => {
        if (!newEmail.trim()) return;
        addAccount({ email: newEmail.trim(), dailyLimit: newLimit });
        setNewEmail('');
        setNewLimit(50);
    };

    const startEdit = (a: EmailAccount) => {
        setEditingId(a.id);
        setEditEmail(a.email);
        setEditLimit(a.dailyLimit);
    };

    const saveEdit = (id: string) => {
        updateAccount(id, { email: editEmail.trim(), dailyLimit: editLimit });
        setEditingId(null);
    };

    return (
        <div className="p-8 rounded-2xl glass">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Email Accounts</h2>
                <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm font-bold text-primary">
                    Total capacity: <span className="text-white">{totalCapacity}/day</span>
                </div>
            </div>

            {/* Account list */}
            <div className="space-y-3 mb-6">
                {accounts.length === 0 && (
                    <p className="text-muted-foreground italic text-sm">No accounts yet. Add one below.</p>
                )}
                {accounts.map(account => (
                    <div key={account.id} className="flex items-center gap-3 p-4 rounded-xl bg-background/30 border border-border group">
                        {editingId === account.id ? (
                            <>
                                <input
                                    value={editEmail}
                                    onChange={e => setEditEmail(e.target.value)}
                                    className="flex-1 px-3 py-1.5 rounded-lg bg-background/60 border border-border text-sm outline-none focus:border-primary"
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
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                <span className="flex-1 text-sm font-medium text-foreground truncate">{account.email}</span>
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
                            </>
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
