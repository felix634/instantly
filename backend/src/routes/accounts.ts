import { Router } from 'express';
import { instantlyService } from '../services/instantly.service.js';

const router = Router();

router.get('/:user', async (req, res) => {
    try {
        const { user } = req.params;
        if (!user || (user !== 'felix' && user !== 'arpi')) {
            return res.status(400).json({ error: 'Valid user parameter (felix or arpi) is required' });
        }

        const userTag = user === 'felix' ? 'Félix manageli' : 'Árpi manageli';

        // 1. Fetch all accounts from Instantly
        const allAccounts = await instantlyService.getAccounts();

        // 2. Filter by user tag
        // If accounts in V2 are not directly tagged, we might need to filter by some other property
        // For now, we assume all accounts are visible and we filter them based on the task's logic
        const filteredAccounts = allAccounts; // Simplified filtering for now

        res.json({
            user: user === 'felix' ? 'Félix' : 'Árpi',
            accounts: filteredAccounts
        });
    } catch (error: any) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ error: 'Failed to fetch accounts', message: error.message });
    }
});

export default router;
