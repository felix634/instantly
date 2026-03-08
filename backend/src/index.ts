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

        // Build tag map
        const tagMap: Record<string, string> = {};
        customTags.forEach((t: any) => { if (t.id && t.label) tagMap[t.id] = t.label; });

        let sampleAnalytics = null;
        if (campaigns.length > 0) {
            try {
                sampleAnalytics = await instantlyService.getCampaignAnalytics(campaigns[0].id);
            } catch (e: any) {
                sampleAnalytics = { error: e.message };
            }
        }

        res.json({
            apiVersion: '2.0-fixed-analytics',
            accountsCount: accounts.length,
            campaignsCount: campaigns.length,
            customTagsCount: customTags.length,
            tagMap,
            sampleCampaign: campaigns.length > 0 ? campaigns[0] : null,
            sampleAnalytics,
            sampleAccount: accounts.length > 0 ? accounts[0] : null,
            allCampaigns: campaigns.map((c: any) => ({
                id: c.id,
                name: c.name,
                status: c.status,
                tags: c.tags,
                email_tag_list: c.email_tag_list,
                tag_ids: c.tag_ids
            }))
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
