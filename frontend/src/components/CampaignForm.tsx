'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../context/UserContext';
import { Campaign, SendDay } from '../types';
import { tagColorClass } from './AccountsManager';

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
    unsubscribed: 0,
    emailAccountIds: [],
    startDate: new Date().toISOString().split('T')[0],
    finished: false,
    pausedWeeks: [],
});

export default function CampaignForm({ editing, onDone }: CampaignFormProps) {
    const { currentUserState, addCampaign, updateCampaign } = useAppState();
    const { accounts, tags } = currentUserState;

    const [form, setForm] = useState<Omit<Campaign, 'id'>>(editing ? { ...editing } : emptyForm());

    useEffect(() => {
        setForm(editing ? { ...editing } : emptyForm());
    }, [editing]);

    // Tag → accounts that have it
    const accountsByTag = useMemo(() => {
        const map = new Map<string, string[]>();
        tags.forEach(t => map.set(t.id, accounts.filter(a => a.tagIds.includes(t.id)).map(a => a.id)));
        return map;
    }, [tags, accounts]);

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

    const toggleTag = (tagId: string) => {
        const tagAccountIds = accountsByTag.get(tagId) || [];
        if (tagAccountIds.length === 0) return;
        setForm(f => {
            const allSelected = tagAccountIds.every(id => f.emailAccountIds.includes(id));
            const next = allSelected
                ? f.emailAccountIds.filter(id => !tagAccountIds.includes(id))
                : Array.from(new Set([...f.emailAccountIds, ...tagAccountIds]));
            return { ...f, emailAccountIds: next };
        });
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
    const activeleads = Math.max(0, form.leads - form.bounces - form.replies - form.unsubscribed);

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

            {/* Leads / Bounces / Replies / Unsubscribed */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Unsubscribed</label>
                    <input
                        type="number" min={0}
                        value={form.unsubscribed || ''}
                        onChange={e => setForm(f => ({ ...f, unsubscribed: num(e.target.value) }))}
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
                    <span className="text-muted-foreground font-normal ml-1">({form.leads} − {form.bounces} bounces − {form.replies} replies − {form.unsubscribed} unsub)</span>
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
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Email Accounts</label>
                        <button
                            type="button"
                            onClick={() => {
                                const allIds = accounts.map(a => a.id);
                                const allSelected = allIds.every(id => form.emailAccountIds.includes(id));
                                setForm(f => ({ ...f, emailAccountIds: allSelected ? [] : allIds }));
                            }}
                            className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                        >
                            {accounts.every(a => form.emailAccountIds.includes(a.id)) ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>

                    {/* Tag quick-pick */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-background/30 border border-border">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground self-center mr-1">By tag:</span>
                            {tags.map(tag => {
                                const tagAccountIds = accountsByTag.get(tag.id) || [];
                                if (tagAccountIds.length === 0) {
                                    return (
                                        <span
                                            key={tag.id}
                                            className={`px-2.5 py-1 rounded-md border text-[11px] font-bold opacity-30 ${tagColorClass(tag.color)}`}
                                            title="No accounts assigned to this tag"
                                        >
                                            {tag.name} <span className="font-normal opacity-60">0</span>
                                        </span>
                                    );
                                }
                                const allOn = tagAccountIds.every(id => form.emailAccountIds.includes(id));
                                const someOn = !allOn && tagAccountIds.some(id => form.emailAccountIds.includes(id));
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleTag(tag.id)}
                                        className={`px-2.5 py-1 rounded-md border text-[11px] font-bold transition-all ${tagColorClass(tag.color, allOn || someOn)} ${allOn ? 'ring-1 ring-foreground/40' : someOn ? 'ring-1 ring-foreground/20' : 'opacity-60 hover:opacity-100'}`}
                                        title={allOn ? 'Deselect all in this tag' : 'Select all in this tag'}
                                    >
                                        {tag.name} <span className="font-normal opacity-70">{tagAccountIds.length}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

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
                                {account.tagIds.length > 0 && (
                                    <span className="flex gap-1 flex-shrink-0">
                                        {account.tagIds.slice(0, 2).map(tid => {
                                            const tag = tags.find(t => t.id === tid);
                                            if (!tag) return null;
                                            return (
                                                <span key={tid} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${tagColorClass(tag.color)}`}>
                                                    {tag.name}
                                                </span>
                                            );
                                        })}
                                    </span>
                                )}
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
