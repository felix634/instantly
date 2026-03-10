'use client';

import React from 'react';
import { useAppState } from '../context/UserContext';
import AccountsManager from '../components/AccountsManager';
import CampaignList from '../components/CampaignList';
import CapacityPlanner from '../components/CapacityPlanner';

export default function Home() {
  const { user, setUser, currentUserState } = useAppState();
  const { accounts, campaigns } = currentUserState;

  const totalCapacity = accounts.reduce((s, a) => s + a.dailyLimit, 0);
  const activeCampaigns = campaigns.length;

  return (
    <main className="min-h-screen p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-foreground tracking-tight">Campaign Planner</h1>
          <p className="text-muted-foreground text-base">Manual email capacity planning · Mon–Fri schedules</p>
        </div>
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
      </div>
    </main>
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
