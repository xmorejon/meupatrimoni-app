import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import type { Bank, Debt, Asset } from '@/lib/types';

const getAuthLink = httpsCallable(functions, 'getTrueLayerAuthLink');
const handleCallback = httpsCallable(functions, 'handleTrueLayerCallback');

type TrueLayerAccount = (Bank | Debt | Asset) & { importType: string };

export const useTrueLayer = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const connect = async () => {
        setIsLoading(true);
        setError(null);
        console.log("useTrueLayer: Initiating connection...");
        try {
            const result = await getAuthLink();
            const { authUrl } = result.data as { authUrl: string };
            console.log("useTrueLayer: Received auth URL, redirecting...");
            window.location.href = authUrl;
        } catch (err) {
            console.error("useTrueLayer: Error getting TrueLayer auth link:", err);
            setError("Could not initiate connection with TrueLayer.");
            setIsLoading(false);
        }
    };

    const exchangeCode = async (code: string): Promise<{ success: boolean; accounts: TrueLayerAccount[] }> => {
        setIsLoading(true);
        setError(null);
        console.log(`useTrueLayer: Attempting to exchange code: ${code}`);
        try {
            const result = await handleCallback({ code });
            const data = result.data as { success: boolean; accounts: TrueLayerAccount[] };
            console.log("useTrueLayer: Successfully exchanged code. Received data:", data);
            return { success: true, accounts: data.accounts || [] };
        } catch (err) {
            console.error("useTrueLayer: Error exchanging TrueLayer code:", err);
            setError("Failed to connect accounts.");
            return { success: false, accounts: [] };
        } finally {
            setIsLoading(false);
            console.log("useTrueLayer: Finished exchangeCode process.");
        }
    };

    return { connect, exchangeCode, isLoading, error };
};