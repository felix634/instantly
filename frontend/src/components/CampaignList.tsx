'use client';

import React, { useMemo, useState } from 'react';
import { useAppState } from '../context/UserContext';
import { Campaign } from '../types';
import CampaignForm from './CampaignForm';
import { addDays, getMonday, mondayISO, toISODate } from '../lib/weekUtils';

const DAY_LABELS = { Mon: 'M', Tue: 'T', Wed: 'W', Thu: 'T', Fri: 'F' };

export default function CampaignList() {
    const { currentUserState, deleteCampaign, updateCampaign } = useAppState();
    const { campaigns, accounts } = currentUserState;
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [showingForm, setShowingForm] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const activeCampaigns = campaigns.filter(c => !c.finished);

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
                <h2 className="text-xl font-bold text-foreground">Active Campaigns</h2>
                <button
                    onClick={() => setShowingForm(true)}
                    className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
                >
                    + New Campaign
                </button>
            </div>

            {activeCampaigns.length === 0 ? (
                <div className="py-12 text-center">
                    <p className="text-muted-foreground italic text-sm">No active campaigns.</p>
                    <p className="text-muted-foreground text-xs mt-1">Add a campaign to start planning capacity.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeCampaigns.map(c => (
                        <CampaignCard
                            key={c.id}
                            campaign={c}
                            isExpanded={expandedIds.has(c.id)}
                            onToggle={() => toggleExpand(c.id)}
                            getAccountEmails={getAccountEmails}
                            onEdit={() => setEditingCampaign(c)}
                            onDelete={() => deleteCampaign(c.id)}
                            onFinish={() => updateCampaign(c.id, { finished: true })}
                            onUpdate={(data) => updateCampaign(c.id, data)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function FinishedCampaigns() {
    const { currentUserState, deleteCampaign, updateCampaign } = useAppState();
    const { campaigns, accounts } = currentUserState;
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const finishedCampaigns = campaigns.filter(c => c.finished);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const getAccountEmails = (ids: string[]) =>
        ids.map(id => accounts.find(a => a.id === id)?.email?.split('@')[1] ?? '?').join(', ');

    if (finishedCampaigns.length === 0) return null;

    return (
        <div className="p-8 rounded-2xl glass">
            <h2 className="text-xl font-bold text-foreground mb-6">
                Finished Campaigns
                <span className="text-muted-foreground font-medium text-sm ml-2">({finishedCampaigns.length})</span>
            </h2>
            <div className="space-y-4">
                {finishedCampaigns.map(c => (
                    <CampaignCard
                        key={c.id}
                        campaign={c}
                        isExpanded={expandedIds.has(c.id)}
                        onToggle={() => toggleExpand(c.id)}
                        getAccountEmails={getAccountEmails}
                        onDelete={() => deleteCampaign(c.id)}
                        onReactivate={() => updateCampaign(c.id, { finished: false })}
                        onUpdate={(data) => updateCampaign(c.id, data)}
                    />
                ))}
            </div>
        </div>
    );
}

function formatWeekRange(monday: Date): string {
    const fri = addDays(monday, 4);
    const sameMonth = monday.getMonth() === fri.getMonth();
    const m = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const f = sameMonth
        ? fri.toLocaleDateString('en-GB', { day: 'numeric' })
        : fri.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${m}–${f}`;
}

function CampaignCard({
    campaign: c,
    isExpanded,
    onToggle,
    getAccountEmails,
    onEdit,
    onDelete,
    onFinish,
    onReactivate,
    onUpdate,
}: {
    campaign: Campaign;
    isExpanded: boolean;
    onToggle: () => void;
    getAccountEmails: (ids: string[]) => string;
    onEdit?: () => void;
    onDelete: () => void;
    onFinish?: () => void;
    onReactivate?: () => void;
    onUpdate: (data: Partial<Omit<Campaign, 'id'>>) => void;
}) {
    const active = Math.max(0, c.leads - c.bounces - c.replies - c.unsubscribed);

    // Generate the next 4 weeks of Mondays for quick toggling
    const upcomingWeeks = useMemo(() => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const startMon = getMonday(today);
        return Array.from({ length: 4 }, (_, i) => addDays(startMon, i * 7));
    }, []);

    const todayMondayISO = mondayISO(new Date());
    const isPausedThisWeek = c.pausedWeeks.includes(todayMondayISO);

    const togglePauseWeek = (mondayDate: Date) => {
        const iso = toISODate(mondayDate);
        const next = c.pausedWeeks.includes(iso)
            ? c.pausedWeeks.filter(w => w !== iso)
            : [...c.pausedWeeks, iso].sort();
        onUpdate({ pausedWeeks: next });
    };

    // Sorted paused-weeks (drop entries from the past for display sanity)
    const visiblePausedWeeks = useMemo(() => {
        const todayMon = mondayISO(new Date());
        return [...c.pausedWeeks].filter(w => w >= todayMon).sort();
    }, [c.pausedWeeks]);

    return (
        <div className={`rounded-xl bg-background/30 border group hover:border-primary/30 transition-all ${isPausedThisWeek ? 'border-amber-500/40' : 'border-border'}`}>
            {/* Header - always visible */}
            <button
                onClick={onToggle}
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
                    {isPausedThisWeek && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                            ⏸ Paused this week
                        </span>
                    )}
                    {!isPausedThisWeek && visiblePausedWeeks.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80 border border-amber-500/30 text-[10px] font-bold flex-shrink-0">
                            {visiblePausedWeeks.length} paused week{visiblePausedWeeks.length === 1 ? '' : 's'}
                        </span>
                    )}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {onReactivate && (
                        <button
                            onClick={onReactivate}
                            className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                        >
                            Reactivate
                        </button>
                    )}
                    {onFinish && (
                        <button
                            onClick={onFinish}
                            className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors"
                        >
                            Finished
                        </button>
                    )}
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="px-3 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:text-foreground transition-colors"
                        >
                            Edit
                        </button>
                    )}
                    <button
                        onClick={onDelete}
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
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 text-center">
                        <Stat label="Leads" value={c.leads.toLocaleString()} />
                        <Stat label="Active" value={active.toLocaleString()} highlight />
                        <Stat label="Bounces" value={c.bounces} dim={c.bounces === 0} />
                        <Stat label="Replies" value={c.replies} dim={c.replies === 0} />
                        <Stat label="Unsub" value={c.unsubscribed} dim={c.unsubscribed === 0} />
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

                    {/* Weekly pause controls */}
                    {!onReactivate && (
                        <div className="pt-3 border-t border-border/50 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                    Pause Weeks
                                </label>
                                <span className="text-[10px] text-muted-foreground italic">
                                    Click a week to skip sending. Sequences resume next week.
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {upcomingWeeks.map((mon, i) => {
                                    const iso = toISODate(mon);
                                    const paused = c.pausedWeeks.includes(iso);
                                    const label = i === 0 ? 'This week' : i === 1 ? 'Next week' : formatWeekRange(mon);
                                    return (
                                        <button
                                            key={iso}
                                            onClick={() => togglePauseWeek(mon)}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${paused
                                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                                : 'bg-background/40 border-border text-muted-foreground hover:border-amber-500/40 hover:text-amber-400'
                                                }`}
                                            title={paused ? `Resume sends for week of ${formatWeekRange(mon)}` : `Pause week of ${formatWeekRange(mon)}`}
                                        >
                                            {paused && <span className="mr-1">⏸</span>}
                                            {label}
                                            <span className="ml-1.5 opacity-60 font-normal">{formatWeekRange(mon)}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Show any further-out paused weeks (beyond the 4-week quick row) */}
                            {visiblePausedWeeks.filter(iso => !upcomingWeeks.some(m => toISODate(m) === iso)).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground self-center">Also paused:</span>
                                    {visiblePausedWeeks
                                        .filter(iso => !upcomingWeeks.some(m => toISODate(m) === iso))
                                        .map(iso => {
                                            const mon = new Date(iso + 'T12:00:00');
                                            return (
                                                <button
                                                    key={iso}
                                                    onClick={() => togglePauseWeek(mon)}
                                                    className="px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold hover:bg-amber-500/25 transition-colors"
                                                    title="Click to resume this week"
                                                >
                                                    ⏸ {formatWeekRange(mon)} ✕
                                                </button>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    )}
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
