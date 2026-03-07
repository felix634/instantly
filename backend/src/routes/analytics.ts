import { Router } from 'express';
import { instantlyService } from '../services/instantly.service.js';
import { dbService } from '../services/supabase.service.js';

const router = Router();

// Temporary log helper to fix lint error after moving debug route
const log = (data: any) => {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...data }));
};

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

        // Helper to check if a resource has a specific tag
        const hasTag = (resource: any, targetTag: string) => {
            if (!resource.tags) return false;
            return resource.tags.some((t: any) => {
                const label = typeof t === 'string' ? t : (t.label || t.name || '');
                return label.toLowerCase() === targetTag.toLowerCase();
            });
        };

        // 2. Filter campaigns by user tag
        const filteredCampaigns = allCampaigns.filter(c => hasTag(c, userTag));
        const campaignIds = filteredCampaigns.map(c => c.id);

        // Filter accounts by user tag
        const filteredAccounts = allAccounts.filter(acc => hasTag(acc, userTag));

        log({ user, userTag, campaignsTotal: allCampaigns.length, accountsTotal: allAccounts.length, filteredCampaignsCount: filteredCampaigns.length, filteredAccountsCount: filteredAccounts.length });

        // Fetch analytics for each campaign
        const analyticsPromises = campaignIds.map(id => instantlyService.getCampaignAnalytics(id));
        const allCampaignAnalytics = await Promise.all(analyticsPromises);

        // Aggregate data (Daily sends = sum of latest daily stats for these campaigns)
        let totalSends = 0;
        let totalBounces = 0;
        let totalReplies = 0;

        const campaignsWithStats = filteredCampaigns.map((c, index) => {
            const stats = allCampaignAnalytics[index];
            // Get latest day stats
            const latestDay = stats && stats.length > 0 ? stats[stats.length - 1] : { sent: 0, bounced: 0, replied: 0 };

            totalSends += latestDay.sent || 0;
            totalBounces += latestDay.bounced || 0;
            totalReplies += latestDay.replied || 0;

            return {
                id: c.id,
                name: c.name,
                status: c.status,
                dailyLimit: c.daily_limit,
                dailySends: latestDay.sent || 0
            };
        });

        // 3. Calculate Capacity
        // Total daily capacity = Sum of daily_limit of all accounts assigned to this user
        const totalCapacity = filteredAccounts.length > 0
            ? filteredAccounts.reduce((sum, acc) => sum + (acc.daily_limit || 50), 0)
            : allAccounts.length / 2 * 50; // Fallback if tags not found on accounts

        const freeCapacity = Math.max(0, totalCapacity - totalSends);

        res.json({
            user: user === 'felix' ? 'Félix' : 'Árpi',
            metrics: {
                totalSends,
                totalBounces,
                totalReplies,
                bounceRate: totalSends > 0 ? (totalBounces / totalSends) * 100 : 0,
                replyRate: totalSends > 0 ? (totalReplies / totalSends) * 100 : 0,
                activeCampaignsCount: filteredCampaigns.filter(c => c.status === 1).length,
                totalCapacity,
                freeCapacity,
                freeCapacityPercentage: totalCapacity > 0 ? (freeCapacity / totalCapacity) * 100 : 0
            },
            campaigns: campaignsWithStats
        });
    } catch (error: any) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics', message: error.message });
    }
});

export default router;
