import { Router } from 'express';
import { instantlyService } from '../services/instantly.service.js';
import { dbService } from '../services/supabase.service.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const { user } = req.query;
        if (!user || (user !== 'felix' && user !== 'arpi')) {
            return res.status(400).json({ error: 'Valid user parameter (felix or arpi) is required' });
        }

        const userTag = user === 'felix' ? 'Félix manageli' : 'Árpi manageli';

        // 1. Fetch data from Instantly
        const [allAccounts, allCampaigns] = await Promise.all([
            instantlyService.getAccounts(),
            instantlyService.getCampaigns()
        ]);

        // 2. Filter by user tag
        // Note: We assume campaigns are tagged with the user's name
        // Accounts might need a more custom mapping if tags aren't directly on them in V2
        const filteredCampaigns = allCampaigns.filter(c => c.tags && c.tags.includes(userTag));
        const campaignIds = filteredCampaigns.map(c => c.id);

        // Fetch analytics for each campaign
        const analyticsPromises = campaignIds.map(id => instantlyService.getCampaignAnalytics(id));
        const allCampaignAnalytics = await Promise.all(analyticsPromises);

        // Aggregate data
        let totalSends = 0;
        let totalBounces = 0;
        let totalReplies = 0;
        let activeCampaignsCount = filteredCampaigns.filter(c => c.status === 1).length;

        allCampaignAnalytics.forEach(campaignData => {
            campaignData.forEach(day => {
                // For simplicity, we just aggregate the latest day or sum up
                // In a real app, we'd filter by date
                totalSends += day.sent;
                totalBounces += day.bounced;
                totalReplies += day.replied;
            });
        });

        // 3. Calculate Capacity
        // Total daily capacity = Sum of daily_limit of all accounts assigned to this user
        // Current load = Sum of current sending volume of active campaigns
        const totalCapacity = allAccounts.reduce((sum, acc) => sum + (acc.daily_limit || 50), 0);
        const freeCapacity = Math.max(0, totalCapacity - totalSends);

        res.json({
            user: user === 'felix' ? 'Félix' : 'Árpi',
            metrics: {
                totalSends,
                totalBounces,
                totalReplies,
                bounceRate: totalSends > 0 ? (totalBounces / totalSends) * 100 : 0,
                replyRate: totalSends > 0 ? (totalReplies / totalSends) * 100 : 0,
                activeCampaigns: activeCampaignsCount,
                totalCapacity,
                freeCapacity,
                freeCapacityPercentage: totalCapacity > 0 ? (freeCapacity / totalCapacity) * 100 : 0
            }
        });
    } catch (error: any) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics', message: error.message });
    }
});

export default router;
