'use client';

import React, { useState } from 'react';
import { useAppState } from '../context/UserContext';
import { Campaign } from '../types';
import CampaignForm from './CampaignForm';

const DAY_LABELS = { Mon: 'M', Tue: 'T', Wed: 'W', Thu: 'T', Fri: 'F' };

export default function CampaignList() {
    const { currentUserState, deleteCampaign } = useAppState();
    const { campaigns, accounts } = currentUserState;
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [showingForm, setShowingForm] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const getAccountEmails = (ids: string[]) =>
        ids.map(id => accounts.find(a => a.id === id)?.email?.split('@')[1] ?? '?').join(', ');

    if (showingForm || editingCampaign) {
        return (
            <div className="p-8 rounded-2xl glass">
                <h2 className="text-xl font-bold text-foreground mb-6">
                    {editingCampaign ? `Edit: ${editingCampaign.name}` : 'New Campaign'}
                </h2>
                <CampaignForm
                    editing={editingCampaign ?? undefined}
                    onDone={() => { setEditingCampaign(null); setShowingForm(false); }}
                />
            </div>
        );
    }

    return (
        <div className="p-8 rounded-2xl glass">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Campaigns</h2>
                <button
                    onClick={() => setShowingForm(true)}
                    className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
                >
                    + New Campaign
                </button>
            </div>

            {campaigns.length === 0 ? (
                <div className="py-12 text-center">
                    <p className="text-muted-foreground italic text-sm">No campaigns yet.</p>
                    <p className="text-muted-foreground text-xs mt-1">Add a campaign to start planning capacity.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {campaigns.map(c => {
                        const active = Math.max(0, c.leads - c.bounces - c.replies);
                        const isExpanded = expandedIds.has(c.id);
                        return (
                            <div key={c.id} className="rounded-xl bg-background/30 border border-border group hover:border-primary/30 transition-all">
                                {/* Header - always visible */}
                                <button
                                    onClick={() => toggleExpand(c.id)}
                                    className="w-full flex items-center justify-between gap-3 p-4 text-left"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <svg
                                            className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                        <h3 className="font-bold text-foreground text-base truncate">{c.name}</h3>
                                        <span className="text-xs text-muted-foreground flex-shrink-0">
                                            {active.toLocaleString()} active leads
                                        </span>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => setEditingCampaign(c)}
                                            className="px-3 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:text-foreground transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteCampaign(c.id)}
                                            className="px-3 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </button>

                                {/* Expandable details */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 space-y-3">
                                        <p className="text-xs text-muted-foreground">
                                            Starts {new Date(c.startDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {c.emailAccountIds.length > 0 && (
                                                <span className="ml-2 text-primary/70">via {getAccountEmails(c.emailAccountIds)}</span>
                                            )}
                                        </p>

                                        {/* Stats row */}
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
                                            <Stat label="Leads" value={c.leads.toLocaleString()} />
                                            <Stat label="Active" value={active.toLocaleString()} highlight />
                                            <Stat label="Bounces" value={c.bounces} dim={c.bounces === 0} />
                                            <Stat label="Replies" value={c.replies} dim={c.replies === 0} />
                                            <Stat label="Max/Day" value={c.dailyMaxEmails} />
                                            <Stat label="Sequences" value={c.sequences} />
                                        </div>

                                        {/* Send days + interval */}
                                        <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                                            <div className="flex gap-1">
                                                {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const).map(day => (
                                                    <span
                                                        key={day}
                                                        className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${c.sendDays.includes(day)
                                                                ? 'bg-primary/20 text-primary'
                                                                : 'bg-background/30 text-muted-foreground/30'
                                                            }`}
                                                    >
                                                        {DAY_LABELS[day]}
                                                    </span>
                                                ))}
                                            </div>
                                            {c.sequences > 1 && (
                                                <span className="text-xs text-muted-foreground">
                                                    Next msg after <strong className="text-foreground">{c.nextMessageDays}d</strong>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, highlight, dim }: { label: string; value: string | number; highlight?: boolean; dim?: boolean }) {
    return (
        <div className="bg-background/30 rounded-lg p-2">
            <p className={`text-sm font-black ${highlight ? 'text-emerald-400' : dim ? 'text-muted-foreground/40' : 'text-foreground'}`}>
                {value}
            </p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide mt-0.5">{label}</p>
        </div>
    );
}
