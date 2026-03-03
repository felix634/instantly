const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = {
    async getAnalytics(user: 'felix' | 'arpi') {
        const response = await fetch(`${API_BASE_URL}/analytics?user=${user}`);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        return response.json();
    },

    async getAccounts(user: 'felix' | 'arpi') {
        const response = await fetch(`${API_BASE_URL}/accounts/${user}`);
        if (!response.ok) throw new Error('Failed to fetch accounts');
        return response.json();
    },

    async getRecommendation(data: {
        user: 'felix' | 'arpi';
        leadCount: number;
        followUpCount: number;
        intervalDays: number;
    }) {
        const response = await fetch(`${API_BASE_URL}/recommend-schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to get recommendation');
        return response.json();
    }
};
