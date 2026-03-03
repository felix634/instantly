import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const dbService = {
    /**
     * Get user by their Instantly tag
     */
    async getUserByTag(tag: string) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('instantly_tag', tag)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get all users
     */
    async getUsers() {
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) throw error;
        return data;
    },

    /**
     * Save daily snapshots for a user
     */
    async saveDailySnapshot(snapshot: {
        date: string;
        user_id: string;
        total_sends: number;
        total_bounces: number;
        total_replies: number;
        capacity_free: number;
    }) {
        const { data, error } = await supabase
            .from('daily_snapshots')
            .upsert(snapshot, { onConflict: 'date, user_id' });

        if (error) throw error;
        return data;
    },

    /**
     * Get historical snapshots for a user
     */
    async getHistoricalSnapshots(userId: string, limit: number = 30) {
        const { data, error } = await supabase
            .from('daily_snapshots')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
};
