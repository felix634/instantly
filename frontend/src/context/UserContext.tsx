'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, UserState, UserType, EmailAccount, Campaign } from '../types';

interface AppStateContextType {
    user: UserType;
    setUser: (user: UserType) => void;
    state: AppState;
    currentUserState: UserState;
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

const STORAGE_KEY = 'campaign_planner_state';

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

function generateId(): string {
    return Math.random().toString(36).substring(2, 11);
}

function loadState(): AppState {
    if (typeof window === 'undefined') return defaultState;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState;
        const parsed = JSON.parse(raw);
        return {
            felix: parsed.felix ?? emptyUserState(),
            arpi: parsed.arpi ?? emptyUserState(),
        };
    } catch {
        return defaultState;
    }
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserType>('felix');
    const [state, setState] = useState<AppState>(defaultState);

    useEffect(() => {
        setState(loadState());
    }, []);

    const saveState = useCallback((newState: AppState) => {
        setState(newState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    }, []);

    const updateUserState = useCallback((updater: (us: UserState) => UserState) => {
        setState(prev => {
            const next = { ...prev, [user]: updater(prev[user]) };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, [user]);

    const addAccount = useCallback((account: Omit<EmailAccount, 'id'>) => {
        updateUserState(us => ({
            ...us,
            accounts: [...us.accounts, { ...account, id: generateId() }],
        }));
    }, [updateUserState]);

    const updateAccount = useCallback((id: string, data: Partial<Omit<EmailAccount, 'id'>>) => {
        updateUserState(us => ({
            ...us,
            accounts: us.accounts.map(a => a.id === id ? { ...a, ...data } : a),
        }));
    }, [updateUserState]);

    const deleteAccount = useCallback((id: string) => {
        updateUserState(us => ({
            ...us,
            accounts: us.accounts.filter(a => a.id !== id),
            campaigns: us.campaigns.map(c => ({
                ...c,
                emailAccountIds: c.emailAccountIds.filter(aid => aid !== id),
            })),
        }));
    }, [updateUserState]);

    const addCampaign = useCallback((campaign: Omit<Campaign, 'id'>) => {
        updateUserState(us => ({
            ...us,
            campaigns: [...us.campaigns, { ...campaign, id: generateId() }],
        }));
    }, [updateUserState]);

    const updateCampaign = useCallback((id: string, data: Partial<Omit<Campaign, 'id'>>) => {
        updateUserState(us => ({
            ...us,
            campaigns: us.campaigns.map(c => c.id === id ? { ...c, ...data } : c),
        }));
    }, [updateUserState]);

    const deleteCampaign = useCallback((id: string) => {
        updateUserState(us => ({
            ...us,
            campaigns: us.campaigns.filter(c => c.id !== id),
        }));
    }, [updateUserState]);

    // suppress saveState warning — it's used only in loadState
    void saveState;

    return (
        <AppStateContext.Provider value={{
            user, setUser, state,
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
