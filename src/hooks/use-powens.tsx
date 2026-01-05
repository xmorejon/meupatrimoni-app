import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/config'; // Assuming you have this configured

// Define the structure of the response from our cloud function
interface ImportResult {
  success: boolean;
  message: string;
}

// Update the callable function arguments
interface ExchangeCodeArgs {
  authorizationCode: string;
  redirectUri: string;
}

export const usePowens = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calls the cloud function to get a temporary access token from Powens.
   */
  const getAccessToken = async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const getPowensAccessToken = httpsCallable(functions, 'getPowensAccessToken');
      const result = await getPowensAccessToken();
      const token = (result.data as { accessToken: string }).accessToken;
      return token;
    } catch (err: any) {
      console.error('Error getting Powens access token:', err);
      setError(err.message || 'An unknown error occurred.');
      return null;
    } finally {
      setIsLoading(false); 
    }
  };

  /**
   * Calls the cloud function to exchange an authorization code for bank accounts.
   * @param authorizationCode The code received from Powens Connect UI on success.
   * @param redirectUri The URI the Powens widget used for the redirect.
   */
  const exchangeCodeAndImport = async (authorizationCode: string, redirectUri: string): Promise<ImportResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const exchangeFunction = httpsCallable<ExchangeCodeArgs, ImportResult>(
        functions,
        'exchangeAuthorizationCodeAndFetchAccounts'
      );
      // Pass both the code and the redirect URI
      const result = await exchangeFunction({ authorizationCode, redirectUri });
      return result.data;
    } catch (err: any) {
      console.error('Error exchanging authorization code:', err);
      setError(err.message || 'An unknown error occurred during import.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { getAccessToken, exchangeCodeAndImport, isLoading, error };
};