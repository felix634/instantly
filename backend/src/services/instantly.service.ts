import axios from 'axios';
import dotenv from 'dotenv';
import {
    InstantlyAccount,
    InstantlyCampaign,
    InstantlyAccountAnalytics,
    InstantlyCampaignAnalytics
} from '../types/instantly.js';

dotenv.config();

const INSTANTLY_BASE_URL = 'https://api.instantly.ai/v2';
const API_KEY = process.env.INSTANTLY_API_KEY;

const client = axios.create({
    baseURL: INSTANTLY_BASE_URL,
    headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
    }
});

export const instantlyService = {
    /**
     * Fetch all email accounts from Instantly
     */
    async getAccounts(): Promise<InstantlyAccount[]> {
        const response = await client.get('/accounts');
        return response.data;
    },

    /**
     * Fetch all campaigns from Instantly
     */
    async getCampaigns(): Promise<InstantlyCampaign[]> {
        const response = await client.get('/campaigns');
        return response.data;
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
        return response.data;
    },

    /**
     * Fetch tags associated with accounts or campaigns
     */
    async getTags(resourceType: 'account' | 'campaign'): Promise<any[]> {
        const response = await client.get('/tags', {
            params: { resource_type: resourceType }
        });
        return response.data;
    }
};
