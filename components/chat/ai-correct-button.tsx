import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clsx } from 'clsx';
import { toast } from 'sonner';

interface AiCorrectButtonProps {
    input: string;
    onCorrected: (correctedText: string) => void;
    isEnabled: boolean;
}

export function AiCorrectButton({ input, onCorrected, isEnabled }: AiCorrectButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Ayarlardan kapalıysa veya input boşsa butonu gösterme
    if (!isEnabled || !input.trim()) return null;

    const handleCorrect = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/ai/correct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: input })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Düzeltme servisi yanıt vermedi.');
            }

            const data = await res.json();
            if (data.correctedText) {
                onCorrected(data.correctedText);
                toast.success("Metin yapay zeka tarafından düzeltildi.");
            }
        } catch (e: any) {
            console.error(e);
            toast.error("AI Hatası", { description: e.message || "Bir şeyler ters gitti." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleCorrect}
            disabled={isLoading}
            title="Yazım Hatası ve İfade Düzelt"
            className={clsx(
                'absolute right-8 top-1/2 -translate-y-1/2 h-7 rounded-md px-2.5 text-orange-600 hover:text-orange-700 hover:bg-orange-100/50 bg-orange-50 font-medium z-10',
                isLoading && 'opacity-70 pointer-events-none'
            )}
        >
            <Sparkles className={clsx('w-3.5 h-3.5 mr-1.5', isLoading && 'animate-spin')} />
            {isLoading ? 'Düzeltiliyor...' : 'Yapay Zeka (AI) Düzelt'}
        </Button>
    );
}
