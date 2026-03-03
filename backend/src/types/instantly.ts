export interface InstantlyAccount {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    daily_limit: number;
    status: number; // 1 = active, 2 = paused, etc.
    warmup_status: number;
}

export interface InstantlyCampaign {
    id: string;
    name: string;
    status: number; // 0 = draft, 1 = active, 2 = paused, 3 = completed
    current_step: number;
    total_leads: number;
    daily_limit: number;
    tags: string[];
}

export interface InstantlyAccountAnalytics {
    id: string;
    email: string;
    date: string;
    sent: number;
    bounced: number;
    replied: number;
    warmup_sent: number;
}

export interface InstantlyCampaignAnalytics {
    id: string;
    date: string;
    sent: number;
    bounced: number;
    replied: number;
    opportunities: number;
}
