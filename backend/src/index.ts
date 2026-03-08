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
        const [accounts, campaigns] = await Promise.all([
            instantlyService.getAccounts(),
            instantlyService.getCampaigns()
        ]);
        const customTags = await instantlyService.getTags('campaign');

        const tagMap: Record<string, string> = {};
        customTags.forEach((t: any) => { if (t.id && t.label) tagMap[t.id] = t.label; });

        let sampleOverview = null;
        let sampleDaily = null;
        if (campaigns.length > 0) {
            sampleOverview = await instantlyService.getCampaignOverview(campaigns[0].id);
            sampleDaily = await instantlyService.getCampaignDaily(campaigns[0].id);
        }

        res.json({
            apiVersion: '3.0-overview',
            accountsCount: accounts.length,
            campaignsCount: campaigns.length,
            customTagsCount: customTags.length,
            tagMap,
            sampleCampaign: campaigns.length > 0 ? {
                id: campaigns[0].id,
                name: campaigns[0].name,
                status: campaigns[0].status,
                email_tag_list: campaigns[0].email_tag_list,
                email_list: campaigns[0].email_list,
                daily_limit: campaigns[0].daily_limit
            } : null,
            sampleOverview,
            sampleDaily: sampleDaily?.slice(0, 3),
            sampleAccount: accounts.length > 0 ? {
                email: accounts[0].email,
                daily_limit: accounts[0].daily_limit,
                status: accounts[0].status
            } : null
        });
    } catch (error: any) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message, stack: error.stack?.split('\n').slice(0, 3) });
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
