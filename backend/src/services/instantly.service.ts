import axios from 'axios';
import dotenv from 'dotenv';
import {
    InstantlyAccount,
    InstantlyCampaign,
    InstantlyAccountAnalytics,
    InstantlyCampaignAnalytics
} from '../types/instantly.js';

dotenv.config();

const INSTANTLY_BASE_URL = 'https://api.instantly.ai/api/v2';
const API_KEY = process.env.INSTANTLY_API_KEY;

const client = axios.create({
    baseURL: INSTANTLY_BASE_URL,
    headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
    }
});

/**
 * Helper to paginate through all items from a V2 endpoint.
 * Instantly V2 returns { items: [...], next_starting_after: "..." }
 */
async function fetchAllItems<T>(path: string, params: Record<string, any> = {}): Promise<T[]> {
    const allItems: T[] = [];
    let startingAfter: string | undefined = undefined;

    do {
        const response: { data: any } = await client.get(path, {
            params: {
                limit: 100,
                ...params,
                ...(startingAfter ? { starting_after: startingAfter } : {})
            }
        });

        const data: any = response.data;

        // Handle both { items: [...] } and direct array responses
        if (Array.isArray(data)) {
            allItems.push(...data);
            break;
        } else if (data.items && Array.isArray(data.items)) {
            allItems.push(...data.items);
            startingAfter = data.next_starting_after || undefined;
        } else {
            // Single object or unexpected format
            console.warn('Unexpected API response format:', JSON.stringify(data).substring(0, 200));
            break;
        }
    } while (startingAfter);

    return allItems;
}

export const instantlyService = {
    /**
     * Fetch all email accounts from Instantly
     */
    async getAccounts(): Promise<InstantlyAccount[]> {
        return fetchAllItems<InstantlyAccount>('/accounts');
    },

    /**
     * Fetch all campaigns from Instantly
     */
    async getCampaigns(): Promise<InstantlyCampaign[]> {
        return fetchAllItems<InstantlyCampaign>('/campaigns');
    },

    /**
     * Fetch daily analytics for a specific account
     */
    async getAccountDailyAnalytics(accountId: string, date: string): Promise<InstantlyAccountAnalytics> {
        const response = await client.get(`/accounts/${accountId}/analytics/daily`, {
            params: { date }
        });
        return response.data;
    },

    /**
     * Fetch analytics for a specific campaign
     */
    async getCampaignAnalytics(campaignId: string): Promise<InstantlyCampaignAnalytics[]> {
        const response = await client.get(`/campaigns/${campaignId}/analytics`);
        const data = response.data;
        // Handle both formats
        if (Array.isArray(data)) return data;
        if (data.items && Array.isArray(data.items)) return data.items;
        return [];
    },

    /**
     * Fetch custom tags
     */
    async getTags(resourceType: 'account' | 'campaign'): Promise<any[]> {
        return fetchAllItems('/custom-tags', { resource_type: resourceType });
    }
};
