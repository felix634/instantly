'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, UserState, UserType, EmailAccount, Campaign } from '../types';
import { supabase } from '../lib/supabase';
import {
    getUserIds,
    getUserTypeByUUID,
    fetchUserState,
    insertAccount,
    updateAccountInDb,
    deleteAccountFromDb,
    insertCampaign,
    updateCampaignInDb,
    deleteCampaignFromDb,
} from '../lib/supabaseData';

interface AppStateContextType {
    user: UserType;
    setUser: (user: UserType) => void;
    state: AppState;
    currentUserState: UserState;
    isLoading: boolean;
    addAccount: (account: Omit<EmailAccount, 'id'>) => void;
    updateAccount: (id: string, data: Partial<Omit<EmailAccount, 'id'>>) => void;
    deleteAccount: (id: string) => void;
    addCampaign: (campaign: Omit<Campaign, 'id'>) => void;
    updateCampaign: (id: string, data: Partial<Omit<Campaign, 'id'>>) => void;
    deleteCampaign: (id: string) => void;
}

const emptyUserState = (): UserState => ({ accounts: [], campaigns: [] });

const defaultState: AppState = {
    felix: emptyUserState(),
    arpi: emptyUserState(),
};

const LEGACY_STORAGE_KEY = 'campaign_planner_state';

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserType>('felix');
    const [state, setState] = useState<AppState>(defaultState);
    const [isLoading, setIsLoading] = useState(true);
    const userIdsRef = useRef<Record<UserType, string> | null>(null);
    // Track in-flight mutation IDs to skip redundant realtime refetches
    const pendingMutationsRef = useRef<Set<string>>(new Set());

    // --- Initial load + localStorage migration ---
    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                const ids = await getUserIds();
                userIdsRef.current = ids;

                const [felixState, arpiState] = await Promise.all([
                    fetchUserState(ids.felix),
                    fetchUserState(ids.arpi),
                ]);

                // If Supabase is empty, try migrating from localStorage
                const supabaseEmpty =
                    felixState.accounts.length === 0 && felixState.campaigns.length === 0 &&
                    arpiState.accounts.length === 0 && arpiState.campaigns.length === 0;

                if (supabaseEmpty && typeof window !== 'undefined') {
                    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
                    if (legacy) {
                        const parsed = JSON.parse(legacy) as AppState;
                        await migrateFromLocalStorage(parsed, ids);
                        // Re-fetch after migration to get server-generated data
                        const [f, a] = await Promise.all([
                            fetchUserState(ids.felix),
                            fetchUserState(ids.arpi),
                        ]);
                        if (!cancelled) {
                            setState({ felix: f, arpi: a });
                            localStorage.removeItem(LEGACY_STORAGE_KEY);
                        }
                        return;
                    }
                }

                if (!cancelled) {
                    setState({ felix: felixState, arpi: arpiState });
                }
            } catch (err) {
                console.error('Failed to load from Supabase:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        init();
        return () => { cancelled = true; };
    }, []);

    // --- Realtime subscriptions ---
    useEffect(() => {
        const channel = supabase
            .channel('cp-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cp_accounts' }, (payload) => {
                handleRealtimeChange(payload);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cp_campaigns' }, (payload) => {
                handleRealtimeChange(payload);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRealtimeChange = useCallback(async (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
        // Determine which user was affected
        const record = (payload.new || payload.old) as Record<string, unknown> | undefined;
        if (!record) return;

        const rowId = record.id as string | undefined;
        if (rowId && pendingMutationsRef.current.has(rowId)) {
            pendingMutationsRef.current.delete(rowId);
            return; // Skip — this is our own mutation echoing back
        }

        const userId = record.user_id as string | undefined;
        if (!userId) return;

        const userType = getUserTypeByUUID(userId);
        if (!userType) return;

        // Refetch the affected user's full state
        try {
            const newUserState = await fetchUserState(userId);
            setState(prev => ({ ...prev, [userType]: newUserState }));
        } catch (err) {
            console.error('Realtime refetch failed:', err);
        }
    }, []);

    // --- Helper to get current user's Supabase UUID ---
    const getCurrentUserId = useCallback(() => {
        if (!userIdsRef.current) throw new Error('User IDs not loaded');
        return userIdsRef.current[user];
    }, [user]);

    // --- Account mutations ---
    const addAccount = useCallback((account: Omit<EmailAccount, 'id'>) => {
        const id = crypto.randomUUID();
        const newAccount: EmailAccount = { ...account, id };

        // Optimistic update
        setState(prev => ({
            ...prev,
            [user]: {
                ...prev[user],
                accounts: [...prev[user].accounts, newAccount],
            },
        }));

        // Persist
        pendingMutationsRef.current.add(id);
        insertAccount(getCurrentUserId(), newAccount).catch(err => {
            console.error('Failed to insert account:', err);
            pendingMutationsRef.current.delete(id);
        });
    }, [user, getCurrentUserId]);

    const updateAccount = useCallback((id: string, data: Partial<Omit<EmailAccount, 'id'>>) => {
        setState(prev => ({
            ...prev,
            [user]: {
                ...prev[user],
                accounts: prev[user].accounts.map(a => a.id === id ? { ...a, ...data } : a),
            },
        }));

        pendingMutationsRef.current.add(id);
        updateAccountInDb(id, data).catch(err => {
            console.error('Failed to update account:', err);
            pendingMutationsRef.current.delete(id);
        });
    }, [user]);

    const deleteAccount = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            [user]: {
                ...prev[user],
                accounts: prev[user].accounts.filter(a => a.id !== id),
                campaigns: prev[user].campaigns.map(c => ({
                    ...c,
                    emailAccountIds: c.emailAccountIds.filter(aid => aid !== id),
                })),
            },
        }));

        pendingMutationsRef.current.add(id);
        deleteAccountFromDb(id).catch(err => {
            console.error('Failed to delete account:', err);
            pendingMutationsRef.current.delete(id);
        });

        // Also update campaigns that reference this account
        setState(prev => {
            const campaignsToUpdate = prev[user].campaigns.filter(c => c.emailAccountIds.includes(id));
            for (const c of campaignsToUpdate) {
                const newIds = c.emailAccountIds.filter(aid => aid !== id);
                updateCampaignInDb(c.id, { emailAccountIds: newIds }).catch(err => {
                    console.error('Failed to update campaign after account delete:', err);
                });
            }
            return prev;
        });
    }, [user]);

    // --- Campaign mutations ---
    const addCampaign = useCallback((campaign: Omit<Campaign, 'id'>) => {
        const id = crypto.randomUUID();
        const newCampaign: Campaign = { ...campaign, id };

        setState(prev => ({
            ...prev,
            [user]: {
                ...prev[user],
                campaigns: [...prev[user].campaigns, newCampaign],
            },
        }));

        pendingMutationsRef.current.add(id);
        insertCampaign(getCurrentUserId(), newCampaign).catch(err => {
            console.error('Failed to insert campaign:', err);
            pendingMutationsRef.current.delete(id);
        });
    }, [user, getCurrentUserId]);

    const updateCampaign = useCallback((id: string, data: Partial<Omit<Campaign, 'id'>>) => {
        setState(prev => ({
            ...prev,
            [user]: {
                ...prev[user],
                campaigns: prev[user].campaigns.map(c => c.id === id ? { ...c, ...data } : c),
            },
        }));

        pendingMutationsRef.current.add(id);
        updateCampaignInDb(id, data).catch(err => {
            console.error('Failed to update campaign:', err);
            pendingMutationsRef.current.delete(id);
        });
    }, [user]);

    const deleteCampaign = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            [user]: {
                ...prev[user],
                campaigns: prev[user].campaigns.filter(c => c.id !== id),
            },
        }));

        pendingMutationsRef.current.add(id);
        deleteCampaignFromDb(id).catch(err => {
            console.error('Failed to delete campaign:', err);
            pendingMutationsRef.current.delete(id);
        });
    }, [user]);

    return (
        <AppStateContext.Provider value={{
            user, setUser, state, isLoading,
            currentUserState: state[user],
            addAccount, updateAccount, deleteAccount,
            addCampaign, updateCampaign, deleteCampaign,
        }}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = () => {
    const ctx = useContext(AppStateContext);
    if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
    return ctx;
};

// Keep old useUser working for UserToggle compatibility
export const useUser = useAppState;

// --- localStorage → Supabase one-time migration ---
async function migrateFromLocalStorage(appState: AppState, ids: Record<UserType, string>) {
    const users: UserType[] = ['felix', 'arpi'];

    for (const userType of users) {
        const us = appState[userType];
        if (!us) continue;

        const userId = ids[userType];

        // Migrate accounts (generate new UUIDs)
        const oldToNewId: Record<string, string> = {};
        for (const acc of us.accounts) {
            const newId = crypto.randomUUID();
            oldToNewId[acc.id] = newId;
            await insertAccount(userId, { ...acc, id: newId });
        }

        // Migrate campaigns with remapped account IDs
        for (const camp of us.campaigns) {
            const newId = crypto.randomUUID();
            const remappedAccountIds = camp.emailAccountIds
                .map(oldId => oldToNewId[oldId])
                .filter(Boolean);
            await insertCampaign(userId, {
                ...camp,
                id: newId,
                emailAccountIds: remappedAccountIds,
            });
        }
    }
}
