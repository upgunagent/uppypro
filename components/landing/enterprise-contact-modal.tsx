'use client';

import { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { sendEnterpriseContact } from '@/actions/contact-enterprise';
import { Loader2, CheckCircle2, Send } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from '@/components/ui/use-toast';

interface EnterpriseContactModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const initialState = {
    success: false,
    message: '',
    errors: {}
};

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            disabled={pending}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-purple-500/25 transition-all"
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gönderiliyor...
                </>
            ) : (
                <>
                    <Send className="mr-2 h-4 w-4" />
                    Formu Gönder
                </>
            )}
        </Button>
    );
}

export function EnterpriseContactModal({ open, onOpenChange }: EnterpriseContactModalProps) {
    const [state, formAction] = useActionState(sendEnterpriseContact, initialState);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (state.success) {
            setSubmitted(true);
            // Optional: Close modal after a delay
            // setTimeout(() => onOpenChange(false), 3000);
        }
    }, [state.success, onOpenChange]);

    const handleOpenChange = (val: boolean) => {
        if (!val) {
            // Reset state when closing if desired, but here we just close
            setTimeout(() => setSubmitted(false), 300); // Reset submitted state after close animation
        }
        onOpenChange(val);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-white/95 backdrop-blur-xl border-slate-100 shadow-2xl p-0 overflow-hidden sm:rounded-3xl">
                {!submitted ? (
                    <>
                        <div className="bg-gradient-to-r from-purple-700 to-indigo-900 p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold relative z-10">Kurumsal Çözüm Merkezi</DialogTitle>
                                <DialogDescription className="text-purple-100 relative z-10 mt-2">
                                    İşletmenizin ihtiyaçlarına özel yapay zeka otomasyonları tasarlayalım.
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <form action={formAction} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="text-slate-700 font-semibold">Ad Soyad</Label>
                                    <Input id="fullName" name="fullName" placeholder="Adınız Soyadınız" required className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
                                    {state.errors?.fullName && <p className="text-red-500 text-xs">{state.errors.fullName[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="companyName" className="text-slate-700 font-semibold">Firma Adı</Label>
                                    <Input id="companyName" name="companyName" placeholder="Şirketinizin Adı" required className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
                                    {state.errors?.companyName && <p className="text-red-500 text-xs">{state.errors.companyName[0]}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-slate-700 font-semibold">Telefon</Label>
                                    <Input id="phone" name="phone" type="tel" placeholder="0555 555 55 55" required className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
                                    {state.errors?.phone && <p className="text-red-500 text-xs">{state.errors.phone[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-700 font-semibold">E-posta</Label>
                                    <Input id="email" name="email" type="email" placeholder="ornek@sirket.com" required className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
                                    {state.errors?.email && <p className="text-red-500 text-xs">{state.errors.email[0]}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-slate-700 font-semibold">Otomasyon Talepleriniz ve İş Akışınız</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="AI Asistanınızın firmanız için neler yapmasını istersiniz? Hangi süreçleri otomatize etmek istiyorsunuz? (Örn: Stok takibi, randevu yönetimi, satış hunisi...)"
                                    className="min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-none"
                                    required
                                />
                                {state.errors?.description && <p className="text-red-500 text-xs">{state.errors.description[0]}</p>}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <Checkbox id="consent" name="consent" required className="mt-1 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="consent" className="text-sm font-medium leading-normal text-slate-600 cursor-pointer">
                                            KVKK Aydınlatma Metni'ni ve Gizlilik Sözleşmesi'ni okudum, onaylıyorum.
                                        </Label>
                                        {state.errors?.consent && <p className="text-red-500 text-xs">{state.errors.consent[0]}</p>}
                                    </div>
                                </div>

                                {state.error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
                                        {state.error}
                                    </div>
                                )}

                                <SubmitButton />
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-6 min-h-[500px]">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2 animate-in zoom-in duration-500">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900">Talebiniz Alındı!</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">
                                Kurumsal çözüm uzmanlarımız talebinizi inceleyip en kısa sürede sizinle iletişime geçecektir.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            className="mt-4 border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            Pencereyi Kapat
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
