export interface DashboardMetrics {
    user: string;
    metrics: {
        totalSends: number;
        totalBounces: number;
        totalReplies: number;
        bounceRate: number;
        replyRate: number;
        activeCampaigns: number;
        totalCapacity: number;
        freeCapacity: number;
        freeCapacityPercentage: number;
    };
}

export interface Recommendation {
    user: string;
    totalCapacity: number;
    safeCapacity: number;
    currentDailyLoad: number;
    availableDailyVolume: number;
    recommendation: {
        suggestedStartDate: string;
        suggestedVolume: number;
        estimatedCompletionDays: number;
    };
}

export interface Account {
    id: string;
    email: string;
    daily_limit: number;
    status: number;
}
