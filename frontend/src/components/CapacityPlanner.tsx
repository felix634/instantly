'use client';

import React, { useMemo } from 'react';
import { useAppState } from '../context/UserContext';
import { Campaign, DailyCapacity, SendDay } from '../types';

const WEEKDAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', '', ''];

/** Returns ISO date string (YYYY-MM-DD) for a Date */
function toISO(d: Date) {
    return d.toISOString().split('T')[0];
}

/** Advance a Date by N calendar days */
function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

/** Get the day-of-week number (1=Mon...5=Fri, 0=Sun, 6=Sat) in terms of JS getDay() */
function jsDay(d: Date) { return d.getDay(); } // 0=Sun, 1=Mon ... 6=Sat

/** Is this date a weekday? */
function isWeekday(d: Date) { const j = jsDay(d); return j >= 1 && j <= 5; }

/** Is this date a campaign send day? */
function isCampaignDay(d: Date, sendDays: SendDay[]): boolean {
    const j = jsDay(d); // 1=Mon...5=Fri
    const dayName = WEEKDAY_NAMES[j] as SendDay;
    return sendDays.includes(dayName);
}

/**
 * Get next valid send day >= startDate for a campaign.
 * Returns null if no valid send day found (shouldn't happen with Mon-Fri campaigns).
 */
function nextSendDay(startDate: Date, sendDays: SendDay[]): Date | null {
    let d = new Date(startDate);
    for (let i = 0; i < 14; i++) {
        if (isCampaignDay(d, sendDays)) return d;
        d = addDays(d, 1);
    }
    return null;
}

/**
 * Given the send date of sequence K, compute the send date of sequence K+1:
 * - Add nextMessageDays calendar days
 * - Then advance to the next valid campaign send day
 */
function nextSequenceDate(prevDate: Date, nextMessageDays: number, sendDays: SendDay[]): Date | null {
    const candidate = addDays(prevDate, nextMessageDays);
    return nextSendDay(candidate, sendDays);
}

/**
 * Build a map: isoDate -> demand contributed by this campaign on that date.
 * The demand on a given date = min(dailyMaxEmails, active leads) but only 
 * if a sequence is sending on that date.
 *
 * For simplicity: each sequence sends to ALL active leads on its send date,
 * throttled by dailyMaxEmails. The planner shows total emails sent per day.
 */
function computeCampaignSchedule(
    campaign: Campaign,
    windowDates: string[],
): Map<string, number> {
    const result = new Map<string, number>();
    const windowSet = new Set(windowDates);
    const activeLeads = Math.max(0, campaign.leads - campaign.bounces - campaign.replies);
    if (activeLeads === 0 || campaign.sendDays.length === 0) return result;

    const startDate = new Date(campaign.startDate + 'T12:00:00');
    let seqDate = nextSendDay(startDate, campaign.sendDays);

    for (let seq = 1; seq <= campaign.sequences; seq++) {
        if (!seqDate) break;
        const iso = toISO(seqDate);
        if (windowSet.has(iso)) {
            const demand = Math.min(campaign.dailyMaxEmails, activeLeads);
            result.set(iso, (result.get(iso) ?? 0) + demand);
        }
        if (seq < campaign.sequences) {
            seqDate = nextSequenceDate(seqDate, campaign.nextMessageDays, campaign.sendDays);
        }
    }
    return result;
}

/** Get the next 15 weekdays (Mon-Fri) starting from today */
function getNext3WeeksWeekdays(today: Date): Date[] {
    const days: Date[] = [];
    let d = new Date(today);
    while (days.length < 15) {
        if (isWeekday(d)) days.push(new Date(d));
        d = addDays(d, 1);
    }
    return days;
}

function usageColor(pct: number): string {
    if (pct >= 90) return 'bg-red-500/70 border-red-400/50 text-white';
    if (pct >= 70) return 'bg-orange-500/60 border-orange-400/40 text-white';
    if (pct >= 30) return 'bg-primary/50 border-primary/40 text-white';
    if (pct > 0) return 'bg-emerald-500/50 border-emerald-400/40 text-white';
    return 'bg-background/20 border-border text-muted-foreground';
}

function usageBadgeColor(pct: number): string {
    if (pct >= 90) return 'text-red-400';
    if (pct >= 70) return 'text-orange-400';
    return 'text-emerald-400';
}

/** Get the Monday of the week for a given date */
function getStartMonday(d: Date): Date {
    const day = d.getDay(); // 0 = Sun, 1 = Mon ...
    const result = new Date(d);
    // If Sunday(0), go back 6 days to prev Mon. If Sat(6), go back 5. 
    // Generally: if j > 0, go back (j-1). If j=0, go back 6.
    const diff = day === 0 ? 6 : day - 1;
    result.setDate(d.getDate() - diff);
    result.setHours(12, 0, 0, 0);
    return result;
}

