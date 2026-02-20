"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Check } from "lucide-react";

function CopyableText({ text, multiline = false }: { text: string; multiline?: boolean }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <span
            onClick={handleCopy}
            className={`group flex items-start gap-2 cursor-pointer hover:bg-slate-50 px-1.5 py-0.5 -mx-1.5 rounded transition-colors ${multiline ? '' : 'items-center'}`}
            title="Kopyalamak için tıklayın"
        >
            <span className={multiline ? "whitespace-pre-line" : "truncate"}>{text}</span>
            {copied ? (
                <Check size={14} className="text-green-600 shrink-0 mt-0.5" />
            ) : (
                <Copy size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
            )}
        </span>
    );
}

interface BillingInfoDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: any | null; // using any for simplicity, type matched in parent
}

export function BillingInfoDialog({ isOpen, onClose, transaction }: BillingInfoDialogProps) {
    if (!transaction) return null;

    const { billingInfo } = transaction;

    const isCompany = billingInfo?.billingType === 'corporate';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Fatura ve Ödeme Bilgileri</DialogTitle>
                    <DialogDescription>
                        İlgili işleme ait fatura oluşturmak için gereken detaylar.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Özet Veriler */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Paket</p>
                            <p className="text-sm font-semibold text-slate-900 mt-1">{transaction.planName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Ödenen Tutar</p>
                            <p className="text-sm font-semibold text-slate-900 mt-1">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: transaction.currency || 'TRY' }).format(transaction.amount)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Ödeme Tarihi</p>
                            <p className="text-sm font-semibold text-slate-900 mt-1">
                                {new Date(transaction.paymentDate).toLocaleDateString('tr-TR')}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Iyzico Ref.</p>
                            <div className="text-xs text-slate-500 mt-1 font-mono">
                                <CopyableText text={transaction.orderReferenceCode || ""} />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Fatura Verileri */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center justify-between">
                            Müşteri / Firma Bilgileri
                            <Badge variant="outline" className={isCompany ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700'}>
                                {isCompany ? 'Kurumsal' : 'Bireysel'}
                            </Badge>
                        </h4>

                        {!billingInfo ? (
                            <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded-md border border-yellow-200">
                                Bu kullanıcı henüz fatura bilgilerini doldurmamış veya veri bulunamadı.
                            </div>
                        ) : (
                            <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500 mt-0.5">Unvan/Ad:</span>
                                    <span className="col-span-2 font-medium text-slate-900">
                                        <CopyableText text={isCompany ? billingInfo.companyName : billingInfo.fullName} />
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500 mt-0.5">E-Posta:</span>
                                    <span className="col-span-2 font-medium text-slate-900">
                                        <CopyableText text={transaction.tenantEmail} />
                                    </span>
                                </div>

                                {isCompany ? (
                                    <>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-slate-500 mt-0.5">Vergi Dairesi:</span>
                                            <span className="col-span-2 font-medium text-slate-900">
                                                <CopyableText text={billingInfo.taxOffice || '-'} />
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-slate-500 mt-0.5">Vergi No:</span>
                                            <span className="col-span-2 font-medium text-slate-900">
                                                <CopyableText text={billingInfo.taxNumber || '-'} />
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        <span className="text-slate-500 mt-0.5">TCKN:</span>
                                        <span className="col-span-2 font-medium text-slate-900">
                                            <CopyableText text={billingInfo.tckn || '-'} />
                                        </span>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-slate-500 mt-0.5">Adres:</span>
                                    <span className="col-span-2 font-medium text-slate-900">
                                        <CopyableText
                                            multiline={true}
                                            text={[
                                                billingInfo.addressFull || '-',
                                                (billingInfo.addressDistrict || billingInfo.addressCity) ?
                                                    `${billingInfo.addressDistrict || ''} ${billingInfo.addressDistrict && billingInfo.addressCity ? '/' : ''} ${billingInfo.addressCity || ''}` : ''
                                            ].filter(Boolean).join('\n')}
                                        />
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
