import { useState } from 'react';
import { Sparkles, Check, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AiCorrectButtonProps {
    input: string;
    onCorrected: (correctedText: string) => void;
    isEnabled: boolean;
}

export function AiCorrectButton({ input, onCorrected, isEnabled }: AiCorrectButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    // Ayarlardan kapalıysa veya input boşsa butonu gösterme
    if (!isEnabled || !input.trim()) return null;

    const handleCorrect = async (actionType: 'spelling' | 'corporate') => {
        setIsLoading(true);
        setOpen(false); // Close dropdown menu immediately

        try {
            const res = await fetch('/api/ai/correct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: input, action: actionType })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Düzeltme servisi yanıt vermedi.');
            }

            const data = await res.json();
            if (data.correctedText) {
                onCorrected(data.correctedText);
                const toastMsg = actionType === 'spelling'
                    ? "Yazım hataları düzeltildi."
                    : "Metin kurumsal dile çevrildi.";
                toast.success(toastMsg);
            }
        } catch (e: any) {
            console.error(e);
            toast.error("AI Hatası", { description: e.message || "Bir şeyler ters gitti." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    disabled={isLoading}
                    title="Yapay Zeka (AI) Düzeltme Seçenekleri"
                    className={clsx(
                        'h-7 rounded-md px-2.5 text-orange-600 hover:text-orange-700 hover:bg-orange-100/50 bg-orange-50 font-medium',
                        isLoading && 'pointer-events-none disabled:opacity-100'
                    )}
                >
                    <Sparkles className={clsx('w-3.5 h-3.5 mr-1.5', isLoading && 'animate-spin')} />
                    {isLoading ? 'İşleniyor...' : 'Metni Düzelt (AI)'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] z-50">
                <DropdownMenuItem
                    onClick={(e) => {
                        e.preventDefault();
                        handleCorrect('spelling');
                    }}
                    className="cursor-pointer gap-2"
                >
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Yazım Hatalarını Düzelt</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(e) => {
                        e.preventDefault();
                        handleCorrect('corporate');
                    }}
                    className="cursor-pointer gap-2"
                >
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span>Kurumsal Dile Çevir</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
