'use client';

import React, { useState } from 'react';
import { useAppState } from '../context/UserContext';
import AccountsManager from '../components/AccountsManager';
import CampaignList, { FinishedCampaigns } from '../components/CampaignList';
import CapacityPlanner from '../components/CapacityPlanner';
import { Campaign } from '../types';

export default function Home() {
  const { user, setUser, currentUserState, isLoading } = useAppState();
  const { accounts, campaigns } = currentUserState;
  const [showAnalytics, setShowAnalytics] = useState(false);

  const totalCapacity = accounts.reduce((s, a) => s + a.dailyLimit, 0);
  const activeCampaigns = campaigns.filter(c => !c.finished).length;

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm font-medium">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-foreground tracking-tight">Campaign Planner</h1>
          <p className="text-muted-foreground text-base">Manual email capacity planning · Mon–Fri schedules</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Analytics Button */}
          <button
            onClick={() => setShowAnalytics(true)}
            className="px-5 py-2.5 rounded-xl glass text-sm font-bold text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </button>
          {/* User Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl glass w-full md:w-auto">
            {(['felix', 'arpi'] as const).map(u => (
              <button
                key={u}
                onClick={() => setUser(u)}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${user === u
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {u === 'felix' ? 'Félix' : 'Árpi'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        <QuickStat label="Email Accounts" value={accounts.length} sub={`${totalCapacity} emails/day capacity`} />
        <QuickStat label="Campaigns" value={activeCampaigns} sub="in planner" />
        <QuickStat label="Daily Capacity" value={totalCapacity} sub="across all accounts" accent />
      </div>

      {/* Main content — two column on large screens */}
      <div className="space-y-8">
        {/* Row 1: Accounts + Campaigns */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <AccountsManager />
          <CampaignList />
        </div>

        {/* Row 2: Capacity Planner full width */}
        <CapacityPlanner />

        {/* Row 3: Finished Campaigns */}
        <FinishedCampaigns />
      </div>

      {/* Analytics Modal */}
      {showAnalytics && (
        <AnalyticsModal campaigns={campaigns} onClose={() => setShowAnalytics(false)} />
      )}
    </main>
  );
}

