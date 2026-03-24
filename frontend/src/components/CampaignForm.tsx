'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from '../context/UserContext';
import { Campaign, SendDay } from '../types';

const ALL_DAYS: SendDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

interface CampaignFormProps {
    editing?: Campaign;
    onDone: () => void;
}

const emptyForm = (): Omit<Campaign, 'id'> => ({
    name: '',
    leads: 0,
    dailyMaxEmails: 50,
    sequences: 1,
    sendDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    nextMessageDays: 3,
    bounces: 0,
    replies: 0,
    emailAccountIds: [],
    startDate: new Date().toISOString().split('T')[0],
    finished: false,
});

export default function CampaignForm({ editing, onDone }: CampaignFormProps) {
    const { currentUserState, addCampaign, updateCampaign } = useAppState();
    const { accounts } = currentUserState;

    const [form, setForm] = useState<Omit<Campaign, 'id'>>(editing ? { ...editing } : emptyForm());

    useEffect(() => {
        setForm(editing ? { ...editing } : emptyForm());
    }, [editing]);

    const toggleDay = (day: SendDay) => {
        setForm(f => ({
            ...f,
            sendDays: f.sendDays.includes(day)
                ? f.sendDays.filter(d => d !== day)
                : [...f.sendDays, day],
        }));
    };

    const toggleAccount = (id: string) => {
        setForm(f => ({
            ...f,
            emailAccountIds: f.emailAccountIds.includes(id)
                ? f.emailAccountIds.filter(a => a !== id)
                : [...f.emailAccountIds, id],
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || form.leads <= 0 || form.sendDays.length === 0) return;
        if (editing) {
            updateCampaign(editing.id, form);
        } else {
            addCampaign(form);
        }
        onDone();
    };

    const num = (val: string) => Math.max(0, parseInt(val) || 0);
    const activeleads = Math.max(0, form.leads - form.bounces - form.replies);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name + Start Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Campaign Name</label>
                    <input
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. SaaS Founders Q2"
                        className="w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Start Date</label>
                    <input
                        type="date"
                        value={form.startDate}
                        onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                </div>
            </div>

            {/* Leads / Bounces / Replies */}
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total Leads</label>
                    <input
                        type="number" min={1} required
                        value={form.leads || ''}
                        onChange={e => setForm(f => ({ ...f, leads: num(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-center"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Bounces</label>
                    <input
                        type="number" min={0}
                        value={form.bounces || ''}
                        onChange={e => setForm(f => ({ ...f, bounces: num(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-center"
                        placeholder="0"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Replies</label>
                    <input
                        type="number" min={0}
                        value={form.replies || ''}
                        onChange={e => setForm(f => ({ ...f, replies: num(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-center"
                        placeholder="0"
                    />
                </div>
            </div>

            {/* Active leads indicator */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">
                    Active leads: <strong>{activeleads.toLocaleString()}</strong>
                    <span className="text-muted-foreground font-normal ml-1">({form.leads} − {form.bounces} bounces − {form.replies} replies)</span>
                </span>
            </div>

            {/* Daily max + Sequences + Interval */}
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Daily Max Emails</label>
                    <input
                        type="number" min={1} required
                        value={form.dailyMaxEmails || ''}
                        onChange={e => setForm(f => ({ ...f, dailyMaxEmails: num(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-center"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Sequences</label>
                    <input
                        type="number" min={1}
                        value={form.sequences || ''}
                        onChange={e => setForm(f => ({ ...f, sequences: Math.max(1, num(e.target.value)) }))}
                        className="w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-center"
                    />
                    <p className="text-[10px] text-muted-foreground">1 = first outreach only</p>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Next Msg (days)</label>
                    <input
                        type="number" min={1}
                        value={form.nextMessageDays || ''}
                        onChange={e => setForm(f => ({ ...f, nextMessageDays: Math.max(1, num(e.target.value)) }))}
                        className="w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-center"
                    />
                    <p className="text-[10px] text-muted-foreground">calendar days between seqs</p>
                </div>
            </div>

            {/* Send Days */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Send Days</label>
                <div className="flex gap-2">
                    {ALL_DAYS.map(day => (
                        <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${form.sendDays.includes(day)
                                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                                    : 'bg-background/50 text-muted-foreground border-border hover:border-primary/40'
                                }`}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>

            {/* Email Accounts */}
            {accounts.length > 0 && (
                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Email Accounts</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {accounts.map(account => (
                            <button
                                key={account.id}
                                type="button"
                                onClick={() => toggleAccount(account.id)}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border text-left ${form.emailAccountIds.includes(account.id)
                                        ? 'bg-primary/10 border-primary/40 text-foreground'
                                        : 'bg-background/50 border-border text-muted-foreground hover:border-primary/30'
                                    }`}
                            >
                                <div className={`w-3 h-3 rounded border-2 flex-shrink-0 flex items-center justify-center ${form.emailAccountIds.includes(account.id) ? 'border-primary bg-primary' : 'border-muted-foreground'
                                    }`}>
                                    {form.emailAccountIds.includes(account.id) && (
                                        <svg className="w-2 h-2 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <span className="truncate flex-1">{account.email}</span>
                                <span className="text-xs font-bold text-primary whitespace-nowrap">{account.dailyLimit}/d</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
                >
                    {editing ? 'Update Campaign' : 'Add Campaign'}
                </button>
                <button
                    type="button"
                    onClick={onDone}
                    className="px-6 py-3 rounded-xl bg-muted text-muted-foreground font-bold text-sm hover:text-foreground transition-all"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
