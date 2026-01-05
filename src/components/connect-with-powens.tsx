import React, { useEffect } from 'react';
import { usePowens } from '@/hooks/use-powens';

// Add a script tag to the head to load the Powens Connect UI library
const loadPowensScript = () => {
    if (document.getElementById('powens-connect-script')) return;
    const script = document.createElement('script');
    script.id = 'powens-connect-script';
    script.src = 'https://cdn.powens.com/connect/v2/loader.js';
    script.async = true;
    document.head.appendChild(script);
};

declare global {
    interface Window {
        BudgetInsight: any;
    }
}

export const ConnectWithPowens = () => {
    const { getAccessToken, exchangeCodeAndImport, isLoading, error } = usePowens();

    useEffect(() => {
        loadPowensScript();
    }, []);

    const handleConnect = async () => {
        const token = await getAccessToken();
        if (!token || !window.BudgetInsight) return;

        // Dynamically determine the redirect URI based on the current environment
        const isProduction = process.env.NODE_ENV === 'production';
        const redirectUri = isProduction 
            ? 'https://meupatrimoni-app.web.app/callback' // Correct production URL
            : 'http://localhost/callback'; // Your local development URL

        window.BudgetInsight.init({
            accessToken: token,
            redirectUri: redirectUri, // Use the dynamic URI
            onSuccess: async (authorizationCode: string) => {
                console.log('Powens Connect successful, received code:', authorizationCode);
                // Pass the same redirectUri to the backend function
                const result = await exchangeCodeAndImport(authorizationCode, redirectUri);
                if (result?.success) {
                    alert(result.message); // Or any other success notification
                } else {
                    console.error('Failed to import accounts.');
                }
            },
            onError: (err: any) => {
                console.error('Powens Connect failed:', err);
                alert(`Connection failed: ${err.message}`);
            },
            onClose: () => {
                console.log('User closed Powens Connect.');
            }
        });
    };

    return (
        <div>
            <button onClick={handleConnect} disabled={isLoading}>
                {isLoading ? 'Connecting...' : 'Connect Bank Accounts'}
            </button>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        </div>
    );
};
