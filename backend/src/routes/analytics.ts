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

        // 1. Fetch base data
        const [allAccounts, allCampaigns, allTags] = await Promise.all([
            instantlyService.getAccounts(),
            instantlyService.getCampaigns(),
            instantlyService.getTags('campaign')
        ]);

        // 2. Find user's tag UUID
        const userTagId = allTags.find((tag: any) =>
            tag.label && tag.label.toLowerCase() === userTagLabel.toLowerCase()
        )?.id;

        // 3. Filter campaigns by user tag
        const filteredCampaigns = allCampaigns.filter((c: any) => {
            if (c.email_tag_list && Array.isArray(c.email_tag_list) && userTagId) {
                return c.email_tag_list.includes(userTagId);
            }
            return false;
        });

        console.log(`User: ${user}, tagId: ${userTagId}, campaigns: ${filteredCampaigns.length}`);

        // 4. Get user accounts using multiple strategies
        let userAccounts: any[] = [];
        let capacityDebug: any = {};

        // Strategy A: Try fetching account tags
        try {
            const accountTags = await instantlyService.getTags('email_account' as any);
            const accountUserTagId = accountTags.find((t: any) =>
                t.label && t.label.toLowerCase() === userTagLabel.toLowerCase()
            )?.id;

            capacityDebug.accountTagsCount = accountTags.length;
            capacityDebug.accountUserTagId = accountUserTagId;

            if (accountUserTagId) {
                const allMappings = await instantlyService.getTagMappings(accountUserTagId);
                // API may return all mappings — filter client-side by tag_id
                const accountMappings = allMappings.filter((m: any) => m.tag_id === accountUserTagId);
                capacityDebug.totalMappings = allMappings.length;
                capacityDebug.filteredMappings = accountMappings.length;
                capacityDebug.accountMappingSample = accountMappings.slice(0, 3);

                // resource_id might be email or UUID — try matching both
                const mappedResourceIds = accountMappings.map((m: any) => m.resource_id);
                userAccounts = allAccounts.filter((acc: any) =>
                    mappedResourceIds.includes(acc.email) || mappedResourceIds.includes(acc.id)
                );
                capacityDebug.strategy = userAccounts.length > 0 ? 'account_tags_filtered' : 'account_tags_no_match';
            }
        } catch (e: any) {
            capacityDebug.accountTagsError = e.message;
        }

        // Strategy B: If no accounts found, try campaign email_list
        if (userAccounts.length === 0) {
            const userEmailSet = new Set<string>();
            filteredCampaigns.forEach((c: any) => {
                if (c.email_list && Array.isArray(c.email_list)) {
                    c.email_list.forEach((email: string) => userEmailSet.add(email));
                }
            });
            if (userEmailSet.size > 0) {
                userAccounts = allAccounts.filter((acc: any) => userEmailSet.has(acc.email));
                capacityDebug.strategy = 'campaign_email_list';
                capacityDebug.emailSet = [...userEmailSet];
            }
        }

        // Strategy C: If still no accounts, use all accounts / number of users
        if (userAccounts.length === 0) {
            // Felix's known emails (from user's screenshot) - hardcoded fallback
            const felixEmails = ['bary.felix@prometheusdigital.hu', 'baryf@prometheusdigital.hu', 'baryfelix@prometheusdigital.hu', 'felix.bary@prometheusdigital.hu', 'felixbary@prometheusdigital.hu'];
            const arpiEmails = ['bretz.arpad@prometheusdigital.hu', 'bretza@prometheusdigital.hu', 'arpad.bretz@prometheusdigital.hu', 'arpadbretz@prometheusdigital.hu', 'bretzarpad@prometheusdigital.hu', 'bendeguzbretz@prometheusdigital.hu'];
            const knownEmails = user === 'felix' ? felixEmails : arpiEmails;
            userAccounts = allAccounts.filter((acc: any) => knownEmails.includes(acc.email));
            capacityDebug.strategy = 'known_emails_fallback';
        }

        const totalCapacity = userAccounts.reduce((sum: number, acc: any) => sum + (acc.daily_limit || 50), 0);
        capacityDebug.matchedAccounts = userAccounts.map((a: any) => a.email);
        capacityDebug.totalCapacity = totalCapacity;

        console.log(`User accounts: ${userAccounts.length}, capacity: ${totalCapacity}, strategy: ${capacityDebug.strategy}`);

        // 5. Fetch daily analytics per campaign AND the org-wide overview (for bounces)
        const [orgOverview, ...allDailyData] = await Promise.all([
            instantlyService.getCampaignOverview(''), // empty = org-wide (it ignores campaign_id anyway)
            ...filteredCampaigns.map((c: any) => instantlyService.getCampaignDaily(c.id))
        ]);

        // Org-wide bounce rate from overview (only source of bounce data)
        const orgBounceRate = orgOverview && orgOverview.emails_sent_count > 0
            ? (orgOverview.bounced_count / orgOverview.emails_sent_count) * 100
            : 0;

        // 6. Build per-campaign stats from daily data
        let overallSends = 0;
        let overallReplies = 0;
        let todaysSends = 0;
        const today = new Date().toISOString().split('T')[0];

        const campaignsWithStats = filteredCampaigns.map((c: any, index: number) => {
            const dailyStats = allDailyData[index] || [];

            let campSent = 0, campReplied = 0, campTodaySent = 0;

            if (Array.isArray(dailyStats)) {
                dailyStats.forEach((day: any) => {
                    const daySent = day.sent || 0;
                    const dayReplies = day.unique_replies || day.replies || 0;
                    campSent += daySent;
                    campReplied += dayReplies;
                    if (day.date === today) {
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
                // Per-campaign bounce rate not available from API — use org-wide rate as estimate
                bounceRate: orgBounceRate,
                replyRate: campSent > 0 ? (campReplied / campSent) * 100 : 0
            };
        });

        const freeCapacity = Math.max(0, totalCapacity - todaysSends);

        // 7. Heatmap from daily data
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
            .slice(-14);

        res.json({
            user: user === 'felix' ? 'Félix' : 'Árpi',
            metrics: {
                totalSends: overallSends,
                totalBounces: orgOverview?.bounced_count || 0,
                totalReplies: overallReplies,
                bounceRate: orgBounceRate,
                replyRate: overallSends > 0 ? (overallReplies / overallSends) * 100 : 0,
                activeCampaignsCount: filteredCampaigns.filter((c: any) => c.status === 1).length,
                totalCapacity,
                freeCapacity,
                freeCapacityPercentage: totalCapacity > 0 ? (freeCapacity / totalCapacity) * 100 : 0
            },
            campaigns: campaignsWithStats,
            heatmap: heatmapData,
            _debug: {
                capacityDebug,
                userAccountsCount: userAccounts.length,
                matchedEmails: userAccounts.map((a: any) => a.email),
                allAccountEmails: allAccounts.map((a: any) => a.email)
            }
        });
    } catch (error: any) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics', message: error.message });
    }
});

export default router;
