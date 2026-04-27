import { supabase } from './supabase';
import type { UserType, UserState, EmailAccount, Campaign, AccountTag } from '../types';

// Cache user UUID mapping
let userIdCache: Record<UserType, string> | null = null;

export async function getUserIds(): Promise<Record<UserType, string>> {
    if (userIdCache) return userIdCache;

    const { data, error } = await supabase
        .from('users')
        .select('id, slug')
        .in('slug', ['felix', 'arpi']);

    if (error) throw error;
    if (!data || data.length < 2) throw new Error('Users not found in database');

    userIdCache = {
        felix: data.find((u: { slug: string }) => u.slug === 'felix')!.id,
        arpi: data.find((u: { slug: string }) => u.slug === 'arpi')!.id,
    };
    return userIdCache;
}

export function getUserTypeByUUID(uuid: string): UserType | null {
    if (!userIdCache) return null;
    if (userIdCache.felix === uuid) return 'felix';
    if (userIdCache.arpi === uuid) return 'arpi';
    return null;
}

// --- Fetch ---

export async function fetchUserState(userId: string): Promise<UserState> {
    const [accountsRes, campaignsRes, tagsRes] = await Promise.all([
        supabase.from('cp_accounts').select('*').eq('user_id', userId),
        supabase.from('cp_campaigns').select('*').eq('user_id', userId),
        supabase.from('cp_account_tags').select('*').eq('user_id', userId),
    ]);

    if (accountsRes.error) throw accountsRes.error;
    if (campaignsRes.error) throw campaignsRes.error;
    if (tagsRes.error) throw tagsRes.error;

    const accounts: EmailAccount[] = (accountsRes.data || []).map(mapAccountFromDb);
    const campaigns: Campaign[] = (campaignsRes.data || []).map(mapCampaignFromDb);
    const tags: AccountTag[] = (tagsRes.data || []).map(mapTagFromDb);

    return { accounts, campaigns, tags };
}

// --- Accounts ---

export async function insertAccount(userId: string, account: EmailAccount) {
    const { error } = await supabase.from('cp_accounts').insert({
        id: account.id,
        user_id: userId,
        email: account.email,
        daily_limit: account.dailyLimit,
        tag_ids: account.tagIds,
    });
    if (error) throw error;
}

export async function updateAccountInDb(id: string, data: Partial<Omit<EmailAccount, 'id'>>) {
    const dbData: Record<string, unknown> = {};
    if (data.email !== undefined) dbData.email = data.email;
    if (data.dailyLimit !== undefined) dbData.daily_limit = data.dailyLimit;
    if (data.tagIds !== undefined) dbData.tag_ids = data.tagIds;

    const { error } = await supabase.from('cp_accounts').update(dbData).eq('id', id);
    if (error) throw error;
}

export async function deleteAccountFromDb(id: string) {
    const { error } = await supabase.from('cp_accounts').delete().eq('id', id);
    if (error) throw error;
}

// --- Campaigns ---

export async function insertCampaign(userId: string, campaign: Campaign) {
    const { error } = await supabase.from('cp_campaigns').insert(mapCampaignToDb(userId, campaign));
    if (error) throw error;
}

export async function updateCampaignInDb(id: string, data: Partial<Omit<Campaign, 'id'>>) {
    const dbData: Record<string, unknown> = {};
    if (data.name !== undefined) dbData.name = data.name;
    if (data.leads !== undefined) dbData.leads = data.leads;
    if (data.dailyMaxEmails !== undefined) dbData.daily_max_emails = data.dailyMaxEmails;
    if (data.sequences !== undefined) dbData.sequences = data.sequences;
    if (data.sendDays !== undefined) dbData.send_days = data.sendDays;
    if (data.nextMessageDays !== undefined) dbData.next_message_days = data.nextMessageDays;
    if (data.bounces !== undefined) dbData.bounces = data.bounces;
    if (data.replies !== undefined) dbData.replies = data.replies;
    if (data.unsubscribed !== undefined) dbData.unsubscribed = data.unsubscribed;
    if (data.emailAccountIds !== undefined) dbData.email_account_ids = data.emailAccountIds;
    if (data.startDate !== undefined) dbData.start_date = data.startDate || null;
    if (data.finished !== undefined) dbData.finished = data.finished;
    if (data.pausedWeeks !== undefined) dbData.paused_weeks = data.pausedWeeks;

    const { error } = await supabase.from('cp_campaigns').update(dbData).eq('id', id);
    if (error) throw error;
}

export async function deleteCampaignFromDb(id: string) {
    const { error } = await supabase.from('cp_campaigns').delete().eq('id', id);
    if (error) throw error;
}

// --- Tags ---

export async function insertTag(userId: string, tag: AccountTag) {
    const { error } = await supabase.from('cp_account_tags').insert({
        id: tag.id,
        user_id: userId,
        name: tag.name,
        color: tag.color,
    });
    if (error) throw error;
}

export async function updateTagInDb(id: string, data: Partial<Omit<AccountTag, 'id'>>) {
    const dbData: Record<string, unknown> = {};
    if (data.name !== undefined) dbData.name = data.name;
    if (data.color !== undefined) dbData.color = data.color;
    const { error } = await supabase.from('cp_account_tags').update(dbData).eq('id', id);
    if (error) throw error;
}

export async function deleteTagFromDb(id: string) {
    const { error } = await supabase.from('cp_account_tags').delete().eq('id', id);
    if (error) throw error;
}

// --- Mapping helpers ---

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapAccountFromDb(row: any): EmailAccount {
    return {
        id: row.id,
        email: row.email,
        dailyLimit: row.daily_limit,
        tagIds: row.tag_ids || [],
    };
}

function mapCampaignFromDb(row: any): Campaign {
    return {
        id: row.id,
        name: row.name,
        leads: row.leads,
        dailyMaxEmails: row.daily_max_emails,
        sequences: row.sequences,
        sendDays: row.send_days,
        nextMessageDays: row.next_message_days,
        bounces: row.bounces,
        replies: row.replies,
        unsubscribed: row.unsubscribed || 0,
        emailAccountIds: row.email_account_ids || [],
        startDate: row.start_date || '',
        finished: row.finished || false,
        pausedWeeks: row.paused_weeks || [],
    };
}

function mapCampaignToDb(userId: string, c: Campaign) {
    return {
        id: c.id,
        user_id: userId,
        name: c.name,
        leads: c.leads,
        daily_max_emails: c.dailyMaxEmails,
        sequences: c.sequences,
        send_days: c.sendDays,
        next_message_days: c.nextMessageDays,
        bounces: c.bounces,
        replies: c.replies,
        unsubscribed: c.unsubscribed,
        email_account_ids: c.emailAccountIds,
        start_date: c.startDate || null,
        finished: c.finished || false,
        paused_weeks: c.pausedWeeks || [],
    };
}

function mapTagFromDb(row: any): AccountTag {
    return {
        id: row.id,
        name: row.name,
        color: row.color || 'primary',
    };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
