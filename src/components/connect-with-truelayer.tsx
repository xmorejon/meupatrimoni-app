import React from 'react';
import { useTrueLayer } from '../hooks/use-truelayer';
import { Button } from './ui/button';

const ConnectWithTrueLayer: React.FC = () => {
    // Use the hook we just created
    const { connect, isLoading, error } = useTrueLayer();

    const handleConnect = () => {
        connect();
    };

    return (
        <div>
            <Button onClick={handleConnect} disabled={isLoading}>
                {isLoading ? 'Connecting...' : 'Connect with TrueLayer'}
            </Button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default ConnectWithTrueLayer;