import { Router } from 'express';
import { instantlyService } from '../services/instantly.service.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const { user, leadCount, followUpCount, intervalDays } = req.body;

        if (!user || !leadCount) {
            return res.status(400).json({ error: 'User and leadCount are required' });
        }

        const userTag = user === 'felix' ? 'Félix manageli' : 'Árpi manageli';

        // 1. Fetch current capacity and campaigns
        const allAccounts = await instantlyService.getAccounts();
        const allCampaigns = await instantlyService.getCampaigns();

        // Filter campaigns by user tag
        const userCampaigns = allCampaigns.filter(c => c.tags && c.tags.includes(userTag));
        const activeUserCampaigns = userCampaigns.filter(c => c.status === 1);

        // 2. Calculate daily capacity (80% of total)
        const totalCapacity = allAccounts.reduce((sum, acc) => sum + (acc.daily_limit || 50), 0);
        const safeCapacity = Math.floor(totalCapacity * 0.8);

        // 3. Current active load
        const currentDailyLoad = activeUserCampaigns.reduce((sum, c) => sum + (c.daily_limit || 0), 0);

        // 4. Recommendation Logic
        // Calculate how many leads we can add daily without exceeding 80% capacity
        const availableDailyVolume = Math.max(0, safeCapacity - currentDailyLoad);

        let suggestedVolume = 0;
        let suggestedStartDate = new Date();

        if (availableDailyVolume > 0) {
            // Suggest sending the new campaign using the available volume
            suggestedVolume = Math.min(leadCount, availableDailyVolume);
            suggestedStartDate.setDate(suggestedStartDate.getDate() + 1); // Tomorrow
        } else {
            // Find a date when current campaigns might finish (simplified for now)
            // In a real app, we'd analyze campaign end dates
            suggestedVolume = Math.floor(safeCapacity / 2); // Suggest 40% of total capacity
            suggestedStartDate.setDate(suggestedStartDate.getDate() + 7); // Suggest starting in a week
        }

        res.json({
            user: user === 'felix' ? 'Félix' : 'Árpi',
            totalCapacity,
            safeCapacity,
            currentDailyLoad,
            availableDailyVolume,
            recommendation: {
                suggestedStartDate: suggestedStartDate.toISOString().split('T')[0],
                suggestedVolume,
                estimatedCompletionDays: Math.ceil(leadCount / suggestedVolume)
            }
        });

    } catch (error: any) {
        console.error('Error calculating recommendation:', error);
        res.status(500).json({ error: 'Failed to calculate recommendation', message: error.message });
    }
});

export default router;
