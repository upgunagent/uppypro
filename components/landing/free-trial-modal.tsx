'use client';

import { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { sendFreeTrialContact } from '@/actions/contact-free-trial';
import { Loader2, CheckCircle2, Send } from 'lucide-react';

interface FreeTrialModalProps {
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
            className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba58] hover:to-[#0e6b60] text-white font-bold h-12 rounded-xl shadow-lg shadow-green-500/25 transition-all"
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gönderiliyor...
                </>
            ) : (
                <>
                    <Send className="mr-2 h-4 w-4" />
                    Gönder
                </>
            )}
        </Button>
    );
}

export function FreeTrialModal({ open, onOpenChange }: FreeTrialModalProps) {
    const [state, formAction] = useActionState(sendFreeTrialContact, initialState);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (state.success) {
            setSubmitted(true);
        }
    }, [state.success]);

    const handleOpenChange = (val: boolean) => {
        if (!val) {
            setTimeout(() => setSubmitted(false), 300);
        }
        onOpenChange(val);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-white/95 backdrop-blur-xl border-slate-100 shadow-2xl p-0 overflow-hidden sm:rounded-3xl">
                {!submitted ? (
                    <>
                        {/* Green gradient header */}
                        <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none" />
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold relative z-10">
                                    UppyPro&apos;yu 7 Gün Ücretsiz Dene
                                </DialogTitle>
                                <DialogDescription className="text-green-50 relative z-10 mt-2 leading-relaxed">
                                    Ücretsiz deneme sürümü için aşağıdaki formu doldurun, ekibimiz üyelik başlangıcı için en kısa sürede sizinle iletişime geçecektir.
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <form action={formAction} className="p-8 space-y-6">
                            {/* Ad Soyad & Firma Adı */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ft-fullName" className="text-slate-700 font-semibold">Ad Soyad</Label>
                                    <Input
                                        id="ft-fullName"
                                        name="fullName"
                                        placeholder="Adınız Soyadınız"
                                        required
                                        className="bg-slate-50 border-slate-200 focus:bg-white focus-visible:ring-[#25D366] transition-colors"
                                    />
                                    {state.errors?.fullName && <p className="text-red-500 text-xs">{state.errors.fullName[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ft-companyName" className="text-slate-700 font-semibold">Firma Adı</Label>
                                    <Input
                                        id="ft-companyName"
                                        name="companyName"
                                        placeholder="Şirketinizin Adı"
                                        required
                                        className="bg-slate-50 border-slate-200 focus:bg-white focus-visible:ring-[#25D366] transition-colors"
                                    />
                                    {state.errors?.companyName && <p className="text-red-500 text-xs">{state.errors.companyName[0]}</p>}
                                </div>
                            </div>

                            {/* Telefon & E-posta */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ft-phone" className="text-slate-700 font-semibold">Telefon</Label>
                                    <Input
                                        id="ft-phone"
                                        name="phone"
                                        type="tel"
                                        placeholder="0555 555 55 55"
                                        required
                                        className="bg-slate-50 border-slate-200 focus:bg-white focus-visible:ring-[#25D366] transition-colors"
                                    />
                                    {state.errors?.phone && <p className="text-red-500 text-xs">{state.errors.phone[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ft-email" className="text-slate-700 font-semibold">E-posta</Label>
                                    <Input
                                        id="ft-email"
                                        name="email"
                                        type="email"
                                        placeholder="ornek@sirket.com"
                                        required
                                        className="bg-slate-50 border-slate-200 focus:bg-white focus-visible:ring-[#25D366] transition-colors"
                                    />
                                    {state.errors?.email && <p className="text-red-500 text-xs">{state.errors.email[0]}</p>}
                                </div>
                            </div>

                            {/* Sektör & İş Akışı */}
                            <div className="space-y-2">
                                <Label htmlFor="ft-description" className="text-slate-700 font-semibold">
                                    Sektör ve İş Akışınız
                                </Label>
                                <Textarea
                                    id="ft-description"
                                    name="description"
                                    placeholder="Sektörünüz ve yaptığınız işi kısaca anlatın, ekibimiz panele entegre edebileceğiniz uygun yapay zeka çözümleri için en kısa sürede sizinle iletişime geçecek ve panelinizi aktif hale getirecektir."
                                    className="min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white focus-visible:ring-[#25D366] transition-colors resize-none"
                                    required
                                />
                                {state.errors?.description && <p className="text-red-500 text-xs">{state.errors.description[0]}</p>}
                            </div>

                            {/* KVKK & Submit */}
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        id="ft-consent"
                                        name="consent"
                                        required
                                        className="mt-1 data-[state=checked]:bg-[#25D366] data-[state=checked]:border-[#25D366]"
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="ft-consent" className="text-sm font-medium leading-normal text-slate-600 cursor-pointer">
                                            KVKK Aydınlatma Metni&apos;ni ve Gizlilik Sözleşmesi&apos;ni okudum, onaylıyorum.
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
                    /* Success state */
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-6 min-h-[500px]">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2 animate-in zoom-in duration-500">
                            <CheckCircle2 className="w-10 h-10 text-[#25D366]" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900">Başvurunuz Alındı! 🎉</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">
                                Ekibimiz üyelik başlangıcı için en kısa sürede sizinle iletişime geçecektir.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            className="mt-4 border-[#25D366] text-[#25D366] hover:bg-green-50"
                        >
                            Pencereyi Kapat
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
