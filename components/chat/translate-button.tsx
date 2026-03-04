import { useState } from 'react';
import { Sparkles, Languages, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

interface TranslateButtonProps {
    input: string;
    onTranslated: (translatedText: string) => void;
    detectedLanguage?: string | null;
}

const LANGUAGES = [
    { code: 'İngilizce', label: 'İngilizce' },
    { code: 'Almanca', label: 'Almanca' },
    { code: 'İspanyolca', label: 'İspanyolca' },
    { code: 'Fransızca', label: 'Fransızca' },
    { code: 'Arapça', label: 'Arapça' },
    { code: 'Farsça', label: 'Farsça' }
];

export function TranslateButton({ input, onTranslated, detectedLanguage }: TranslateButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    if (!input.trim()) return null;

    const handleTranslate = async (targetLanguage: string) => {
        setIsLoading(true);
        setOpen(false);

        try {
            const res = await fetch('/api/ai/correct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: input, action: 'translate_outbound', targetLanguage })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Çeviri servisi yanıt vermedi.');
            }

            const data = await res.json();
            if (data.correctedText) {
                onTranslated(data.correctedText);
                toast.success(`Mesaj ${targetLanguage} diline çevrildi.`);
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Çeviri Hatası", { description: e.message || "Bir şeyler ters gitti." });
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
                    title="Mesajı Çevir"
                    className={clsx(
                        'h-7 rounded-md px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 bg-blue-50 font-medium',
                        isLoading && 'pointer-events-none disabled:opacity-100'
                    )}
                >
                    <Languages className={clsx('w-3.5 h-3.5 mr-1.5', isLoading && 'animate-spin')} />
                    {isLoading ? 'Çevriliyor...' : 'Çevir'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px] z-50">
                {detectedLanguage && (
                    <>
                        <DropdownMenuLabel className="text-xs text-blue-600 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Akıllı Öneri
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.preventDefault();
                                handleTranslate(detectedLanguage);
                            }}
                            className="cursor-pointer gap-2 font-medium"
                        >
                            <span>Müşterinin Diline Çevir ({detectedLanguage})</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}

                <DropdownMenuLabel className="text-xs text-slate-500">Hedef Dil Seçin</DropdownMenuLabel>
                {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={(e) => {
                            e.preventDefault();
                            handleTranslate(lang.code);
                        }}
                        className="cursor-pointer gap-2"
                    >
                        <span>{lang.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
