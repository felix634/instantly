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

export default function CapacityPlanner() {
    const { currentUserState } = useAppState();
    const { campaigns, accounts } = currentUserState;

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        return d;
    }, []);

    const weekdays = useMemo(() => getNext3WeeksWeekdays(today), []);
    const windowISO = useMemo(() => weekdays.map(toISO), [weekdays]);

    // Map accountId -> dailyLimit for fast lookup
    const accountLimitMap = useMemo(() => {
        const m = new Map<string, number>();
        accounts.forEach(a => m.set(a.id, a.dailyLimit));
        return m;
    }, [accounts]);

    // Build daily capacity data
    const dailyData: DailyCapacity[] = useMemo(() => {
        return weekdays.map((date, i) => {
            const iso = windowISO[i];
            const jsD = jsDay(date);
            const dayName = WEEKDAY_NAMES[jsD] as SendDay;

            // Total account capacity: sum of accounts that are used by ANY campaign
            // that sends on this day. If no campaigns, show total of all accounts.
            const campaignsSendingToday = campaigns.filter(c => c.sendDays.includes(dayName));
            const accountsUsedToday = new Set<string>();
            campaignsSendingToday.forEach(c => c.emailAccountIds.forEach(id => accountsUsedToday.add(id)));

            let totalAccountCapacity: number;
            if (campaigns.length === 0) {
                totalAccountCapacity = accounts.reduce((s, a) => s + a.dailyLimit, 0);
            } else if (accountsUsedToday.size === 0) {
                // Show total capacity even if no accounts specifically assigned
                totalAccountCapacity = accounts.reduce((s, a) => s + a.dailyLimit, 0);
            } else {
                totalAccountCapacity = [...accountsUsedToday].reduce((s, id) => s + (accountLimitMap.get(id) ?? 0), 0);
            }

            // Per-campaign demand for this date
            const campaignBreakdown: DailyCapacity['campaignBreakdown'] = [];
            let totalDemand = 0;

            campaigns.forEach(c => {
                const schedule = computeCampaignSchedule(c, windowISO);
                const demand = schedule.get(iso) ?? 0;
                if (demand > 0) {
                    campaignBreakdown.push({ campaignId: c.id, campaignName: c.name, demand });
                    totalDemand += demand;
                }
            });

            const usagePercent = totalAccountCapacity > 0
                ? Math.round((totalDemand / totalAccountCapacity) * 100)
                : totalDemand > 0 ? 100 : 0;

            return {
                date: iso,
                dayLabel: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
                totalAccountCapacity,
                totalEmailDemand: totalDemand,
                usagePercent,
                campaignBreakdown,
            };
        });
    }, [weekdays, windowISO, campaigns, accounts, accountLimitMap]);

    // Group into 3 weeks of 5 days
    const weeks = [dailyData.slice(0, 5), dailyData.slice(5, 10), dailyData.slice(10, 15)];

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
                    {weeks.map((week, wi) => (
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
