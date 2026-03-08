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

        // 1. Fetch data from Instantly
        const [allAccounts, allCampaigns, allTags] = await Promise.all([
            instantlyService.getAccounts(),
            instantlyService.getCampaigns(),
            instantlyService.getTags('campaign')
        ]);

        // 2. Find the UUID of the user's tag
        const userTagId = allTags.find((tag: any) =>
            tag.label && tag.label.toLowerCase() === userTagLabel.toLowerCase()
        )?.id;

        // 3. Filter campaigns by user tag (campaigns have email_tag_list with tag UUIDs)
        const filteredCampaigns = allCampaigns.filter((c: any) => {
            if (c.email_tag_list && Array.isArray(c.email_tag_list) && userTagId) {
                return c.email_tag_list.includes(userTagId);
            }
            return false;
        });

        console.log(`User: ${user}, tagId: ${userTagId}, campaigns: ${filteredCampaigns.length}/${allCampaigns.length}`);

        // 4. Get user's accounts from campaign email_list (deduplicated)
        const userEmailSet = new Set<string>();
        filteredCampaigns.forEach((c: any) => {
            if (c.email_list && Array.isArray(c.email_list)) {
                c.email_list.forEach((email: string) => userEmailSet.add(email));
            }
        });
        const userAccounts = allAccounts.filter((acc: any) => userEmailSet.has(acc.email));
        const totalCapacity = userAccounts.reduce((sum: number, acc: any) => sum + (acc.daily_limit || 50), 0);

        console.log(`User accounts: ${userAccounts.length}, capacity: ${totalCapacity}`);

        // 5. Fetch DAILY analytics for each campaign (the overview endpoint returns org-wide data)
        const dailyPromises = filteredCampaigns.map((c: any) =>
            instantlyService.getCampaignDaily(c.id)
        );
        const allDailyData = await Promise.all(dailyPromises);

        // 6. Aggregate per-campaign stats from daily data
        let overallSends = 0;
        let overallBounces = 0;
        let overallReplies = 0;
        let todaysSends = 0;

        const today = new Date().toISOString().split('T')[0];

        const campaignsWithStats = filteredCampaigns.map((c: any, index: number) => {
            const dailyStats = allDailyData[index] || [];

            let campSent = 0, campBounced = 0, campReplied = 0, campTodaySent = 0;

            if (Array.isArray(dailyStats)) {
                dailyStats.forEach((day: any) => {
                    campSent += day.sent || day.emails_sent_count || 0;
                    // Daily endpoint uses "replies" not "bounced_count"
                    campBounced += day.bounced || day.bounces || day.bounced_count || 0;
                    campReplied += day.replies || day.reply_count || day.unique_replies || 0;
                    if (day.date === today) {
                        campTodaySent += day.sent || day.emails_sent_count || 0;
                    }
                });
            }

            overallSends += campSent;
            overallBounces += campBounced;
            overallReplies += campReplied;
            todaysSends += campTodaySent;

            return {
                id: c.id,
                name: c.name,
                status: c.status,
                dailyLimit: c.daily_limit || 0,
                totalSent: campSent,
                bounceRate: campSent > 0 ? (campBounced / campSent) * 100 : 0,
                replyRate: campSent > 0 ? (campReplied / campSent) * 100 : 0
            };
        });

        const freeCapacity = Math.max(0, totalCapacity - todaysSends);

        // 7. Aggregate daily data into heatmap (date → total sent across all campaigns)
        const dailyMap = new Map<string, number>();
        allDailyData.forEach(campaignDays => {
            if (Array.isArray(campaignDays)) {
                campaignDays.forEach((day: any) => {
                    const date = day.date;
                    if (!date) return;
                    const sent = day.sent || day.emails_sent_count || 0;
                    dailyMap.set(date, (dailyMap.get(date) || 0) + sent);
                });
            }
        });

        const heatmapData = Array.from(dailyMap.entries())
            .map(([date, sent]) => ({
                date,
                sent,
                capacity: totalCapacity,
                usage: totalCapacity > 0 ? (sent / totalCapacity) * 100 : 0
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
