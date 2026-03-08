import axios from 'axios';
import dotenv from 'dotenv';

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
    async getAccounts(): Promise<any[]> {
        return fetchAllItems('/accounts');
    },

    /**
     * Fetch all campaigns from Instantly
     */
    async getCampaigns(): Promise<any[]> {
        return fetchAllItems('/campaigns');
    },

    /**
     * Fetch campaign analytics overview (summary stats per campaign)
     * GET /api/v2/campaigns/analytics/overview?campaign_id=xxx
     * Returns: { contacted_count, emails_sent_count, bounced_count, reply_count, ... }
     */
    async getCampaignOverview(campaignId: string): Promise<any> {
        try {
            const response = await client.get('/campaigns/analytics/overview', {
                params: { campaign_id: campaignId }
            });
            return response.data;
        } catch (err: any) {
            console.error(`getCampaignOverview failed for ${campaignId}:`, err.message);
            return null;
        }
    },

    /**
     * Fetch daily campaign analytics
     * GET /api/v2/campaigns/analytics/daily?campaign_id=xxx
     * Returns array of daily stats
     */
    async getCampaignDaily(campaignId: string): Promise<any[]> {
        try {
            const response = await client.get('/campaigns/analytics/daily', {
                params: { campaign_id: campaignId }
            });
            const data: any = response.data;
            if (Array.isArray(data)) return data;
            if (data.items && Array.isArray(data.items)) return data.items;
            if (data.data && Array.isArray(data.data)) return data.data;
            return [data]; // single object
        } catch (err: any) {
            console.error(`getCampaignDaily failed for ${campaignId}:`, err.message);
            return [];
        }
    },

    /**
     * Fetch custom tags
     */
    async getTags(resourceType: 'account' | 'campaign'): Promise<any[]> {
        return fetchAllItems('/custom-tags', { resource_type: resourceType });
    }
};
