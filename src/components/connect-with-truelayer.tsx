import React from 'react';
import { useTrueLayer } from '../hooks/use-truelayer';
import { Button, type ButtonProps } from './ui/button';

interface ConnectWithTrueLayerProps {
  disabled?: boolean;
  variant?: ButtonProps['variant'];
}

const ConnectWithTrueLayer: React.FC<ConnectWithTrueLayerProps> = ({ disabled, variant }) => {
    // Use the hook we just created
    const { connect, isLoading, error } = useTrueLayer();

    const handleConnect = () => {
        connect();
    };

    return (
        <div>
            <Button onClick={handleConnect} disabled={disabled || isLoading} variant={variant}>
                {isLoading ? 'Connecting...' : 'Connect with TrueLayer'}
            </Button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default ConnectWithTrueLayer;
