import { Router } from 'express';
import { instantlyService } from '../services/instantly.service.js';

const router = Router();

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

        // 2. Build tag UUID → label map
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

        // 3. Filter campaigns by user tag (using email_tag_list which contains UUIDs)
        const filteredCampaigns = allCampaigns.filter((c: any) => {
            if (c.email_tag_list && Array.isArray(c.email_tag_list) && userTagId) {
                return c.email_tag_list.includes(userTagId);
            }
            return false;
        });

        console.log(`User: ${user}, tag: ${userTagLabel}, tagId: ${userTagId}, campaigns: ${filteredCampaigns.length}/${allCampaigns.length}`);

        // 4. Fetch analytics overview for each campaign (correct V2 endpoint)
        const overviewPromises = filteredCampaigns.map((c: any) =>
            instantlyService.getCampaignOverview(c.id)
        );
        const allOverviews = await Promise.all(overviewPromises);

        // 5. Aggregate overall stats from overviews
        let overallSends = 0;
        let overallBounces = 0;
        let overallReplies = 0;

        const campaignsWithStats = filteredCampaigns.map((c: any, index: number) => {
            const overview = allOverviews[index];

            // V2 overview fields: emails_sent_count, bounced_count, reply_count, contacted_count, etc.
            const sent = overview?.emails_sent_count || overview?.sent || overview?.contacted_count || 0;
            const bounced = overview?.bounced_count || overview?.bounced || 0;
            const replied = overview?.reply_count || overview?.replied || overview?.replies_count || 0;

            overallSends += sent;
            overallBounces += bounced;
            overallReplies += replied;

            return {
                id: c.id,
                name: c.name,
                status: c.status,
                dailyLimit: c.daily_limit || 0,
                totalSent: sent,
                bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
                replyRate: sent > 0 ? (replied / sent) * 100 : 0
            };
        });

        // 6. Calculate Capacity
        // Accounts don't have tags — map them via campaign email_list
        const userEmails = new Set<string>();
        filteredCampaigns.forEach((c: any) => {
            if (c.email_list && Array.isArray(c.email_list)) {
                c.email_list.forEach((email: string) => userEmails.add(email));
            }
        });

        // Match accounts by email
        const userAccounts = allAccounts.filter((acc: any) => userEmails.has(acc.email));

        // If we found accounts via email matching, use those. Otherwise fallback.
        const totalCapacity = userAccounts.length > 0
            ? userAccounts.reduce((sum: number, acc: any) => sum + (acc.daily_limit || 50), 0)
            : allAccounts.reduce((sum: number, acc: any) => sum + (acc.daily_limit || 50), 0);

        // Daily sends for capacity = sum of today's sends (we'll approximate from overview for now)
        // In a more advanced version, we'd fetch daily analytics for today
        const todaysSends = 0; // Will be enhanced with daily endpoint later
        const freeCapacity = Math.max(0, totalCapacity - todaysSends);

        console.log(`Accounts matched: ${userAccounts.length}, emails: ${[...userEmails].join(', ')}, capacity: ${totalCapacity}`);

        // 7. Fetch daily analytics for heatmap data
        const dailyPromises = filteredCampaigns.map((c: any) =>
            instantlyService.getCampaignDaily(c.id)
        );
        const allDailyData = await Promise.all(dailyPromises);

        // Aggregate daily data into a date → usage map
        const dailyMap = new Map<string, { sent: number; capacity: number }>();
        allDailyData.forEach(campaignDays => {
            if (Array.isArray(campaignDays)) {
                campaignDays.forEach((day: any) => {
                    const date = day.date || day.day;
                    if (!date) return;
                    const existing = dailyMap.get(date) || { sent: 0, capacity: totalCapacity };
                    existing.sent += day.emails_sent_count || day.sent || day.contacted_count || 0;
                    dailyMap.set(date, existing);
                });
            }
        });

        // Convert to sorted array for heatmap (last 14 days)
        const heatmapData = Array.from(dailyMap.entries())
            .map(([date, data]) => ({
                date,
                sent: data.sent,
                capacity: totalCapacity,
                usage: totalCapacity > 0 ? (data.sent / totalCapacity) * 100 : 0
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-14);

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
            campaigns: campaignsWithStats,
            heatmap: heatmapData
        });
    } catch (error: any) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics', message: error.message });
    }
});

export default router;
