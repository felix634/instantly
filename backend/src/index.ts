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

        // Get Felix tag ID
        const felixTagId = customTags.find((t: any) => t.label && t.label.toLowerCase().includes('félix'))?.id;

        // Fetch tag mappings for Felix's tag
        let tagMappings: any[] = [];
        if (felixTagId) {
            tagMappings = await instantlyService.getTagMappings(felixTagId);
        }

        // Get overview for TWO different campaigns to see if they differ
        let overview1 = null, overview2 = null;
        const activeCampaigns = campaigns.filter((c: any) => c.status === 1);
        if (activeCampaigns.length > 0) {
            overview1 = await instantlyService.getCampaignOverview(activeCampaigns[0].id);
        }
        if (activeCampaigns.length > 1) {
            overview2 = await instantlyService.getCampaignOverview(activeCampaigns[1].id);
        }

        // Get daily for first campaign
        let daily1: any[] = [];
        if (activeCampaigns.length > 0) {
            daily1 = await instantlyService.getCampaignDaily(activeCampaigns[0].id);
        }

        res.json({
            apiVersion: '4.0-diag',
            accountsCount: accounts.length,
            campaignsCount: campaigns.length,
            tagMap,
            felixTagId,
            tagMappings: tagMappings.slice(0, 10),
            tagMappingSample: tagMappings.length > 0 ? tagMappings[0] : null,
            campaign1: activeCampaigns.length > 0 ? { id: activeCampaigns[0].id, name: activeCampaigns[0].name } : null,
            overview1,
            campaign2: activeCampaigns.length > 1 ? { id: activeCampaigns[1].id, name: activeCampaigns[1].name } : null,
            overview2,
            daily1Sample: daily1.slice(0, 2),
            accounts: accounts.map((a: any) => ({ email: a.email, daily_limit: a.daily_limit }))
        });
    } catch (error: any) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
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
