import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { instantlyService } from './services/instantly.service.js';
import analyticsRoutes from './routes/analytics.js';
import accountRoutes from './routes/accounts.js';
import schedulerRoutes from './routes/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Routes
app.get('/api', (req, res) => {
    res.json({ message: 'Instantly Optimizer API v1.1', status: 'ready' });
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'Test route is working' });
});

app.get('/api/debug', async (req, res) => {
    console.log('Debug route hit');
    try {
        const { default: axios } = await import('axios');
        const API_KEY = process.env.INSTANTLY_API_KEY;
        const BASE = 'https://api.instantly.ai/api/v2';
        const headers = { 'Authorization': `Bearer ${API_KEY}` };

        // Get campaigns first
        const campaignsRes = await axios.get(`${BASE}/campaigns`, { headers, params: { limit: 5 } });
        const firstCampaign = campaignsRes.data?.items?.[0] || campaignsRes.data?.[0];
        const campId = firstCampaign?.id;
        const campName = firstCampaign?.name;

        // Test 1: daily WITH campaign_id
        const daily1 = await axios.get(`${BASE}/campaigns/analytics/daily`, {
            headers, params: { campaign_id: campId }
        });

        // Test 2: daily WITHOUT campaign_id
        const daily2 = await axios.get(`${BASE}/campaigns/analytics/daily`, {
            headers, params: {}
        });

        // Test 3: overview WITH campaign_id
        const ov1 = await axios.get(`${BASE}/campaigns/analytics/overview`, {
            headers, params: { campaign_id: campId }
        });

        // Test 4: overview WITHOUT campaign_id (all campaigns)
        const ov2 = await axios.get(`${BASE}/campaigns/analytics/overview`, {
            headers, params: {}
        });

        // Get accounts for capacity check
        const accts = await axios.get(`${BASE}/accounts`, { headers, params: { limit: 100 } });
        const accounts = accts.data?.items || accts.data || [];

        // Felix campaign emails
        const felixTagId = 'de5eb56d-570c-42d2-a797-5919240137f3';
        const allCamps = campaignsRes.data?.items || campaignsRes.data || [];

        // Test 5: /campaigns/analytics (without /overview)
        const ana1 = await axios.get(`${BASE}/campaigns/analytics`, {
            headers, params: { campaign_id: campId }
        });

        res.json({
            apiVersion: '5.1-ana-test',
            testCampaign: firstCampaign, // Full object
            daily_withCampaignId: {
                type: typeof daily1.data,
                isArray: Array.isArray(daily1.data),
                hasItems: !!daily1.data?.items,
                count: Array.isArray(daily1.data) ? daily1.data.length : daily1.data?.items?.length || 'N/A',
                sample: (daily1.data?.items || daily1.data)?.slice?.(0, 2) || daily1.data
            },
            overview_withCampaignId: ov1.data,
            analytics_endpoint: ana1.data,
            accountCount: accounts.length,
            accountSample: accounts.slice(0, 2).map((a: any) => ({ email: a.email, daily_limit: a.daily_limit }))
        });
    } catch (error: any) {
        console.error('Debug error:', error?.response?.data || error.message);
        res.status(500).json({ error: error.message, apiError: error?.response?.data });
    }
});

app.use('/api/analytics', analyticsRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/recommend-schedule', schedulerRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    console.log(`404 - Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route not found', path: req.url });
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
