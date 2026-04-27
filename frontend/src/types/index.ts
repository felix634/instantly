export type SendDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';

export interface AccountTag {
    id: string;
    name: string;
    color: string;
}

export interface EmailAccount {
    id: string;
    email: string;
    dailyLimit: number;
    tagIds: string[];
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
    unsubscribed: number;
    emailAccountIds: string[];
    startDate: string; // ISO date string for when the campaign starts sending
    finished: boolean;
    pausedWeeks: string[]; // ISO Monday dates the campaign is paused for
}

export interface UserState {
    accounts: EmailAccount[];
    campaigns: Campaign[];
    tags: AccountTag[];
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
