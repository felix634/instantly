export type SendDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';

export interface EmailAccount {
    id: string;
    email: string;
    dailyLimit: number;
}

export interface Campaign {
    id: string;
    name: string;
    leads: number;
    dailyMaxEmails: number;
    sequences: number;
    sendDays: SendDay[];
    nextMessageDays: number;
    bounces: number;
    replies: number;
    emailAccountIds: string[];
    startDate: string; // ISO date string for when the campaign starts sending
}

export interface UserState {
    accounts: EmailAccount[];
    campaigns: Campaign[];
}

export interface AppState {
    felix: UserState;
    arpi: UserState;
}

export type UserType = 'felix' | 'arpi';

// Capacity planner output
export interface DailyCapacity {
    date: string; // ISO date
    dayLabel: string; // e.g. "Mon 10 Mar"
    totalAccountCapacity: number;
    totalEmailDemand: number;
    usagePercent: number;
    campaignBreakdown: { campaignId: string; campaignName: string; demand: number }[];
}
