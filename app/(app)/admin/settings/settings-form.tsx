"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updatePlatformSetting } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";
import { Save, Loader2 } from "lucide-react";

const initialState: any = {
    error: "",
    success: ""
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Kaydediliyor...
                </>
            ) : (
                <>
                    <Save className="w-4 h-4 mr-2" />
                    Ayarları Kaydet
                </>
            )}
        </Button>
    );
}

export function SettingsForm({ currentWebhookUrl }: { currentWebhookUrl: string }) {
    const [state, formAction] = useFormState(updatePlatformSetting, initialState);
    const { toast } = useToast();

    useEffect(() => {
        if (state?.error) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: state.error,
            });
        }
        if (state?.success) {
            toast({
                title: "Başarılı",
                description: state.success,
            });
        }
    }, [state, toast]);

    return (
        <form action={formAction} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="webhookUrl">Ajans Webhook URL</Label>
                <div className="text-sm text-slate-500 mb-2">
                    N8n üzerinde oluşturduğunuz "Conversation Summary" workflow'unun Webhook URL'ini buraya girin.
                </div>
                <Input
                    id="webhookUrl"
                    name="webhookUrl"
                    defaultValue={currentWebhookUrl}
                    placeholder="https://n8n.your-domain.com/webhook/..."
                />
            </div>

            <SubmitButton />
        </form>
    );
}
