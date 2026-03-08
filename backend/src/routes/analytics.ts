import { Router } from 'express';
import { instantlyService } from '../services/instantly.service.js';
import { dbService } from '../services/supabase.service.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const { user: userParam } = req.query;
        if (!userParam || typeof userParam !== 'string') {
            return res.status(400).json({ error: 'Valid user parameter is required' });
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

        // 3. Find user's tag UUID in Instantly (for campaign filtering)
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

        // 5. Get user accounts using multiple strategies
        let userAccounts: any[] = [];
        let capacityStrategy = 'none';

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
                if (userAccounts.length > 0) capacityStrategy = 'account_tags';
            }
        } catch (e: any) {
            console.warn('Account tag strategy failed:', e.message);
        }

        // Strategy B: Fallback to campaign email_list (if strategy A found nothing)
        if (userAccounts.length === 0) {
            const userEmailSet = new Set<string>();
            filteredCampaigns.forEach((c: any) => {
                if (c.email_list && Array.isArray(c.email_list)) {
                    c.email_list.forEach((email: string) => userEmailSet.add(email));
                }
            });
            if (userEmailSet.size > 0) {
                userAccounts = allAccounts.filter((acc: any) => userEmailSet.has(acc.email));
                capacityStrategy = 'campaign_email_list';
            }
        }

        // Strategy C: Hardcoded fallback for Félix/Árpi (if top strategies fail)
        if (userAccounts.length === 0) {
            const felixEmails = ['bary.felix@prometheusdigital.hu', 'baryf@prometheusdigital.hu', 'baryfelix@prometheusdigital.hu', 'felix.bary@prometheusdigital.hu', 'felixbary@prometheusdigital.hu'];
            const arpiEmails = ['bretz.arpad@prometheusdigital.hu', 'bretza@prometheusdigital.hu', 'arpad.bretz@prometheusdigital.hu', 'arpadbretz@prometheusdigital.hu', 'bretzarpad@prometheusdigital.hu', 'bendeguzbretz@prometheusdigital.hu'];
            const knownEmails = dbUser.display_name === 'Félix' ? felixEmails :
                dbUser.display_name === 'Árpi' ? arpiEmails : [];
            userAccounts = allAccounts.filter((acc: any) => knownEmails.includes(acc.email));
            capacityStrategy = 'known_emails_fallback';
        }

        const totalCapacity = userAccounts.reduce((sum: number, acc: any) => sum + (acc.daily_limit || 50), 0);

        // 6. Fetch daily analytics per campaign AND the org-wide overview (for bounces)
        const [orgOverview, ...allDailyData] = await Promise.all([
            instantlyService.getCampaignOverview(''),
            ...filteredCampaigns.map((c: any) => instantlyService.getCampaignDaily(c.id))
        ]);

        const orgBounceRate = orgOverview && orgOverview.emails_sent_count > 0
            ? (orgOverview.bounced_count / orgOverview.emails_sent_count) * 100
            : 0;

        // 7. Build per-campaign stats from daily data
        let overallSends = 0;
        let overallBounces = 0; // Estimated from org rate
        let overallReplies = 0;
        let todaysSends = 0;
        const todayStr = new Date().toISOString().split('T')[0];

        const campaignsWithStats = filteredCampaigns.map((c: any, index: number) => {
            const dailyStats = allDailyData[index] || [];
            let campSent = 0, campReplied = 0, campTodaySent = 0;

            if (Array.isArray(dailyStats)) {
                dailyStats.forEach((day: any) => {
                    const daySent = day.sent || 0;
                    const dayReplies = day.unique_replies || day.replies || 0;
                    campSent += daySent;
                    campReplied += dayReplies;
                    if (day.date === todayStr) {
                        campTodaySent += daySent;
                    }
                });
            }

            overallSends += campSent;
            overallReplies += campReplied;
            todaysSends += campTodaySent;

            return {
                id: c.id,
                name: c.name,
                status: c.status,
                dailyLimit: c.daily_limit || 0,
                totalSent: campSent,
                bounceRate: orgBounceRate,
                replyRate: campSent > 0 ? (campReplied / campSent) * 100 : 0
            };
        });

        overallBounces = Math.floor(overallSends * (orgBounceRate / 100));
        const freeCapacity = Math.max(0, totalCapacity - todaysSends);

        // 8. Heatmap from daily data
        const dailyMap = new Map<string, number>();
        allDailyData.forEach((campaignDays: any[]) => {
            if (Array.isArray(campaignDays)) {
                campaignDays.forEach((day: any) => {
                    if (!day.date) return;
                    dailyMap.set(day.date, (dailyMap.get(day.date) || 0) + (day.sent || 0));
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
            .slice(-30); // Show up to 30 days of history

        // 9. Save Daily Snapshot to Supabase (Async, don't block response)
        dbService.saveDailySnapshot({
            date: todayStr,
            user_id: dbUser.id,
            total_sends: overallSends,
            total_bounces: overallBounces,
            total_replies: overallReplies,
            capacity_free: freeCapacity
        }).catch(err => console.error('Failed to save snapshot:', err.message));

        res.json({
            user: dbUser.display_name,
            metrics: {
                totalSends: overallSends,
                totalBounces: overallBounces,
                totalReplies: overallReplies,
                bounceRate: orgBounceRate,
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
