"use client";

import { useState } from "react";
import { Globe, Copy, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toggleWebchat } from "../actions";

interface WebchatCardProps {
    tenantId: string;
    webchatEnabled: boolean;
    webchatApiKey: string;
}

export function AdminWebchatCard({ tenantId, webchatEnabled, webchatApiKey }: WebchatCardProps) {
    const [enabled, setEnabled] = useState(webchatEnabled);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.upgunai.com"}/api/webhooks/webchat/${webchatApiKey}`;

    const handleToggle = async (checked: boolean) => {
        setLoading(true);
        const result = await toggleWebchat(tenantId, checked);
        if (result.success) {
            setEnabled(checked);
        }
        setLoading(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-full max-w-[780px] p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? 'bg-violet-100' : 'bg-slate-100'}`}>
                        <Globe className={`w-5 h-5 ${enabled ? 'text-violet-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Web Chat Webhook</h3>
                        <p className="text-xs text-slate-500">Isletmenin web sitesi chatbot entegrasyonu</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {enabled ? "Aktif" : "Pasif"}
                    </span>
                    <Switch
                        checked={enabled}
                        onCheckedChange={handleToggle}
                        disabled={loading}
                    />
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Webhook URL</label>
                <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-mono break-all select-all">
                        {webhookUrl}
                    </div>
                    <button
                        onClick={handleCopy}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium text-slate-600 flex-shrink-0"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Kopyalandi" : "Kopyala"}
                    </button>
                </div>
                {!enabled && (
                    <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                        Webhook pasif durumda. Aktif edildiginde isletme panelinde &quot;Web&quot; butonu gorunecek ve webhook istekleri kabul edilecek.
                    </p>
                )}
            </div>
        </div>
    );
}
