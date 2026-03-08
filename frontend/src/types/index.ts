export interface Campaign {
    id: string;
    name: string;
    status: number;
    dailyLimit: number;
    totalSent: number;
    bounceRate: number;
    replyRate: number;
}

export interface HeatmapDay {
    date: string;
    sent: number;
    capacity: number;
    usage: number;
}

export interface DashboardMetrics {
    user: string;
    metrics: {
        totalSends: number;
        totalBounces: number;
        totalReplies: number;
        bounceRate: number;
        replyRate: number;
        activeCampaignsCount: number;
        totalCapacity: number;
        freeCapacity: number;
        freeCapacityPercentage: number;
    };
    campaigns: Campaign[];
    heatmap: HeatmapDay[];
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
