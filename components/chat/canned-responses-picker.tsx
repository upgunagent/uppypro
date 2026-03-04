import { useEffect, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquarePlus, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface CannedResponse {
    id: string;
    shortcut: string;
    content: string;
    media_url: string | null;
}

interface CannedResponsesPickerProps {
    tenantId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (response: CannedResponse) => void;
    children: React.ReactNode;
}

export function CannedResponsesPicker({ tenantId, open, onOpenChange, onSelect, children }: CannedResponsesPickerProps) {
    const [responses, setResponses] = useState<CannedResponse[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;

        const fetchResponses = async () => {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from("canned_responses")
                .select("*")
                .eq("tenant_id", tenantId)
                .order("shortcut", { ascending: true });

            if (!error && data) {
                setResponses(data);
            }
            setLoading(false);
        };

        fetchResponses();
    }, [open, tenantId]);

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                className="w-80 p-0 mb-2 ml-4 shadow-2xl rounded-xl border border-slate-200"
                align="start"
                side="top"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <Command>
                    <CommandInput placeholder="Kısayol ara..." autoFocus className="border-none focus:ring-0 text-sm" />
                    <CommandList>
                        <CommandEmpty>
                            {loading ? "Yükleniyor..." : "Sonuç bulunamadı."}
                        </CommandEmpty>
                        <CommandGroup heading="Hazır Cevaplar">
                            {responses.map((resp) => (
                                <CommandItem
                                    key={resp.id}
                                    value={resp.shortcut}
                                    onSelect={() => {
                                        onSelect(resp);
                                        onOpenChange(false);
                                    }}
                                    className="flex flex-col items-start gap-1 py-2 px-3 cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                            /{resp.shortcut}
                                        </span>
                                        {resp.media_url && <ImageIcon className="w-3 h-3 text-slate-400" />}
                                    </div>
                                    <span className="text-xs text-slate-600 line-clamp-2 w-full text-left">
                                        {resp.content}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
