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
              value={metrics?.metrics.totalSends || 0}
              subtitle="Daily across all accounts"
            />
            <MetricsCard
              title="Bounce Rate"
              value={`${metrics?.metrics.bounceRate.toFixed(1)}%`}
              trend={{ value: 2.1, label: 'vs yesterday', isPositive: false }}
            />
            <MetricsCard
              title="Reply Rate"
              value={`${metrics?.metrics.replyRate.toFixed(1)}%`}
              trend={{ value: 0.8, label: 'vs yesterday', isPositive: true }}
            />
            <MetricsCard
              title="Free Capacity"
              value={metrics?.metrics.freeCapacity || 0}
              subtitle={`${metrics?.metrics.freeCapacityPercentage.toFixed(0)}% available`}
            />
          </div>

          {/* Main Sections Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
            <div className="space-y-12">
              <CapacityHeatmap data={[]} />
              <div className="p-8 rounded-2xl glass">
                <h3 className="text-xl font-bold text-foreground mb-6">Active Campaigns</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-background/30 border border-border flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-foreground">SaaS Outreach V2</p>
                      <p className="text-xs text-muted-foreground">Active • Started 2 days ago</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-primary">45/day</p>
                      <div className="w-24 h-1 bg-muted rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-primary" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-background/30 border border-border flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-foreground">Enterprise Leads</p>
                      <p className="text-xs text-muted-foreground">Active • Started 5 days ago</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-primary">30/day</p>
                      <div className="w-24 h-1 bg-muted rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-primary" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  </div>
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
