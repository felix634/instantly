'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { DashboardMetrics } from '../types';
import UserToggle from '../components/UserToggle';
import MetricsCard from '../components/MetricsCard';
import CapacityHeatmap from '../components/CapacityHeatmap';
import SmartScheduler from '../components/SmartScheduler';

export default function Home() {
  const { user } = useUser();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const data = await api.getAnalytics(user);
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  return (
    <main className="min-h-screen p-8 lg:p-12 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-foreground tracking-tight">Instantly Optimizer</h1>
          <p className="text-muted-foreground text-lg">Real-time performance monitoring & capacity planning</p>
        </div>
        <div className="w-full md:w-auto">
          <UserToggle />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricsCard
              title="Total Sends"
              value={metrics?.metrics.totalSends ?? 0}
              subtitle="Overall across all campaigns"
            />
            <MetricsCard
              title="Bounce Rate"
              value={`${(metrics?.metrics.bounceRate ?? 0).toFixed(1)}%`}
              trend={{ value: 2.1, label: 'vs yesterday', isPositive: false }}
            />
            <MetricsCard
              title="Reply Rate"
              value={`${(metrics?.metrics.replyRate ?? 0).toFixed(1)}%`}
              trend={{ value: 0.8, label: 'vs yesterday', isPositive: true }}
            />
            <MetricsCard
              title="Free Capacity"
              value={metrics?.metrics.freeCapacity ?? 0}
              subtitle={`${(metrics?.metrics.freeCapacityPercentage ?? 0).toFixed(0)}% available`}
            />
          </div>

          {/* Main Sections Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
            <div className="space-y-12">
              <CapacityHeatmap data={[]} />
              <div className="p-8 rounded-2xl glass">
                <h3 className="text-xl font-bold text-foreground mb-6">Active Campaigns</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {metrics?.campaigns && metrics.campaigns.length > 0 ? (
                    metrics.campaigns.map((camp) => (
                      <div key={camp.id} className="p-4 rounded-xl bg-background/30 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-foreground">{camp.name}</p>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${camp.status === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                            {camp.status === 1 ? 'Active' : camp.status === 2 ? 'Paused' : 'Draft'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-black text-foreground">{camp.totalSent}</p>
                            <p className="text-[10px] uppercase text-muted-foreground font-bold">Sent</p>
                          </div>
                          <div>
                            <p className={`text-lg font-black ${camp.bounceRate > 5 ? 'text-red-400' : 'text-foreground'}`}>{camp.bounceRate.toFixed(1)}%</p>
                            <p className="text-[10px] uppercase text-muted-foreground font-bold">Bounce</p>
                          </div>
                          <div>
                            <p className={`text-lg font-black ${camp.replyRate > 3 ? 'text-emerald-400' : 'text-foreground'}`}>{camp.replyRate.toFixed(1)}%</p>
                            <p className="text-[10px] uppercase text-muted-foreground font-bold">Reply</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground italic">No campaigns found for this user.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-12">
              <SmartScheduler />
              <div className="p-8 rounded-2xl glass border border-primary/20 bg-primary/5">
                <h3 className="text-xl font-bold text-primary mb-4">Capacity Insight</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {metrics && metrics.metrics.freeCapacityPercentage > 30
                    ? `You have significant headroom for new campaigns. Currently operating at ${(100 - metrics.metrics.freeCapacityPercentage).toFixed(0)}% of total capacity.`
                    : "Capacity is becoming limited. Consider pausing non-performing campaigns before starting new ones to stay within the 80% safety limit."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
