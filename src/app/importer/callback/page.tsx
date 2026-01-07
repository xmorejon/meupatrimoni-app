'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/components/ui/use-toast";
import { useTrueLayer } from "@/hooks/use-truelayer";
import { AuthProvider, useAuth } from '@/context/AuthContext';

function CallbackProcessor() {
    const router = useRouter();
    const { toast } = useToast();
    const { exchangeCode } = useTrueLayer();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (loading) {
            return;
        }

        const code = localStorage.getItem('truelayer_code');
        const error = localStorage.getItem('truelayer_error');

        if (code) {
            localStorage.removeItem('truelayer_code');
            toast({ title: "Processant connexió...", description: "Un moment, si us plau." });

            exchangeCode(code).then(result => {
                if (result.success) {
                    toast({ title: "Connexió Exitosa!", description: `S'han importat correctament els comptes.` });
                } else {
                    toast({ variant: "destructive", title: "Error de Connexió", description: result.error || "No s'ha pogut connectar el teu compte bancari." });
                }
                router.replace('/');
            });

        } else if (error) {
            localStorage.removeItem('truelayer_error');
            toast({ variant: "destructive", title: "Error en l'Autorització", description: error });
            router.replace('/');
        } else {
            router.replace('/');
        }

    }, [loading, user, router, toast, exchangeCode]);

    return (
        <div className="flex justify-center items-center h-screen">
            <p>Finalitzant la connexió... Seràs redirigit en breus moments.</p>
        </div>
    );
}

export default function TrueLayerCallbackPage() {
    return (
        <AuthProvider>
            <CallbackProcessor />
        </AuthProvider>
    );
}
