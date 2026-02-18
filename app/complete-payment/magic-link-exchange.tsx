"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function MagicLinkExchange() {
    const [status, setStatus] = useState<'loading' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const hash = window.location.hash;
        if (!hash || !hash.includes('access_token')) {
            setStatus('error');
            setErrorMsg('Oturum bilgisi bulunamadı. Lütfen e-postanızdaki linke tekrar tıklayın.');
            return;
        }

        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
            setStatus('error');
            setErrorMsg('Geçersiz oturum bilgisi.');
            return;
        }

        import('@/lib/supabase/client').then(({ createClient }) => {
            const supabase = createClient();
            supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
                .then(({ error }) => {
                    if (error) {
                        setStatus('error');
                        setErrorMsg(`Oturum açılamadı: ${error.message}`);
                    } else {
                        // Session established — reload without hash so server component sees the user
                        window.location.href = window.location.pathname + '?status=success';
                    }
                });
        });
    }, []);

    if (status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-red-50 text-red-800 p-6 rounded-lg max-w-md">
                    <p className="font-bold mb-2">Oturum açılamadı.</p>
                    <p className="text-sm">{errorMsg}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto" />
                <p className="text-slate-600 font-medium">Oturum açılıyor, lütfen bekleyin...</p>
            </div>
        </div>
    );
}
