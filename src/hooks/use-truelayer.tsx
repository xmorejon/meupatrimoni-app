import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

// Get references to our new backend functions
const getAuthLink = httpsCallable(functions, 'getTrueLayerAuthLink');
const handleCallback = httpsCallable(functions, 'handleTrueLayerCallback');

export const useTrueLayer = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Step 1: Get the authentication URL from our backend and redirect the user.
     */
    const connect = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getAuthLink();
            const { authUrl } = result.data as { authUrl: string };
            // Redirect the user to the TrueLayer auth page
            window.location.href = authUrl;
        } catch (err) {
            console.error("Error getting TrueLayer auth link:", err);
            setError("Could not initiate connection with TrueLayer.");
            setIsLoading(false);
        }
    };

    /**
     * Step 2: Handle the callback from TrueLayer after user authorization.
     */
    const exchangeCode = async (code: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await handleCallback({ code });
            console.log("Successfully exchanged code and fetched accounts:", result.data);
            return { success: true };
        } catch (err) {
            console.error("Error exchanging TrueLayer code:", err);
            setError("Failed to connect accounts.");
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    };

    return { connect, exchangeCode, isLoading, error };
};