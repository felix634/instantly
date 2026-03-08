import { Router } from 'express';
import { instantlyService } from '../services/instantly.service.js';
import { dbService } from '../services/supabase.service.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const { user: userParam, leadCount, followUpCount = 0 } = req.body;

        if (!userParam || !leadCount) {
            return res.status(400).json({ error: 'User and leadCount are required' });
        }

        // 1. Fetch user from Supabase
        const dbUser = await dbService.getUserByDisplayName(userParam);
        if (!dbUser) {
            return res.status(404).json({ error: `User ${userParam} not found in database` });
        }

        const userTagLabel = dbUser.instantly_tag;

        // 2. Fetch base data from Instantly
        const [allAccounts, allCampaigns, allTags] = await Promise.all([
            instantlyService.getAccounts(),
            instantlyService.getCampaigns(),
            instantlyService.getTags('campaign')
        ]);

        // 3. Find user's tag UUID in Instantly
        const userTagId = allTags.find((tag: any) =>
            tag.label && tag.label.toLowerCase() === userTagLabel.toLowerCase()
        )?.id;

        // 4. Filter campaigns by user tag
        const filteredCampaigns = allCampaigns.filter((c: any) => {
            if (c.email_tag_list && Array.isArray(c.email_tag_list) && userTagId) {
                return c.email_tag_list.includes(userTagId);
            }
            return false;
        });

        // 5. Calculate per-user capacity (using same strategies as analytics)
        let userAccounts: any[] = [];

        // Strategy A: Try fetching account tags
        try {
            const accountTags = await instantlyService.getTags('email_account' as any);
            const accountUserTagId = accountTags.find((t: any) =>
                t.label && t.label.toLowerCase() === userTagLabel.toLowerCase()
            )?.id;

            if (accountUserTagId) {
                const allMappings = await instantlyService.getTagMappings(accountUserTagId);
                const accountMappings = allMappings.filter((m: any) => m.tag_id === accountUserTagId);
                const mappedResourceIds = accountMappings.map((m: any) => m.resource_id);
                userAccounts = allAccounts.filter((acc: any) =>
                    mappedResourceIds.includes(acc.email) || mappedResourceIds.includes(acc.id)
                );
            }
        } catch (e) { }

        // Fallback strategy B/C combined
        if (userAccounts.length === 0) {
            const felixEmails = ['bary.felix@prometheusdigital.hu', 'baryf@prometheusdigital.hu', 'baryfelix@prometheusdigital.hu', 'felix.bary@prometheusdigital.hu', 'felixbary@prometheusdigital.hu'];
            const arpiEmails = ['bretz.arpad@prometheusdigital.hu', 'bretza@prometheusdigital.hu', 'arpad.bretz@prometheusdigital.hu', 'arpadbretz@prometheusdigital.hu', 'bretzarpad@prometheusdigital.hu', 'bendeguzbretz@prometheusdigital.hu'];
            const knownEmails = dbUser.display_name === 'Félix' ? felixEmails :
                dbUser.display_name === 'Árpi' ? arpiEmails : [];
            userAccounts = allAccounts.filter((acc: any) => knownEmails.includes(acc.email));
        }

        const totalCapacity = userAccounts.reduce((sum: number, acc: any) => sum + (acc.daily_limit || 50), 0);
        const safeCapacity = Math.floor(totalCapacity * 0.8); // 80% rule

        // 6. Current active load (Today's sends from daily stats)
        const dailyStatsResponses = await Promise.all(filteredCampaigns.map(c => instantlyService.getCampaignDaily(c.id)));
        const todayStr = new Date().toISOString().split('T')[0];
        let todaysSends = 0;

        dailyStatsResponses.forEach(stats => {
            if (Array.isArray(stats)) {
                const todayData = stats.find(d => d.date === todayStr);
                if (todayData) todaysSends += (todayData.sent || 0);
            }
        });

        // 7. Recommendation Logic
        const availableDailyVolume = Math.max(0, safeCapacity - todaysSends);
        let suggestedVolume = 0;
        let suggestedStartDate = new Date();

        if (availableDailyVolume > 50) { // If significant capacity available
            suggestedVolume = Math.min(leadCount, Math.floor(availableDailyVolume * 0.5)); // Start with 50% of free capacity
            suggestedStartDate.setDate(suggestedStartDate.getDate() + 1); // Tomorrow
        } else {
            suggestedVolume = Math.min(leadCount, Math.floor(safeCapacity * 0.2)); // Suggest 20% of total safe capacity
            suggestedStartDate.setDate(suggestedStartDate.getDate() + 3); // Suggest starting in 3 days
        }

        res.json({
            user: dbUser.display_name,
            leadCount,
            totalCapacity,
            safeCapacity,
            currentDailyLoad: todaysSends,
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
