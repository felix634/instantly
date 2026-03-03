'use client';

import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { Recommendation } from '../types';

const SmartScheduler: React.FC = () => {
    const { user } = useUser();
    const [leadCount, setLeadCount] = useState<number>(250);
    const [followUpCount, setFollowUpCount] = useState<number>(3);
    const [intervalDays, setIntervalDays] = useState<number>(2);
    const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await api.getRecommendation({
                user,
                leadCount,
                followUpCount,
                intervalDays
            });
            setRecommendation(result);
        } catch (error) {
            console.error('Failed to get recommendation:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 rounded-2xl glass shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-8">Upload New Campaign</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Lead Count</label>
                        <input
                            type="number"
                            value={leadCount}
                            onChange={(e) => setLeadCount(parseInt(e.target.value))}
                            className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Follow-ups</label>
                        <input
                            type="number"
                            value={followUpCount}
                            onChange={(e) => setFollowUpCount(parseInt(e.target.value))}
                            className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Interval (Days)</label>
                        <input
                            type="number"
                            value={intervalDays}
                            onChange={(e) => setIntervalDays(parseInt(e.target.value))}
                            className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all shadow-xl disabled:opacity-50"
                >
                    {loading ? 'Analyzing Capacity...' : 'Get Optimal Schedule'}
                </button>
            </form>

            {recommendation && (
                <div className="mt-10 p-6 rounded-2xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h4 className="text-primary font-black uppercase tracking-widest mb-6">Recommendation Analysis</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Suggested Start</span>
                            <p className="text-2xl font-black text-foreground">
                                {new Date(recommendation.recommendation.suggestedStartDate).toLocaleDateString('en-US', {
                                    month: 'long', day: 'numeric', year: 'numeric'
                                })}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Daily Volume</span>
                            <p className="text-2xl font-black text-foreground">{recommendation.recommendation.suggestedVolume} <span className="text-sm font-medium text-muted-foreground">leads/day</span></p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Est. Duration</span>
                            <p className="text-2xl font-black text-foreground">{recommendation.recommendation.estimatedCompletionDays} <span className="text-sm font-medium text-muted-foreground">days</span></p>
                        </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-primary/20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="text-center bg-background/50 p-2 rounded-lg border border-border min-w-[120px]">
                                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Total Capacity</span>
                                <span className="text-lg font-black text-foreground">{recommendation.totalCapacity}</span>
                            </div>
                            <div className="text-center bg-background/50 p-2 rounded-lg border border-border min-w-[120px]">
                                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Safe Load (80%)</span>
                                <span className="text-lg font-black text-foreground">{recommendation.safeCapacity}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            {recommendation.availableDailyVolume > 0 ? (
                                <p className="text-xs font-medium text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Safe to proceed with recommended volume
                                </p>
                            ) : (
                                <p className="text-xs font-medium text-destructive uppercase tracking-widest">Currently at max capacity</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartScheduler;
