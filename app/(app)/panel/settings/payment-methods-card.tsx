"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addPaymentMethod, deletePaymentMethod } from "./actions";
import { CreditCard, Trash2, Plus } from "lucide-react";
import { useState } from "react";

export function PaymentMethodsCard({ methods }: { methods: any[] }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                        <CreditCard className="text-emerald-600 w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Ödeme Yöntemleri</h3>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Kart Ekle
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form action={async (fd) => {
                            await addPaymentMethod(fd);
                            setOpen(false);
                        }}>
                            <DialogHeader>
                                <DialogTitle>Yeni Kart Ekle</DialogTitle>
                                <DialogDescription>
                                    Ödemelerinizi yapmak için yeni bir kredi kartı ekleyin.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Kart Sahibi</Label>
                                    <Input name="cardHolder" placeholder="Ad Soyad" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Kart Numarası</Label>
                                    <Input name="cardNumber" placeholder="0000 0000 0000 0000" maxLength={19} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>SKT (Ay/Yıl)</Label>
                                        <Input name="expiry" placeholder="MM/YY" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>CVC</Label>
                                        <Input name="cvc" placeholder="123" maxLength={3} required />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Kaydet</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-3">
                {methods && methods.length > 0 ? (
                    methods.map((method) => (
                        <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-6 bg-slate-200 rounded flex items-center justify-center text-xs text-slate-500 font-mono">
                                    {method.card_family || 'CARD'}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">•••• •••• •••• {method.last_four}</p>
                                    {method.is_default && <span className="text-xs text-blue-600 font-medium">Varsayılan</span>}
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deletePaymentMethod(method.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-slate-500 italic">Kayıtlı ödeme yöntemi bulunmamaktadır.</p>
                )}
            </div>
        </div>
    );
}