function AnalyticsModal({ campaigns, onClose }: { campaigns: Campaign[]; onClose: () => void }) {
  const allCampaigns = campaigns;
  const activeCampaigns = campaigns.filter(c => !c.finished);
  const finishedCampaigns = campaigns.filter(c => c.finished);

  const totals = allCampaigns.reduce(
    (acc, c) => ({
      leads: acc.leads + c.leads,
      bounces: acc.bounces + c.bounces,
      replies: acc.replies + c.replies,
      unsubscribed: acc.unsubscribed + c.unsubscribed,
    }),
    { leads: 0, bounces: 0, replies: 0, unsubscribed: 0 }
  );

  const activeLeads = Math.max(0, totals.leads - totals.bounces - totals.replies - totals.unsubscribed);
  const bounceRate = totals.leads > 0 ? (totals.bounces / totals.leads) * 100 : 0;
  const replyRate = totals.leads > 0 ? (totals.replies / totals.leads) * 100 : 0;
  const unsubRate = totals.leads > 0 ? (totals.unsubscribed / totals.leads) * 100 : 0;
  const activeRate = totals.leads > 0 ? (activeLeads / totals.leads) * 100 : 0;
  // Reply rate excluding bounced/unsubscribed (effective reply rate)
  const deliveredLeads = totals.leads - totals.bounces;
  const effectiveReplyRate = deliveredLeads > 0 ? (totals.replies / deliveredLeads) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl glass border border-border p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-foreground">Analytics Overview</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Campaign counts */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-background/30 text-center">
            <p className="text-2xl font-black text-foreground">{allCampaigns.length}</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mt-1">Total Campaigns</p>
          </div>
          <div className="p-4 rounded-xl bg-background/30 text-center">
            <p className="text-2xl font-black text-emerald-400">{activeCampaigns.length}</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mt-1">Active</p>
          </div>
          <div className="p-4 rounded-xl bg-background/30 text-center">
            <p className="text-2xl font-black text-muted-foreground">{finishedCampaigns.length}</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mt-1">Finished</p>
          </div>
        </div>

        {/* Lead totals */}
        <h3 className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-3">Lead Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-background/30 text-center">
            <p className="text-xl font-black text-foreground">{totals.leads.toLocaleString()}</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mt-1">Total Leads</p>
          </div>
          <div className="p-4 rounded-xl bg-background/30 text-center">
            <p className="text-xl font-black text-emerald-400">{activeLeads.toLocaleString()}</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mt-1">Active</p>
          </div>
          <div className="p-4 rounded-xl bg-background/30 text-center">
            <p className="text-xl font-black text-red-400">{totals.bounces.toLocaleString()}</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mt-1">Bounced</p>
          </div>
          <div className="p-4 rounded-xl bg-background/30 text-center">
            <p className="text-xl font-black text-blue-400">{totals.replies.toLocaleString()}</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mt-1">Replied</p>
          </div>
          <div className="p-4 rounded-xl bg-background/30 text-center">
            <p className="text-xl font-black text-amber-400">{totals.unsubscribed.toLocaleString()}</p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mt-1">Unsubscribed</p>
          </div>
        </div>

        {/* Rates */}
        <h3 className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-3">Rates</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <RateCard label="Reply Rate" value={replyRate} color="text-blue-400" description="Replies / Total Leads" />
          <RateCard label="Effective Reply Rate" value={effectiveReplyRate} color="text-blue-300" description="Replies / Delivered Leads" />
          <RateCard label="Bounce Rate" value={bounceRate} color="text-red-400" description="Bounces / Total Leads" />
          <RateCard label="Unsubscribe Rate" value={unsubRate} color="text-amber-400" description="Unsubs / Total Leads" />
          <RateCard label="Active Lead Rate" value={activeRate} color="text-emerald-400" description="Still contactable" />
          <RateCard label="Lead Loss Rate" value={totals.leads > 0 ? ((totals.bounces + totals.unsubscribed) / totals.leads) * 100 : 0} color="text-red-300" description="Bounced + Unsubscribed" />
        </div>

        {/* Per-campaign breakdown */}
        {allCampaigns.length > 0 && (
          <>
            <h3 className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-3">Per Campaign</h3>
            <div className="space-y-2">
              {allCampaigns.map(c => {
                const cActive = Math.max(0, c.leads - c.bounces - c.replies - c.unsubscribed);
                const cReplyRate = c.leads > 0 ? (c.replies / c.leads) * 100 : 0;
                const cBounceRate = c.leads > 0 ? (c.bounces / c.leads) * 100 : 0;
                const cUnsubRate = c.leads > 0 ? (c.unsubscribed / c.leads) * 100 : 0;
                return (
                  <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl bg-background/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">
                        {c.name}
                        {c.finished && <span className="text-muted-foreground font-normal ml-2 text-xs">(finished)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.leads} leads · {cActive} active
                      </p>
                    </div>
                    <div className="flex gap-4 text-xs font-bold flex-shrink-0">
                      <span className="text-blue-400">{cReplyRate.toFixed(1)}% reply</span>
                      <span className="text-red-400">{cBounceRate.toFixed(1)}% bounce</span>
                      <span className="text-amber-400">{cUnsubRate.toFixed(1)}% unsub</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RateCard({ label, value, color, description }: { label: string; value: number; color: string; description: string }) {
  return (
    <div className="p-4 rounded-xl bg-background/30 text-center">
      <p className={`text-2xl font-black ${color}`}>{value.toFixed(1)}%</p>
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mt-1">{label}</p>
      <p className="text-[9px] text-muted-foreground/60 mt-0.5">{description}</p>
    </div>
  );
}

function QuickStat({ label, value, sub, accent }: { label: string; value: number; sub: string; accent?: boolean }) {
  return (
    <div className="p-5 rounded-2xl glass">
      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={`text-3xl font-black ${accent ? 'text-primary' : 'text-foreground'}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
