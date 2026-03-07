import { Router } from 'express';
import { instantlyService } from '../services/instantly.service.js';
import { dbService } from '../services/supabase.service.js';

const router = Router();

// Log helper
const log = (data: any) => {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...data }));
};

router.get('/', async (req, res) => {
    try {
        const { user } = req.query;
        if (!user || (user !== 'felix' && user !== 'arpi')) {
            return res.status(400).json({ error: 'Valid user parameter (felix or arpi) is required' });
        }

        const userTagLabel = user === 'felix' ? 'Félix manageli' : 'Árpi manageli';

        // 1. Fetch data from Instantly (all in parallel)
        const [allAccounts, allCampaigns, allTags] = await Promise.all([
            instantlyService.getAccounts(),
            instantlyService.getCampaigns(),
            instantlyService.getTags('campaign')
        ]);

        // 2. Build a tag UUID → label map
        const tagMap = new Map<string, string>();
        allTags.forEach((tag: any) => {
            if (tag.id && tag.label) {
                tagMap.set(tag.id, tag.label);
            }
        });

        // Find the UUID of the user's tag
        const userTagId = allTags.find((tag: any) =>
            tag.label && tag.label.toLowerCase() === userTagLabel.toLowerCase()
        )?.id;

        log({
            user, userTagLabel, userTagId,
            totalCampaigns: allCampaigns.length,
            totalAccounts: allAccounts.length,
            totalTags: allTags.length,
            tagLabels: allTags.map((t: any) => t.label)
        });

        // 3. Filter campaigns by user tag
        // Campaign tags can be: UUID strings in email_tag_list, or string labels in tags array
        const filteredCampaigns = allCampaigns.filter((c: any) => {
            // Check email_tag_list (array of UUIDs)
            if (c.email_tag_list && Array.isArray(c.email_tag_list) && userTagId) {
                if (c.email_tag_list.includes(userTagId)) return true;
            }
            // Check tags field (could be labels or objects)
            if (c.tags && Array.isArray(c.tags)) {
                return c.tags.some((t: any) => {
                    const label = typeof t === 'string' ? (tagMap.get(t) || t) : (t.label || t.name || '');
                    return label.toLowerCase() === userTagLabel.toLowerCase();
                });
            }
            // Check tag_ids field 
            if (c.tag_ids && Array.isArray(c.tag_ids) && userTagId) {
                if (c.tag_ids.includes(userTagId)) return true;
            }
            return false;
        });

        const campaignIds = filteredCampaigns.map((c: any) => c.id);

        // Filter accounts by similar logic
        const filteredAccounts = allAccounts.filter((acc: any) => {
            if (acc.email_tag_list && Array.isArray(acc.email_tag_list) && userTagId) {
                return acc.email_tag_list.includes(userTagId);
            }
            if (acc.tags && Array.isArray(acc.tags)) {
                return acc.tags.some((t: any) => {
                    const label = typeof t === 'string' ? (tagMap.get(t) || t) : (t.label || t.name || '');
                    return label.toLowerCase() === userTagLabel.toLowerCase();
                });
            }
            if (acc.tag_ids && Array.isArray(acc.tag_ids) && userTagId) {
                return acc.tag_ids.includes(userTagId);
            }
            return false;
        });

        log({ filteredCampaigns: filteredCampaigns.length, filteredAccounts: filteredAccounts.length });

        // 4. Fetch analytics for each campaign
        const analyticsPromises = campaignIds.map((id: string) =>
            instantlyService.getCampaignAnalytics(id).catch(err => {
                console.error(`Failed to get analytics for campaign ${id}:`, err.message);
                return [];
            })
        );
        const allCampaignAnalytics = await Promise.all(analyticsPromises);

        // 5. Aggregate data — sum ALL days for overall performance rates
        let overallSends = 0;
        let overallBounces = 0;
        let overallReplies = 0;
        let todaysSends = 0; // For capacity calculation

        const today = new Date().toISOString().split('T')[0];

        const campaignsWithStats = filteredCampaigns.map((c: any, index: number) => {
            const stats = allCampaignAnalytics[index];

            // Sum ALL historical days for overall performance
            let campSent = 0, campBounced = 0, campReplied = 0, campTodaySends = 0;
            if (stats && Array.isArray(stats)) {
                stats.forEach((day: any) => {
                    campSent += day.sent || 0;
                    campBounced += day.bounced || 0;
                    campReplied += day.replied || 0;
                    if (day.date === today) {
                        campTodaySends += day.sent || 0;
                    }
                });
            }

            overallSends += campSent;
            overallBounces += campBounced;
            overallReplies += campReplied;
            todaysSends += campTodaySends;

            return {
                id: c.id,
                name: c.name,
                status: c.status,
                dailyLimit: c.daily_limit || 0,
                totalSent: campSent,
                bounceRate: campSent > 0 ? ((campBounced / campSent) * 100) : 0,
                replyRate: campSent > 0 ? ((campReplied / campSent) * 100) : 0,
                todaySends: campTodaySends
            };
        });

        // 6. Calculate Capacity
        const totalCapacity = filteredAccounts.length > 0
            ? filteredAccounts.reduce((sum: number, acc: any) => sum + (acc.daily_limit || 50), 0)
            : allAccounts.reduce((sum: number, acc: any) => sum + (acc.daily_limit || 50), 0) / 2;

        const freeCapacity = Math.max(0, totalCapacity - todaysSends);

        res.json({
            user: user === 'felix' ? 'Félix' : 'Árpi',
            metrics: {
                totalSends: overallSends,
                totalBounces: overallBounces,
                totalReplies: overallReplies,
                bounceRate: overallSends > 0 ? (overallBounces / overallSends) * 100 : 0,
                replyRate: overallSends > 0 ? (overallReplies / overallSends) * 100 : 0,
                activeCampaignsCount: filteredCampaigns.filter((c: any) => c.status === 1).length,
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
