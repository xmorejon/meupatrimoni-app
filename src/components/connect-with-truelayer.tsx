import React from 'react';
import { useTrueLayer } from '../hooks/use-truelayer';
import { Button } from './ui/button';

interface ConnectWithTrueLayerProps {
  disabled?: boolean;
}

const ConnectWithTrueLayer: React.FC<ConnectWithTrueLayerProps> = ({ disabled }) => {
    // Use the hook we just created
    const { connect, isLoading, error } = useTrueLayer();

    const handleConnect = () => {
        connect();
    };

    return (
        <div>
            <Button onClick={handleConnect} disabled={disabled || isLoading}>
                {isLoading ? 'Connecting...' : 'Connect with TrueLayer'}
            </Button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default ConnectWithTrueLayer;