import { Router } from 'express';
import { instantlyService } from '../services/instantly.service.js';
import { dbService } from '../services/supabase.service.js';

const router = Router();

router.get('/:user', async (req, res) => {
    try {
        const { user: userParam } = req.params;
        if (!userParam) {
            return res.status(400).json({ error: 'User parameter is required' });
        }

        // 1. Fetch user from Supabase
        const dbUser = await dbService.getUserByDisplayName(userParam);
        if (!dbUser) {
            return res.status(404).json({ error: `User ${userParam} not found in database` });
        }

        const userTagLabel = dbUser.instantly_tag;

        // 2. Fetch all accounts from Instantly
        const allAccounts = await instantlyService.getAccounts();

        // 3. Filter by user tag (using same fallback strategies as analytics)
        let userAccounts: any[] = [];

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

        if (userAccounts.length === 0) {
            // Hardcoded fallback Consistency
            const felixEmails = ['bary.felix@prometheusdigital.hu', 'baryf@prometheusdigital.hu', 'baryfelix@prometheusdigital.hu', 'felix.bary@prometheusdigital.hu', 'felixbary@prometheusdigital.hu'];
            const arpiEmails = ['bretz.arpad@prometheusdigital.hu', 'bretza@prometheusdigital.hu', 'arpad.bretz@prometheusdigital.hu', 'arpadbretz@prometheusdigital.hu', 'bretzarpad@prometheusdigital.hu', 'bendeguzbretz@prometheusdigital.hu'];
            const knownEmails = dbUser.display_name === 'Félix' ? felixEmails :
                dbUser.display_name === 'Árpi' ? arpiEmails : [];
            userAccounts = allAccounts.filter((acc: any) => knownEmails.includes(acc.email));
        }

        res.json({
            user: dbUser.display_name,
            accounts: userAccounts
        });
    } catch (error: any) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ error: 'Failed to fetch accounts', message: error.message });
    }
});

export default router;