/** Get the next 21 calendar days starting from a specific Monday */
function get3WeeksDates(startMonday: Date): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 21; i++) {
        dates.push(addDays(startMonday, i));
    }
    return dates;
}

export default function CapacityPlanner() {
    const { currentUserState } = useAppState();
    const { campaigns, accounts } = currentUserState;

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        return d;
    }, []);

    const startMonday = useMemo(() => getStartMonday(today), [today]);
    const allDates = useMemo(() => get3WeeksDates(startMonday), [startMonday]);

    // Map accountId -> dailyLimit for fast lookup
    const accountLimitMap = useMemo(() => {
        const m = new Map<string, number>();
        accounts.forEach(a => m.set(a.id, a.dailyLimit));
        return m;
    }, [accounts]);

    // GLOBAL SIMULATION
    const dailyData: DailyCapacity[] = useMemo(() => {
        // State for simulation
        const pendingEmails = new Map<string, number>(); // campaignId -> remaining emails to send
        const campaignSequences = new Map<string, number>(); // campaignId -> current sequence index
        const campaignNextSendDate = new Map<string, string>(); // campaignId -> ISO date of next allowed sequence start

        // Initialize campaign states
        campaigns.forEach(c => {
            pendingEmails.set(c.id, 0);
            campaignSequences.set(c.id, 1);
            const firstDate = nextSendDay(new Date(c.startDate + 'T12:00:00'), c.sendDays);
            if (firstDate) campaignNextSendDate.set(c.id, toISO(firstDate));
        });

        const simulationResults: DailyCapacity[] = [];

        // We simulate day by day for the 3-week window
        allDates.forEach(date => {
            const iso = toISO(date);
            const jsD = jsDay(date);
            const dayName = WEEKDAY_NAMES[jsD] as SendDay;
            const isSendDayForAny = isWeekday(date);

            const campaignBreakdown: DailyCapacity['campaignBreakdown'] = [];
            let totalEmailsRequestedToday = 0;

            // Total account capacity for TODAY
            // Sum of accounts used by ANY campaign active today
            const accountsUsedToday = new Set<string>();
            campaigns.forEach(c => {
                if (c.sendDays.includes(dayName)) {
                    c.emailAccountIds.forEach(id => accountsUsedToday.add(id));
                }
            });

            let totalAccountCapacity: number;
            if (accounts.length === 0) {
                totalAccountCapacity = 0;
            } else if (accountsUsedToday.size === 0) {
                totalAccountCapacity = accounts.reduce((s, a) => s + a.dailyLimit, 0);
            } else {
                totalAccountCapacity = [...accountsUsedToday].reduce((s, id) => s + (accountLimitMap.get(id) ?? 0), 0);
            }

            if (isSendDayForAny) {
                // 1. Process new sequences arriving today
                campaigns.forEach(c => {
                    if (campaignNextSendDate.get(c.id) === iso) {
                        const activeLeads = Math.max(0, c.leads - c.bounces - c.replies);
                        // Add full sequence batch to pending emails
                        pendingEmails.set(c.id, (pendingEmails.get(c.id) ?? 0) + activeLeads);

                        // Schedule next sequence
                        const currentSeq = campaignSequences.get(c.id) ?? 1;
                        if (currentSeq < c.sequences) {
                            const nextDate = nextSequenceDate(date, c.nextMessageDays, c.sendDays);
                            if (nextDate) {
                                campaignSequences.set(c.id, currentSeq + 1);
                                campaignNextSendDate.set(c.id, toISO(nextDate));
                            }
                        } else {
                            campaignNextSendDate.delete(c.id);
                        }
                    }
                });

                // 2. Identify how many emails each campaign WANTS to send today
                // Each campaign is limited by its own dailyMaxEmails AND its pendingEmails
                const campaignRequests: { id: string, name: string, amount: number }[] = [];
                campaigns.forEach(c => {
                    const pending = pendingEmails.get(c.id) ?? 0;
                    if (pending > 0 && c.sendDays.includes(dayName)) {
                        const amount = Math.min(pending, c.dailyMaxEmails);
                        campaignRequests.push({ id: c.id, name: c.name, amount });
                        totalEmailsRequestedToday += amount;
                    }
                });

                // 3. Handle Capacity - If total > capacity, scale down
                const scaleFactor = totalAccountCapacity > 0 && totalEmailsRequestedToday > totalAccountCapacity
                    ? totalAccountCapacity / totalEmailsRequestedToday
                    : 1;

                let totalSentToday = 0;
                campaignRequests.forEach(req => {
                    const sent = Math.floor(req.amount * scaleFactor);
                    if (sent > 0) {
                        campaignBreakdown.push({ campaignId: req.id, campaignName: req.name, demand: sent });
                        totalSentToday += sent;
                        // Deduct from pendingEmails
                        pendingEmails.set(req.id, (pendingEmails.get(req.id) ?? 0) - sent);
                    }
                });

                const usagePercent = totalAccountCapacity > 0
                    ? Math.round((totalSentToday / totalAccountCapacity) * 100)
                    : totalSentToday > 0 ? 100 : 0;

                simulationResults.push({
                    date: iso,
                    dayLabel: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
                    totalAccountCapacity,
                    totalEmailDemand: totalSentToday,
                    usagePercent,
                    campaignBreakdown,
                });
            } else {
                // Weekend - no sending, skip result object? 
                // The grid expects 15-21 days. We include weekends for UI consistency but mark them empty.
                simulationResults.push({
                    date: iso,
                    dayLabel: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
                    totalAccountCapacity: 0,
                    totalEmailDemand: 0,
                    usagePercent: 0,
                    campaignBreakdown: [],
                });
            }
        });

        return simulationResults;
    }, [allDates, campaigns, accounts, accountLimitMap]);

    // Group into 3 weeks of 7 days (including weekends) or filter to 5 days?
    // User wants "start with monday and finish with friday". 
    // Filtering weekends from the display grid:
    const displayGrid = useMemo(() => {
        const weeks: DailyCapacity[][] = [];
        for (let i = 0; i < 3; i++) {
            const start = i * 7;
            weeks.push(dailyData.slice(start, start + 5)); // Mon-Fri
        }
        return weeks;
    }, [dailyData]);

    const hasAnyDemand = dailyData.some(d => d.totalEmailDemand > 0);

    return (
        <div className="space-y-6">
            <div className="p-8 rounded-2xl glass">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">3-Week Capacity Plan</h2>
                        <p className="text-sm text-muted-foreground mt-1">Mon–Fri, next 3 weeks</p>
                    </div>
                    {/* Legend */}
                    <div className="flex gap-3 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500/50" /><span>Low</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary/50" /><span>Good</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-orange-500/60" /><span>High</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500/70" /><span>Over</span></div>
                    </div>
                </div>

                {/* Calendar grid - 3 rows of 5 */}
                <div className="space-y-3">
                    {displayGrid.map((week, wi) => (
                        <div key={wi} className="grid grid-cols-5 gap-3">
                            {week.map((day) => (
                                <div
                                    key={day.date}
                                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all hover:scale-[1.03] cursor-default ${usageColor(day.usagePercent)}`}
                                    title={`Capacity: ${day.totalAccountCapacity} | Demand: ${day.totalEmailDemand}`}
                                >
                                    <span className="text-[10px] font-bold uppercase opacity-80">
                                        {day.dayLabel.split(' ')[0]}
                                    </span>
                                    <span className="text-xs font-medium opacity-70">
                                        {day.dayLabel.split(' ').slice(1).join(' ')}
                                    </span>
                                    <span className="text-2xl font-black mt-1">
                                        {day.usagePercent > 0 ? `${day.usagePercent}%` : '—'}
                                    </span>
                                    {day.totalEmailDemand > 0 && (
                                        <span className="text-[10px] opacity-60 font-medium">
                                            {day.totalEmailDemand}/{day.totalAccountCapacity}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Per-day campaign breakdown */}
            {hasAnyDemand && (
                <div className="p-8 rounded-2xl glass">
                    <h3 className="text-lg font-bold text-foreground mb-6">Daily Breakdown by Campaign</h3>
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                        {dailyData.filter(d => d.totalEmailDemand > 0).map(day => (
                            <div key={day.date} className="p-4 rounded-xl bg-background/30 border border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-foreground">{day.dayLabel}</span>
                                    <span className={`text-sm font-black ${usageBadgeColor(day.usagePercent)}`}>
                                        {day.totalEmailDemand} <span className="text-muted-foreground font-normal text-xs">/ {day.totalAccountCapacity} cap</span>
                                        <span className="ml-2">({day.usagePercent}%)</span>
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {day.campaignBreakdown.map(cb => (
                                        <div key={cb.campaignId} className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                                            <span className="flex-1 truncate">{cb.campaignName}</span>
                                            <span className="font-bold text-foreground">{cb.demand} emails</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Usage bar */}
                                <div className="mt-3 h-1.5 rounded-full bg-background/50 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${day.usagePercent >= 90 ? 'bg-red-500' :
                                            day.usagePercent >= 70 ? 'bg-orange-500' : 'bg-primary'
                                            }`}
                                        style={{ width: `${Math.min(100, day.usagePercent)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!hasAnyDemand && campaigns.length > 0 && (
                <div className="p-6 rounded-2xl glass text-center">
                    <p className="text-muted-foreground text-sm italic">
                        No email sending scheduled in the next 3 weeks based on current campaign start dates and sequences.
                    </p>
                </div>
            )}
        </div>
    );
}
