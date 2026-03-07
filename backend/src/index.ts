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
app.get('/api/debug', async (req, res) => {
    try {
        const [accounts, campaigns] = await Promise.all([
            instantlyService.getAccounts(),
            instantlyService.getCampaigns()
        ]);
        const campaignTags = await instantlyService.getTags('campaign');
        res.json({
            accountsCount: accounts.length,
            campaignsCount: campaigns.length,
            sampleCampaign: campaigns.length > 0 ? campaigns[0] : null,
            allCampaignTags: campaignTags,
            rawCampaigns: campaigns
        });
    } catch (error: any) {
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

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
