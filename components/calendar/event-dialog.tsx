"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Save, User, Clock, CalendarIcon, Check, ChevronsUpDown, Mail } from "lucide-react";
import { format } from "date-fns";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { sendAppointmentEmail } from "@/app/actions/email";
import { useToast } from "@/components/ui/use-toast";

interface EventDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    event?: any; // If editing
    initialSlot?: { start: Date; end: Date } | null; // If creating from slot
    tenantId: string;
    defaultCustomerId?: string; // Optional default customer for create mode
    profile?: { full_name: string; avatar_url?: string; company_name?: string; phone?: string };
}

interface Customer {
    id: string;
    full_name: string;
    company_name?: string;
    email?: string;
    phone?: string;
}

export function EventDialog({ isOpen, onClose, onSave, event, initialSlot, tenantId, defaultCustomerId, profile }: EventDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false); // For Popover
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState("blue"); // Default color
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [customerId, setCustomerId] = useState<string | "manual">("manual");
    const [guestName, setGuestName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [guestEmail, setGuestEmail] = useState("");

    const [customers, setCustomers] = useState<Customer[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Load Customers
            const fetchCustomers = async () => {
                const supabase = createClient();
                const { data } = await supabase
                    .from("customers")
                    .select("id, full_name, company_name, email, phone")
                    .eq("tenant_id", tenantId)
                    .order("full_name");
                if (data) setCustomers(data);
            };
            fetchCustomers();

            if (event) {
                // Edit Mode
                setTitle(event.title);
                setDescription(event.description || "");
                setColor(event.color || "blue");
                setStartTime(format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"));
                setEndTime(format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"));
                setCustomerId(event.customer_id || "manual");
                setGuestName(event.guest_name || "");
                setGuestPhone(""); // Phone not stored in event, only used for creation
                setGuestEmail(""); // Email not stored in event
            } else if (initialSlot) {
                // Create Mode from Slot
                let start = initialSlot.start;
                let end = initialSlot.end;
                const now = new Date();

                // UX: If user clicked "Today" in Month view (starts 00:00) or a past time, 
                // and we are creating fresh, suggest next hour.
                if (start < now) {
                    const nextHour = new Date(now);
                    nextHour.setMinutes(0, 0, 0);
                    nextHour.setHours(nextHour.getHours() + 1);
                    start = nextHour;

                    const nextEnd = new Date(start);
                    nextEnd.setHours(nextEnd.getHours() + 1);
                    end = nextEnd;
                }

                setTitle("");
                setDescription("");
                setColor("blue");
                setStartTime(format(start, "yyyy-MM-dd'T'HH:mm"));
                setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));
                setCustomerId(defaultCustomerId || "manual");
                setGuestName("");
                setGuestPhone("");
                setGuestEmail("");
            } else {
                // Fallback Create Mode
                setTitle("");
                setDescription("");
                const now = new Date();
                now.setMinutes(0, 0, 0); // Round hour
                const end = new Date(now);
                end.setHours(end.getHours() + 1);

                setStartTime(format(now, "yyyy-MM-dd'T'HH:mm"));
                setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));
                setCustomerId(defaultCustomerId || "manual");
                setGuestName("");
                setGuestPhone("");
                setGuestEmail("");
            }
        }
    }, [isOpen, event, initialSlot, tenantId, defaultCustomerId]);

    const isPast = event?.end_time ? new Date(event.end_time) < new Date() : false;

    const handleSaveEvent = async () => {
        // If past, validation might differ (we only update description)
        if (!isPast && (!title || !startTime || !endTime)) return alert("Lütfen başlık ve tarihleri giriniz.");

        setLoading(true);
        const supabase = createClient();

        let finalCustomerId = customerId;
        let finalGuestName = null;
        let finalGuestPhone = null;
        let finalGuestEmail = null;

        // If not past, handle customer creation logic
        if (!isPast && customerId === "manual") {
            if (!guestName.trim()) {
                alert("Lütfen misafir adını giriniz.");
                setLoading(false);
                return;
            }

            if (!guestEmail.trim()) {
                alert("Lütfen e-posta adresini giriniz.");
                setLoading(false);
                return;
            }

            // Create New Customer Logic (Only if creating new or updating basic info)
            const { data: newCustomer, error: createError } = await supabase
                .from("customers")
                .insert({
                    tenant_id: tenantId,
                    full_name: guestName,
                    phone: guestPhone || null,
                    email: guestEmail,
                    created_at: new Date().toISOString()
                })
                .select("id")
                .single();

            if (createError) {
                alert("Müşteri oluşturulurken hata: " + createError.message);
                setLoading(false);
                return;
            }
            finalCustomerId = newCustomer.id;
            // No guest name needed since we now have a real customer
        } else {
            // Existing customer selected or past event
            finalGuestName = event?.guest_name || null; // Keep existing if past
            finalGuestPhone = event?.guest_phone || null;
            finalGuestEmail = event?.guest_email || null;
        }

        let payload: any = {
            description,
            updated_at: new Date().toISOString()
        };

        // If NOT past, we can update everything. If PAST, only description.
        if (!isPast) {
            const startISO = new Date(startTime).toISOString();
            const endISO = new Date(endTime).toISOString();

            // Base Payload
            payload = {
                tenant_id: tenantId,
                title,
                description,
                start_time: startISO,
                end_time: endISO,
                customer_id: finalCustomerId === "manual" ? null : finalCustomerId,
            };

            // Add Guest Info ONLY if manual (avoids sending nulls for registered users, which might error if cols missing)
            if (finalCustomerId === "manual") {
                payload.guest_name = guestName;
                if (guestPhone) payload.guest_phone = guestPhone;
                if (guestEmail) payload.guest_email = guestEmail;
            }

            // Add color ONLY if it's not the default "blue"
            // This prevents "column not found" error for users who haven't run the migration yet,
            // as long as they stick to the default color.
            if (color && color !== 'blue') {
                payload.color = color;
            }
        }

        let err;
        let savedEventId = event?.id;

        if (event?.id) {
            // Update
            const { error } = await supabase
                .from("calendar_events")
                .update(payload)
                .eq("id", event.id);
            err = error;
        } else {
            // Insert
            const { data: newEv, error } = await supabase
                .from("calendar_events")
                .insert({ ...payload, tenant_id: tenantId })
                .select("id")
                .single();

            if (newEv) savedEventId = newEv.id;
            err = error;
        }

        // --- SYNC TO CUSTOMER NOTES ---
        // Only if we have a real customer and a description
        if (!err && finalCustomerId && finalCustomerId !== "manual" && description?.trim()) {
            const shouldAddNote = !event || (event.description !== description);

            if (shouldAddNote && savedEventId) {
                const dateStr = format(new Date(startTime), "dd.MM.yyyy HH:mm");
                const noteContent = `📅 Randevu Notu (${dateStr}):\n${description}`;

                await supabase.from("customer_notes").insert({
                    customer_id: finalCustomerId,
                    note: noteContent,
                    event_id: savedEventId
                });
            }
        }
        // -----------------------------

        setLoading(false);
        if (err) {
            alert("Hata: " + err.message);
        } else {
            onSave();

            // SEND EMAIL IF NEW EVENT (and not past)
            if (!event?.id && !isPast) {
                const targetCustomer = customerId === "manual" ? null : customers.find(c => c.id === customerId);
                const emailTo = customerId === "manual" ? guestEmail : targetCustomer?.email;
                const nameTo = customerId === "manual" ? guestName : targetCustomer?.full_name;

                console.log("Attempting to send email...", { emailTo, nameTo, profile });

                if (emailTo && nameTo) {
                    // Fire and forget, or await? User didn't specify blocking UI. Fire and forget is better for UX, 
                    // but logging error might be useful.
                    // Let's not await to keep UI fast, but we can log.
                    sendAppointmentEmail({
                        recipientEmail: emailTo,
                        recipientName: nameTo,
                        businessName: profile?.company_name || profile?.full_name || "İşletme",
                        businessLogoUrl: profile?.avatar_url,
                        businessPhone: profile?.phone,
                        eventTitle: title,
                        startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
                        endTime: endTime ? new Date(endTime).toISOString() : new Date().toISOString()
                    }).then(res => {
                        if (!res.success) {
                            console.error("Email send failed", res.error);
                            toast({
                                variant: "destructive",
                                title: "Mail Gönderilemedi",
                                description: "Hata: " + res.error
                            });
                        } else {
                            toast({
                                title: "Mail Gönderildi",
                                description: `Randevu onayı ${emailTo} adresine gönderildi.`
                            });
                        }
                    });
                }
            }
        }
    };

    const handleDelete = async () => {
        if (!confirm("Bu etkinliği silmek istediğinize emin misiniz?")) return;
        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase.from("calendar_events").delete().eq("id", event.id);
        setLoading(false);
        if (error) alert("Silme hatası: " + error.message);
        else onSave();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{event ? (isPast ? "Geçmiş Etkinlik Detayı" : "Etkinliği Düzenle") : "Yeni Etkinlik/Randevu Oluştur"}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Title */}
                    <div className="space-y-2 flex-1">
                        <label className="text-xs uppercase font-semibold text-slate-500">Etkinlik Başlığı</label>
                        <div className="flex gap-2">
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Örn: Toplantı, Görüşme..."
                                className="flex-1"
                                disabled={isPast}
                            />
                            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                                {['blue', 'green', 'yellow', 'red'].map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={cn(
                                            "w-8 h-8 rounded-md transition-all border-2",
                                            color === c ? "border-slate-600 scale-110 shadow-sm" : "border-transparent hover:scale-105",
                                            c === 'blue' && "bg-blue-500",
                                            c === 'green' && "bg-emerald-500",
                                            c === 'yellow' && "bg-amber-500",
                                            c === 'red' && "bg-rose-500"
                                        )}
                                        disabled={isPast}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Date/Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-semibold text-slate-500">Başlangıç</label>
                            <Input
                                type="datetime-local"
                                value={startTime}
                                onChange={e => {
                                    setStartTime(e.target.value);
                                    // Auto-update End Time to +1 Hour
                                    if (e.target.value) {
                                        const d = new Date(e.target.value);
                                        if (!isNaN(d.getTime())) {
                                            const endD = new Date(d.getTime() + 60 * 60 * 1000);
                                            setEndTime(format(endD, "yyyy-MM-dd'T'HH:mm"));
                                        }
                                    }
                                }}
                                disabled={isPast}
                                className="bg-slate-50 border-slate-200 focus:bg-white focus:border-orange-500 transition-all font-medium text-slate-700 shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-semibold text-slate-500">Bitiş</label>
                            <Input
                                type="datetime-local"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                disabled={isPast}
                                className="bg-slate-50 border-slate-200 focus:bg-white focus:border-orange-500 transition-all font-medium text-slate-700 shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Customer or Guest */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-semibold text-slate-500">Katılımcı / Müşteri</label>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="w-full justify-between font-normal"
                                    disabled={isPast}
                                >
                                    {customerId === "manual"
                                        ? "Manuel İsim Girişi"
                                        : customers.find((c) => c.id === customerId)?.full_name || "Müşteri Seçiniz..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[450px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Müşteri ara..." />
                                    <CommandList>
                                        <CommandEmpty>Müşteri bulunamadı.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="manuel isim girişi"
                                                onSelect={() => {
                                                    setCustomerId("manual");
                                                    setOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        customerId === "manual" ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                Manuel İsim Girişi
                                            </CommandItem>
                                            {customers.map((c) => (
                                                <CommandItem
                                                    key={c.id}
                                                    value={c.full_name}
                                                    onSelect={() => {
                                                        setCustomerId(c.id);
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            customerId === c.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {c.full_name} {c.company_name ? `(${c.company_name})` : ''}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Show Selected Customer Info (Read Only) */}
                    {customerId !== "manual" && (
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-md border border-slate-100">
                            <div className="space-y-1">
                                <label className="text-xs uppercase font-semibold text-slate-400">Telefon</label>
                                <div className="text-sm font-medium text-slate-700">
                                    {customers.find(c => c.id === customerId)?.phone || "-"}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs uppercase font-semibold text-slate-400">E-posta</label>
                                <div className="text-sm font-medium text-slate-700 truncate" title={customers.find(c => c.id === customerId)?.email}>
                                    {customers.find(c => c.id === customerId)?.email || "-"}
                                </div>
                            </div>
                        </div>
                    )}

                    {customerId === "manual" && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-semibold text-slate-500">Manuel Misafir Adı (Zorunlu)</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <Input
                                            className="pl-9"
                                            value={guestName}
                                            onChange={e => setGuestName(e.target.value)}
                                            placeholder="Ad Soyad..."
                                            disabled={isPast}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-semibold text-slate-500">Telefon (Zorunlu)</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 opacity-0" />
                                        <Input
                                            value={guestPhone}
                                            onChange={e => setGuestPhone(e.target.value)}
                                            placeholder="+90 5XX..."
                                            disabled={isPast}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mt-4">
                                <label className="text-xs uppercase font-semibold text-slate-500">E-posta (Zorunlu)</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <Input
                                        value={guestEmail}
                                        onChange={e => setGuestEmail(e.target.value)}
                                        placeholder="ornek@email.com"
                                        className="pl-9"
                                        disabled={isPast}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Description - ALWAYS EDITABLE */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-semibold text-slate-500">Açıklama / Notlar</label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Görüşme notları veya detaylar..."
                            className="resize-none h-20"
                        />
                    </div>
                </div>

                <DialogFooter className="flex justify-between items-center w-full sm:justify-between">
                    {event ? (
                        <Button variant="destructive" size="icon" onClick={handleDelete} disabled={loading || isPast}>
                            {/* Maybe allow deleting past events? User didn't specify. Locking it is safer. */}
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    ) : <div></div>}

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={loading}>Kapat</Button>
                        <Button onClick={handleSaveEvent} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
                            {loading ? "Kaydediliyor..." : <><Save className="mr-2 w-4 h-4" /> {isPast ? "Notu Güncelle" : "Kaydet"}</>}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    );
}
