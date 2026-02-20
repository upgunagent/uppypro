"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Loader2 } from "lucide-react";

interface InvoiceUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: {
        orderReferenceCode: string;
        subscriptionReferenceCode: string;
        tenantId: string;
        tenantName: string;
        tenantEmail: string;
        planName: string;
        amount: number;
        paymentDate: string;
    };
    onUploaded: () => void;
}

export function InvoiceUploadDialog({ isOpen, onClose, transaction, onUploaded }: InvoiceUploadDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    if (!isOpen) return null;

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.type === 'application/pdf') {
            setFile(droppedFile);
            setError(null);
        } else {
            setError("Sadece PDF dosyaları yüklenebilir.");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected?.type === 'application/pdf') {
            setFile(selected);
            setError(null);
        } else {
            setError("Sadece PDF dosyaları yüklenebilir.");
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("tenantId", transaction.tenantId);
            formData.append("orderReferenceCode", transaction.orderReferenceCode);
            formData.append("subscriptionReferenceCode", transaction.subscriptionReferenceCode);
            formData.append("amount", String(transaction.amount));
            formData.append("planName", transaction.planName);
            formData.append("paymentDate", transaction.paymentDate);

            const { uploadInvoice } = await import("@/app/actions/invoice");
            const result = await uploadInvoice(formData);

            if (result.error) {
                setError(result.error);
            } else {
                onUploaded();
                onClose();
            }
        } catch (e: any) {
            setError("Yükleme hatası: " + e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Fatura Yükle</h3>
                        <p className="text-sm text-slate-500 mt-1">{transaction.tenantName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* İşlem Bilgisi */}
                <div className="px-6 pt-4">
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Paket:</span>
                            <span className="font-semibold text-slate-700">{transaction.planName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Tutar:</span>
                            <span className="font-semibold text-slate-700">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(transaction.amount)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Tarih:</span>
                            <span className="font-semibold text-slate-700">
                                {new Date(transaction.paymentDate).toLocaleString('tr-TR', {
                                    timeZone: 'Europe/Istanbul',
                                    day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Dosya Yükleme Alanı */}
                <div className="p-6">
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                            ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}
                        onClick={() => document.getElementById('invoice-file-input')?.click()}
                    >
                        {file ? (
                            <div className="flex items-center justify-center gap-3">
                                <FileText size={24} className="text-red-500" />
                                <div className="text-left">
                                    <p className="font-medium text-slate-700 text-sm">{file.name}</p>
                                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    className="p-1 hover:bg-slate-200 rounded"
                                >
                                    <X size={16} className="text-slate-400" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload size={32} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-sm font-medium text-slate-600">PDF Fatura Yükle</p>
                                <p className="text-xs text-slate-400 mt-1">Sürükle & bırak veya tıklayarak seç</p>
                            </>
                        )}
                    </div>
                    <input
                        id="invoice-file-input"
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    {error && (
                        <p className="text-red-500 text-sm mt-3 bg-red-50 p-3 rounded-lg">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 pt-0">
                    <Button variant="outline" onClick={onClose} className="flex-1" disabled={uploading}>
                        İptal
                    </Button>
                    <Button onClick={handleUpload} disabled={!file || uploading} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        {uploading ? (
                            <>
                                <Loader2 size={16} className="mr-2 animate-spin" />
                                Yükleniyor...
                            </>
                        ) : (
                            <>
                                <Upload size={16} className="mr-2" />
                                Yükle & Kaydet
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
