'use client';

import { useState, useCallback } from 'react';
import { auth, getAuthLink, handleCallback } from '../firebase/config';
import type { Bank, Debt, Asset } from '@/lib/types';

type TrueLayerAccount = (Bank | Debt | Asset) & { importType: string };

interface ExchangeResult {
    success: boolean;
    accounts: TrueLayerAccount[];
    error?: string;
}

export const useTrueLayer = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const connect = useCallback(async () => {
        console.log("useTrueLayer.connect: Initiating connection.");
        setIsLoading(true);
        setError(null);
        try {
            console.log("useTrueLayer.connect: Awaiting auth state ready.");
            await auth.authStateReady();
            const user = auth.currentUser;
            if (!user) {
                throw new Error("User not authenticated.");
            }
            console.log("useTrueLayer.connect: User authenticated, UID:", user.uid);
            console.log("useTrueLayer.connect: Forcing token refresh.");
            await user.getIdToken(true);
            console.log("useTrueLayer.connect: Token refreshed, calling getAuthLink function.");
            const result = await getAuthLink();
            console.log("useTrueLayer.connect: getAuthLink function returned.", result);
            const { authUrl } = result.data as { authUrl: string };
            window.location.href = authUrl;
        } catch (err: any) {
            console.error("useTrueLayer.connect: Error getting auth link:", err);
            setError(err.message || "Could not initiate connection.");
            setIsLoading(false);
        }
    }, []);

    const exchangeCode = useCallback(async (code: string): Promise<ExchangeResult> => {
        console.log("useTrueLayer.exchangeCode: Starting code exchange process.");
        setIsLoading(true);
        setError(null);

        try {
            console.log("useTrueLayer.exchangeCode: Awaiting auth state ready.");
            await auth.authStateReady();
            const user = auth.currentUser;

            if (!user) {
                throw new Error("User not authenticated after redirect.");
            }
            console.log("useTrueLayer.exchangeCode: User authenticated, UID:", user.uid);

            console.log("useTrueLayer.exchangeCode: Forcing token refresh before backend call.");
            await user.getIdToken(true);
            console.log("useTrueLayer.exchangeCode: Token refreshed. Calling handleCallback function now.");

            const result = await handleCallback({ code });
            
            console.log("useTrueLayer.exchangeCode: handleCallback function returned a result.", result);
            const data = result.data as { success: boolean; accounts: TrueLayerAccount[] };

            if (!data.success) {
                console.error("useTrueLayer.exchangeCode: Backend operation was not successful.", data);
                throw new Error("Backend failed to exchange the code.");
            }
            
            console.log("useTrueLayer.exchangeCode: Exchange successful.");
            return { success: true, accounts: data.accounts || [] };

        } catch (err: any) {
            console.error("useTrueLayer.exchangeCode: An error occurred.", err);
            const errorMessage = err.message || "Failed to connect accounts.";
            setError(errorMessage);
            return { success: false, accounts: [], error: errorMessage };

        } finally {
            console.log("useTrueLayer.exchangeCode: Finished, setting isLoading to false.");
            setIsLoading(false);
        }
    }, []);

    return { connect, exchangeCode, isLoading, error };
};
