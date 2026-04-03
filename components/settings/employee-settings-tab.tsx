"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, CalendarDays, Upload, FileSpreadsheet, Layers, User, DoorOpen, Ship, Car, UtensilsCrossed, Home, Info, Camera, X as XIcon, ImageIcon, Link2, Loader2, Mic, Compass, ChevronRight, type LucideIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
    addTenantEmployee,
    addTenantEmployeesBatch,
    updateTenantEmployee,
    deleteTenantEmployee,
    updateResourceTypePreference,
} from "@/app/actions/employees";
import {
    uploadResourceCoverPhoto,
    deleteResourceCoverPhoto,
    updateResourceDetailUrl,
} from "@/app/actions/resource-photos";
import {
    RESOURCE_TYPES,
    getResourceTypeConfig,
    formatResourceAttributes,
    type ResourceType,
    type ResourceTypeConfig,
} from "@/lib/resource-types";

/** Lucide ikon mapping — resource iconName → React component */
const RESOURCE_ICONS: Record<string, LucideIcon> = {
    User, DoorOpen, Ship, Car, UtensilsCrossed, Home, Mic, Compass,
};

function ResourceIcon({ name, className }: { name: string; className?: string }) {
    const Icon = RESOURCE_ICONS[name];
    return Icon ? <Icon className={className} /> : null;
}

interface Employee {
    id: string;
    tenant_id: string;
    name: string;
    title: string | null;
    resource_type?: string;
    attributes?: Record<string, any>;
    extra_info?: string | null;
    created_at: string;
}

interface TourSummary {
    id: string;
    name: string;
    tour_type: string;
    capacity: number;
    is_active: boolean;
    price_per_person: number | null;
    departure_time: string | null;
    route: string | null;
}

interface EmployeeSettingsTabProps {
    tenantId: string;
    initialEmployees: Employee[];
    initialResourceType?: string;
    initialTours?: TourSummary[];
}

export function EmployeeSettingsTab({ tenantId, initialEmployees, initialResourceType = "employee", initialTours = [] }: EmployeeSettingsTabProps) {
    const { toast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [activeType, setActiveType] = useState<ResourceType>(initialResourceType as ResourceType);
    const [showToursPanel, setShowToursPanel] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
    const [isExcelDialogOpen, setIsExcelDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [name, setName] = useState("");
    const [title, setTitle] = useState("");
    const [attributes, setAttributes] = useState<Record<string, any>>({});
    const [extraInfo, setExtraInfo] = useState("");

    // Photo & Detail URL State
    const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
    const [detailUrl, setDetailUrl] = useState("");
    const [photoUploading, setPhotoUploading] = useState(false);
    const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
    const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Batch State
    const [batchNames, setBatchNames] = useState("");
    const [batchTitle, setBatchTitle] = useState("");
    const [batchAttributes, setBatchAttributes] = useState<Record<string, any>>({});
    const [batchExtraInfo, setBatchExtraInfo] = useState("");
    const [batchPhotoFile, setBatchPhotoFile] = useState<File | null>(null);
    const [batchPhotoPreview, setBatchPhotoPreview] = useState<string | null>(null);
    const [batchDetailUrl, setBatchDetailUrl] = useState("");
    const batchPhotoInputRef = useRef<HTMLInputElement>(null);

    // Excel State
    const [excelData, setExcelData] = useState<any[]>([]);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    const [excelMapping, setExcelMapping] = useState<Record<string, string>>({});
    const [excelFileName, setExcelFileName] = useState("");

    const config = getResourceTypeConfig(activeType);

    // Filter employees by active type
    const filteredEmployees = employees.filter(
        (e) => (e.resource_type || "employee") === activeType
    );

    const handleTypeChange = async (type: ResourceType) => {
        setShowToursPanel(false);
        setActiveType(type);
        await updateResourceTypePreference(tenantId, type);
    };

    // ---- Single Add/Edit ----
    const openCreateDialog = () => {
        setSelectedEmployee(null);
        setName("");
        setTitle("");
        setAttributes({});
        setExtraInfo("");
        setCoverPhotoUrl(null);
        setDetailUrl("");
        setPendingPhotoFile(null);
        setPendingPhotoPreview(null);
        setIsDialogOpen(true);
    };

    const openEditDialog = (employee: Employee) => {
        setSelectedEmployee(employee);
        setName(employee.name);
        setTitle(employee.title || "");
        setAttributes(employee.attributes || {});
        setExtraInfo(employee.extra_info || "");
        setCoverPhotoUrl(employee.attributes?.cover_photo || null);
        setDetailUrl(employee.attributes?.detail_url || "");
        setIsDialogOpen(true);
    };

    const openDeleteDialog = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsDeleteDialogOpen(true);
    };

    // Photo upload handler
    const handlePhotoUpload = async (file: File, resourceId: string) => {
        setPhotoUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadResourceCoverPhoto(resourceId, tenantId, formData);
        if (result.success && result.url) {
            setCoverPhotoUrl(result.url);
            // Update local employee state
            setEmployees((prev) => prev.map((e) =>
                e.id === resourceId ? { ...e, attributes: { ...e.attributes, cover_photo: result.url } } : e
            ));
            toast({ title: "Başarılı", description: "Kapak fotoğrafı yüklendi." });
        } else {
            toast({ variant: "destructive", title: "Hata", description: result.error || "Fotoğraf yüklenemedi." });
        }
        setPhotoUploading(false);
    };

    // Photo delete handler
    const handlePhotoDelete = async (resourceId: string) => {
        setPhotoUploading(true);
        const result = await deleteResourceCoverPhoto(resourceId, tenantId);
        if (result.success) {
            setCoverPhotoUrl(null);
            setEmployees((prev) => prev.map((e) =>
                e.id === resourceId ? { ...e, attributes: { ...e.attributes, cover_photo: undefined } } : e
            ));
            toast({ title: "Başarılı", description: "Fotoğraf silindi." });
        } else {
            toast({ variant: "destructive", title: "Hata", description: result.error || "Fotoğraf silinemedi." });
        }
        setPhotoUploading(false);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ variant: "destructive", title: "Hata", description: "Ad alanı zorunludur." });
            return;
        }
        setLoading(true);

        // Detay URL'yi attributes'a ekle
        const saveAttributes = { ...attributes };
        if (detailUrl.trim()) {
            saveAttributes.detail_url = detailUrl.trim();
        } else {
            delete saveAttributes.detail_url;
        }
        // cover_photo zaten ayrı action ile kaydediliyor, attributes'tan kopyalamayalım
        if (coverPhotoUrl) {
            saveAttributes.cover_photo = coverPhotoUrl;
        }

        if (selectedEmployee) {
            const result = await updateTenantEmployee(
                selectedEmployee.id, name, title, activeType, saveAttributes, extraInfo
            );
            if (result.success && result.employee) {
                setEmployees(employees.map((e) => e.id === selectedEmployee.id ? result.employee as Employee : e));
                toast({ title: "Başarılı", description: "Kayıt güncellendi." });
                setIsDialogOpen(false);
            } else {
                toast({ variant: "destructive", title: "Hata", description: result.error || "Güncelleme başarısız." });
            }
        } else {
            const result = await addTenantEmployee(tenantId, name, title, activeType, saveAttributes, extraInfo);
            if (result.success && result.employee) {
                const newEmployee = result.employee as Employee;

                // Bekleyen fotoğraf varsa hemen yükle
                if (pendingPhotoFile) {
                    const formData = new FormData();
                    formData.append("file", pendingPhotoFile);
                    const photoResult = await uploadResourceCoverPhoto(newEmployee.id, tenantId, formData);
                    if (photoResult.success && photoResult.url) {
                        newEmployee.attributes = { ...newEmployee.attributes, cover_photo: photoResult.url };
                    }
                    setPendingPhotoFile(null);
                    setPendingPhotoPreview(null);
                }

                setEmployees([...employees, newEmployee]);
                toast({ title: "Başarılı", description: "Yeni kayıt eklendi." });
                setIsDialogOpen(false);
            } else {
                toast({ variant: "destructive", title: "Hata", description: result.error || "Ekleme başarısız." });
            }
        }
        setLoading(false);
    };

    // ---- Batch Add ----
    const openBatchDialog = () => {
        setBatchNames("");
        setBatchTitle("");
        setBatchAttributes({});
        setBatchExtraInfo("");
        setBatchPhotoFile(null);
        setBatchPhotoPreview(null);
        setBatchDetailUrl("");
        setIsBatchDialogOpen(true);
    };

    const handleBatchSave = async () => {
        const names = batchNames.split("\n").map((n) => n.trim()).filter(Boolean);
        if (!names.length) {
            toast({ variant: "destructive", title: "Hata", description: "En az bir isim giriniz." });
            return;
        }
        setLoading(true);

        // Detay URL'yi batch attributes'a ekle
        const saveBatchAttrs = { ...batchAttributes };
        if (batchDetailUrl.trim()) {
            saveBatchAttrs.detail_url = batchDetailUrl.trim();
        }

        const result = await addTenantEmployeesBatch(
            tenantId, names, batchTitle || undefined, activeType, saveBatchAttrs, batchExtraInfo
        );
        if (result.success && result.employees) {
            const newEmployees = result.employees as Employee[];

            // Bekleyen fotoğraf varsa her kaynağa yükle
            if (batchPhotoFile && newEmployees.length > 0) {
                for (const emp of newEmployees) {
                    const formData = new FormData();
                    formData.append("file", batchPhotoFile);
                    const photoResult = await uploadResourceCoverPhoto(emp.id, tenantId, formData);
                    if (photoResult.success && photoResult.url) {
                        emp.attributes = { ...emp.attributes, cover_photo: photoResult.url };
                    }
                }
                setBatchPhotoFile(null);
                setBatchPhotoPreview(null);
            }

            setEmployees([...employees, ...newEmployees]);
            toast({ title: "Başarılı", description: `${newEmployees.length} kayıt eklendi.` });
            setIsBatchDialogOpen(false);
        } else {
            toast({ variant: "destructive", title: "Hata", description: result.error || "Toplu ekleme başarısız." });
        }
        setLoading(false);
    };

    // ---- Excel Import ----
    const handleExcelFile = async (file: File) => {
        try {
            const XLSX = await import("xlsx");
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

            if (data.length < 2) {
                toast({ variant: "destructive", title: "Hata", description: "Excel dosyasında yeterli veri yok." });
                return;
            }

            const headers = (data[0] as string[]).map((h) => String(h || "").trim());
            const rows = data.slice(1).filter((row: any) => row.some((cell: any) => cell !== null && cell !== undefined && cell !== ""));

            setExcelHeaders(headers);
            setExcelData(rows);
            setExcelFileName(file.name);
            setExcelMapping({});
            setIsExcelDialogOpen(true);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Excel Okuma Hatası", description: err.message });
        }
    };

    const handleExcelImport = async () => {
        const nameCol = Object.entries(excelMapping).find(([, v]) => v === "name");
        if (!nameCol) {
            toast({ variant: "destructive", title: "Hata", description: "Lütfen 'Ad' sütununu eşleştirin." });
            return;
        }

        setLoading(true);

        const nameIdx = excelHeaders.indexOf(nameCol[0]);
        const mappableFields = config.excelMappableFields;
        let successCount = 0;

        for (const row of excelData) {
            const rowName = String(row[nameIdx] || "").trim();
            if (!rowName) continue;

            let rowTitle: string | undefined;
            const rowAttrs: Record<string, any> = {};
            let rowExtraInfo: string | undefined;

            for (const [headerName, fieldKey] of Object.entries(excelMapping)) {
                if (fieldKey === "name") continue;
                const colIdx = excelHeaders.indexOf(headerName);
                if (colIdx < 0) continue;
                const val = row[colIdx];
                if (val === undefined || val === null || val === "") continue;

                if (fieldKey === "title") {
                    rowTitle = String(val);
                } else if (fieldKey === "extra_info") {
                    rowExtraInfo = String(val);
                } else {
                    rowAttrs[fieldKey] = val;
                }
            }

            const result = await addTenantEmployee(tenantId, rowName, rowTitle, activeType, rowAttrs, rowExtraInfo);
            if (result.success && result.employee) {
                setEmployees((prev) => [...prev, result.employee as Employee]);
                successCount++;
            }
        }

        toast({ title: "İçe Aktarma Tamamlandı", description: `${successCount} kayıt başarıyla eklendi.` });
        setIsExcelDialogOpen(false);
        setLoading(false);
    };

    // ---- Delete ----
    const handleDelete = async () => {
        if (!selectedEmployee) return;
        setLoading(true);
        const result = await deleteTenantEmployee(selectedEmployee.id);
        if (result.success) {
            setEmployees(employees.filter((e) => e.id !== selectedEmployee.id));
            toast({ title: "Başarılı", description: "Kayıt silindi." });
            setIsDeleteDialogOpen(false);
        } else {
            toast({ variant: "destructive", title: "Hata", description: result.error || "Silme başarısız." });
        }
        setLoading(false);
    };

    // ---- Attribute value helpers ----
    const setAttr = (key: string, val: any, target: "single" | "batch" = "single") => {
        if (target === "batch") {
            setBatchAttributes((prev) => ({ ...prev, [key]: val }));
        } else {
            setAttributes((prev) => ({ ...prev, [key]: val }));
        }
    };

    /** Render attribute fields for a given config */
    const renderAttributeFields = (cfg: ResourceTypeConfig, vals: Record<string, any>, target: "single" | "batch") => (
        <div className="grid grid-cols-2 gap-3">
            {cfg.attributeFields.map((field) => (
                <div key={field.key} className={
                    field.type === "checkbox" ? "flex items-center gap-2 col-span-1" :
                    field.type === "multi-select" ? "space-y-1.5 col-span-2" :
                    "space-y-1 col-span-1"
                }>
                    {field.type === "checkbox" ? (
                        <>
                            <input
                                type="checkbox"
                                id={`${target}-${field.key}`}
                                checked={!!vals[field.key]}
                                onChange={(e) => setAttr(field.key, e.target.checked, target)}
                                className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                            />
                            <label htmlFor={`${target}-${field.key}`} className="text-sm text-slate-700">{field.label}</label>
                        </>
                    ) : field.type === "multi-select" ? (
                        <>
                            <label className="text-xs font-medium text-slate-600">{field.label}</label>
                            <div className="flex flex-wrap gap-2">
                                {field.options?.map((option) => {
                                    const currentVal: string[] = Array.isArray(vals[field.key]) ? vals[field.key] : [];
                                    const isChecked = currentVal.includes(option);
                                    return (
                                        <label
                                            key={option}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-all ${
                                                isChecked
                                                    ? "border-orange-400 bg-orange-50 text-orange-700 font-medium"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50/50"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                    const newVal = isChecked
                                                        ? currentVal.filter(v => v !== option)
                                                        : [...currentVal, option];
                                                    setAttr(field.key, newVal, target);
                                                }}
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                            />
                                            {option}
                                        </label>
                                    );
                                })}
                            </div>
                            {Array.isArray(vals[field.key]) && vals[field.key].length > 0 && (
                                <p className="text-xs text-emerald-600 mt-1">
                                    ✅ Seçili: {vals[field.key].join(", ")}
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <label className="text-xs font-medium text-slate-600">{field.label}{field.suffix ? ` (${field.suffix})` : ""}</label>
                            {field.type === "select" ? (
                                <select
                                    value={vals[field.key] || ""}
                                    onChange={(e) => setAttr(field.key, e.target.value, target)}
                                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
                                >
                                    <option value="">Seçiniz...</option>
                                    {field.options?.map((o) => (
                                        <option key={o} value={o}>{o}</option>
                                    ))}
                                </select>
                            ) : (
                                <Input
                                    type={field.type}
                                    value={vals[field.key] || ""}
                                    onChange={(e) => setAttr(field.key, field.type === "number" ? Number(e.target.value) || "" : e.target.value, target)}
                                    placeholder={field.placeholder}
                                    className="h-9"
                                />
                            )}
                        </>
                    )}
                </div>
            ))}
        </div>
    );

    /** Get value to display in table for a column */
    const getCellValue = (emp: Employee, colKey: string): string => {
        if (colKey === "name") return emp.name;
        if (colKey === "title") return emp.title || "-";
        if (colKey === "brand_model") {
            const a = emp.attributes || {};
            return [a.brand, a.model].filter(Boolean).join(" ") || "-";
        }
        const attrVal = (emp.attributes || {})[colKey];
        if (attrVal === undefined || attrVal === null || attrVal === "") return "-";
        if (Array.isArray(attrVal)) return attrVal.join(", ") || "-";
        if (typeof attrVal === "boolean") return attrVal ? "✓" : "-";
        return String(attrVal);
    };

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 flex items-start gap-3 shadow-sm">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <strong>Takviminizi Sadece Personeliniz İçin Değil, Her Şey İçin Kullanın!</strong>
                    <p className="mt-1 text-blue-700">
                        Aşağıdan kaynak tipinizi seçerek işletmenize uygun kaynakları (personel, oda, tekne, araç vb.) detaylı özellikleriyle ekleyebilirsiniz. AI Asistanınız bu bilgileri müsaitlik kontrolü ve randevu oluşturma için kullanacaktır.
                    </p>
                </div>
            </div>

            {/* Resource Type Selector & Tours */}
            <div className="flex flex-nowrap overflow-x-auto gap-1.5 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {RESOURCE_TYPES.map((rt) => (
                    <button
                        key={rt.id}
                        onClick={() => handleTypeChange(rt.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-medium transition-all shrink-0 ${
                            activeType === rt.id && !showToursPanel
                                ? "border-orange-400 bg-orange-50 text-orange-700 shadow-sm"
                                : "border-slate-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50/50"
                        }`}
                    >
                        <ResourceIcon name={rt.iconName} className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">{rt.label}</span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 ml-0.5 shrink-0">
                            {employees.filter((e) => (e.resource_type || "employee") === rt.id).length}
                        </span>
                    </button>
                ))}
                <button
                    onClick={() => setShowToursPanel(true)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-medium transition-all shrink-0 ${
                        showToursPanel
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm"
                            : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50"
                    }`}
                >
                    <Compass className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">Turlar</span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 ml-0.5 shrink-0">
                        {initialTours.length}
                    </span>
                </button>
            </div>

            {showToursPanel ? (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
                                <Compass className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Tur Yönetimi</h3>
                                <p className="text-sm text-slate-500">
                                    Tekne turları, otobüs gezileri, kültürel turlar ve seyahat paketlerini yönetin.
                                </p>
                            </div>
                        </div>
                        <a
                            href="/panel/tours"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            {initialTours.length > 0 ? 'Turları Yönet' : 'İlk Turunuzu Ekleyin'}
                            <ChevronRight className="w-4 h-4" />
                        </a>
                    </div>

                    {initialTours.length > 0 ? (
                        <div className="space-y-2">
                            {initialTours.map((tour) => (
                                <div key={tour.id} className={`flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-emerald-100 shadow-sm transition-all hover:shadow-md ${!tour.is_active ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2.5 h-2.5 rounded-full ${tour.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                                        <div>
                                            <span className="text-sm font-semibold text-slate-800">{tour.name}</span>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                                <span className="font-medium text-slate-600">{tour.capacity} kişi</span>
                                                {tour.price_per_person && <span>• {tour.price_per_person}₺/kişi</span>}
                                                {tour.route && <span className="truncate max-w-[150px] sm:max-w-[200px]">• {tour.route}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <a href={`/panel/tours/${tour.id}`} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium px-3 py-1.5 rounded-md hover:bg-emerald-50 transition-colors">
                                        Detaya Git
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white border-2 border-dashed border-emerald-200 rounded-xl p-8 text-center mt-4">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                                <Compass className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h4 className="font-semibold text-lg text-slate-800 mb-2">Henüz tur eklenmedi</h4>
                            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                                Tekne turu, otobüs gezisi veya kültürel tur ekleyin. 
                                AI asistanınız müşterilere otomatik tur bilgisi verecek ve rezervasyon oluşturacak.
                            </p>
                            <a href="/panel/tours" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors">
                                <Plus className="w-4 h-4" /> Tur Oluştur
                            </a>
                        </div>
                    )}
                </div>
            ) : (
                <Card className="border-orange-500">
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <CalendarDays className="w-5 h-5" />
                            <ResourceIcon name={config.iconName} className="w-5 h-5" />
                            {config.label} Yönetimi
                        </CardTitle>
                        <CardDescription>
                            İşletmenizdeki {config.label.toLowerCase()} kayıtlarını ekleyin ve yönetin.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" onClick={openBatchDialog} className="text-sm">
                            <Layers className="w-4 h-4 mr-1.5" />
                            Toplu Ekle
                        </Button>
                        <label className="cursor-pointer">
                            <Button variant="outline" className="text-sm" asChild>
                                <span>
                                    <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                                    Excel&apos;den Aktar
                                </span>
                            </Button>
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleExcelFile(f);
                                    e.target.value = "";
                                }}
                            />
                        </label>
                        <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700 text-white text-sm">
                            <Plus className="w-4 h-4 mr-1.5" />
                            Yeni Ekle
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredEmployees.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-lg">
                            <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <h3 className="text-sm font-semibold text-slate-600">Henüz {config.label.toLowerCase()} eklenmemiş</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                                Yukarıdaki &quot;Yeni Ekle&quot; butonunu kullanarak ilk kaydınızı oluşturun.
                            </p>
                        </div>
                    ) : (
                        <div className="border rounded-md overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {config.tableColumns.map((col) => (
                                            <TableHead key={col.key}>{col.label}</TableHead>
                                        ))}
                                        <TableHead>Ek Bilgi</TableHead>
                                        <TableHead className="text-right">İşlemler</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEmployees.map((emp) => (
                                        <TableRow key={emp.id}>
                                            {config.tableColumns.map((col) => (
                                                <TableCell key={col.key} className={col.key === "name" ? "font-medium text-slate-700" : "text-slate-500"}>
                                                    {getCellValue(emp, col.key)}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-slate-400 text-xs max-w-[200px] truncate" title={emp.extra_info || ""}>
                                                {emp.extra_info || "-"}
                                            </TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(emp)}>
                                                    <Edit2 className="w-4 h-4 text-slate-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(emp)}>
                                                    <Trash2 className="w-4 h-4 text-rose-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>

                {/* ===== SINGLE ADD/EDIT DIALOG ===== */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[550px]">
                        <DialogHeader>
                            <DialogTitle>{selectedEmployee ? "Kayıt Güncelle" : `Yeni ${config.label} Ekle`}</DialogTitle>
                            <DialogDescription>
                                {config.nameLabel} ve özelliklerini giriniz.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto pr-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">{config.nameLabel} *</label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={config.namePlaceholder} />
                                </div>
                                {config.titleLabel && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">{config.titleLabel}</label>
                                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={config.titlePlaceholder} />
                                    </div>
                                )}
                            </div>

                            {config.attributeFields.length > 0 && (
                                <>
                                    <div className="border-t border-dashed border-slate-200 pt-3 mt-2">
                                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-3">
                                            Özellikler
                                        </p>
                                    </div>
                                    {renderAttributeFields(config, attributes, "single")}
                                </>
                            )}

                            {/* 📸 Kapak Fotoğrafı & Detay URL Bölümü */}
                            {config.photosEnabled && (
                                <>
                                    <div className="border-t border-dashed border-slate-200 pt-3 mt-2">
                                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                            <Camera className="w-3.5 h-3.5" /> Görsel & Detay Linki
                                        </p>
                                    </div>

                                    {/* Kapak Fotoğrafı */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-1.5">
                                            <ImageIcon className="w-4 h-4 text-slate-500" />
                                            Kapak Fotoğrafı
                                        </label>

                                        {(coverPhotoUrl || pendingPhotoPreview) ? (
                                            <div className="relative w-full max-w-[200px] aspect-[4/3] rounded-xl overflow-hidden border-2 border-blue-200 shadow-sm group">
                                                <img
                                                    src={coverPhotoUrl || pendingPhotoPreview || ""}
                                                    alt="Kapak"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute top-1.5 left-1.5">
                                                    <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md shadow-sm uppercase">
                                                        {pendingPhotoPreview && !coverPhotoUrl ? "Önizleme" : "Kapak"}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (selectedEmployee && coverPhotoUrl) {
                                                            handlePhotoDelete(selectedEmployee.id);
                                                        } else {
                                                            // Bekleyen dosyayı temizle
                                                            setPendingPhotoFile(null);
                                                            if (pendingPhotoPreview) {
                                                                URL.revokeObjectURL(pendingPhotoPreview);
                                                                setPendingPhotoPreview(null);
                                                            }
                                                        }
                                                    }}
                                                    disabled={photoUploading}
                                                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                                >
                                                    <XIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => photoInputRef.current?.click()}
                                                disabled={photoUploading}
                                                className="w-full max-w-[200px] aspect-[4/3] rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                                            >
                                                {photoUploading ? (
                                                    <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Camera className="w-8 h-8 text-slate-400" />
                                                        <span className="text-xs text-slate-500 font-medium">Fotoğraf Yükle</span>
                                                        <span className="text-[10px] text-slate-400">Max 5MB • JPG, PNG, WebP</span>
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        <input
                                            ref={photoInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (!f) return;
                                                if (selectedEmployee) {
                                                    // Düzenleme modunda: direkt yükle
                                                    handlePhotoUpload(f, selectedEmployee.id);
                                                } else {
                                                    // Oluşturma modunda: dosyayı beklet, önizleme göster
                                                    setPendingPhotoFile(f);
                                                    setPendingPhotoPreview(URL.createObjectURL(f));
                                                }
                                                e.target.value = "";
                                            }}
                                        />

                                        <div className="flex gap-2 items-start bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-blue-700 leading-relaxed">{config.photoHint}</p>
                                        </div>
                                    </div>

                                    {/* Detay URL */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium flex items-center gap-1.5">
                                            <Link2 className="w-4 h-4 text-slate-500" />
                                            Detay Sayfası URL
                                            <span className="text-xs text-slate-400 font-normal">(opsiyonel)</span>
                                        </label>
                                        <Input
                                            type="url"
                                            value={detailUrl}
                                            onChange={(e) => setDetailUrl(e.target.value)}
                                            placeholder="Örn: https://firmaniz.com/kaynak-detay"
                                            className="h-9"
                                        />
                                        <div className="flex gap-2 items-start bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                            <Link2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-emerald-700 leading-relaxed">{config.detailUrlHint}</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="space-y-1 pt-2">
                                <label className="text-sm font-medium">Ek Bilgiler</label>
                                <Textarea
                                    value={extraInfo}
                                    onChange={(e) => setExtraInfo(e.target.value)}
                                    placeholder={config.extraInfoPlaceholder}
                                    className="min-h-[60px]"
                                />
                                <p className="text-xs text-slate-400">
                                    Standart alanlarla ifade edemediğiniz ek notları buraya yazabilirsiniz. AI asistanınız bu bilgiyi de kullanacaktır.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
                            <Button onClick={handleSave} disabled={loading || !name.trim()} className="bg-orange-600 hover:bg-orange-700 text-white">
                                {loading ? "Kaydediliyor..." : "Kaydet"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ===== BATCH ADD DIALOG ===== */}
                <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Toplu {config.label} Ekleme</DialogTitle>
                            <DialogDescription>
                                Ortak özellikleri bir kez girin, sonra her satıra bir isim yazarak toplu ekleme yapın.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto pr-1">
                            {config.titleLabel && (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Ortak {config.titleLabel}</label>
                                    <Input value={batchTitle} onChange={(e) => setBatchTitle(e.target.value)} placeholder={config.titlePlaceholder} />
                                </div>
                            )}

                            {config.attributeFields.length > 0 && (
                                <>
                                    <div className="border-t border-dashed border-slate-200 pt-3">
                                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-3">
                                            Ortak Özellikler
                                        </p>
                                    </div>
                                    {renderAttributeFields(config, batchAttributes, "batch")}
                                </>
                            )}

                            <div className="space-y-1 pt-2">
                                <label className="text-sm font-medium">Ortak Ek Bilgiler</label>
                                <Textarea
                                    value={batchExtraInfo}
                                    onChange={(e) => setBatchExtraInfo(e.target.value)}
                                    placeholder={config.extraInfoPlaceholder}
                                    className="min-h-[50px]"
                                />
                            </div>

                            {/* 📸 Toplu Kapak Fotoğrafı & Detay URL */}
                            {config.photosEnabled && (
                                <>
                                    <div className="border-t border-dashed border-slate-200 pt-3">
                                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                            <Camera className="w-3.5 h-3.5" /> Ortak Görsel & Detay Linki
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-1.5">
                                            <ImageIcon className="w-4 h-4 text-slate-500" />
                                            Ortak Kapak Fotoğrafı
                                        </label>

                                        {batchPhotoPreview ? (
                                            <div className="relative w-full max-w-[180px] aspect-[4/3] rounded-xl overflow-hidden border-2 border-blue-200 shadow-sm group">
                                                <img src={batchPhotoPreview} alt="Önizleme" className="w-full h-full object-cover" />
                                                <div className="absolute top-1.5 left-1.5">
                                                    <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md shadow-sm uppercase">Önizleme</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setBatchPhotoFile(null);
                                                        if (batchPhotoPreview) URL.revokeObjectURL(batchPhotoPreview);
                                                        setBatchPhotoPreview(null);
                                                    }}
                                                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                                >
                                                    <XIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => batchPhotoInputRef.current?.click()}
                                                className="w-full max-w-[180px] aspect-[4/3] rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <Camera className="w-7 h-7 text-slate-400" />
                                                <span className="text-xs text-slate-500 font-medium">Fotoğraf Yükle</span>
                                                <span className="text-[10px] text-slate-400">Max 5MB</span>
                                            </button>
                                        )}

                                        <input
                                            ref={batchPhotoInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) {
                                                    setBatchPhotoFile(f);
                                                    setBatchPhotoPreview(URL.createObjectURL(f));
                                                }
                                                e.target.value = "";
                                            }}
                                        />

                                        <div className="flex gap-2 items-start bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-blue-700 leading-relaxed">
                                                Bu fotoğraf tüm eklenen kaynaklara ortak olarak atanacaktır. Farklılaştırmak istediğiniz kaynakların fotoğraflarını sonra <strong>düzenleme</strong> ekranından değiştirebilirsiniz.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Detay URL */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium flex items-center gap-1.5">
                                            <Link2 className="w-4 h-4 text-slate-500" />
                                            Ortak Detay Sayfası URL
                                            <span className="text-xs text-slate-400 font-normal">(opsiyonel)</span>
                                        </label>
                                        <Input
                                            type="url"
                                            value={batchDetailUrl}
                                            onChange={(e) => setBatchDetailUrl(e.target.value)}
                                            placeholder="Örn: https://firmaniz.com/kaynak-detay"
                                            className="h-9"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="border-t border-dashed border-slate-200 pt-3 space-y-1">
                                <label className="text-sm font-medium">{config.nameLabel} Listesi (her satır = yeni kayıt) *</label>
                                <Textarea
                                    value={batchNames}
                                    onChange={(e) => setBatchNames(e.target.value)}
                                    placeholder={config.batchPlaceholder}
                                    className="min-h-[120px] font-mono text-sm"
                                />
                                <p className="text-xs text-slate-500">
                                    📎 {batchNames.split("\n").filter((n) => n.trim()).length} kayıt eklenecek
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsBatchDialogOpen(false)}>İptal</Button>
                            <Button
                                onClick={handleBatchSave}
                                disabled={loading || !batchNames.trim()}
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                {loading ? "Ekleniyor..." : `Hepsini Ekle (${batchNames.split("\n").filter((n) => n.trim()).length})`}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ===== EXCEL IMPORT DIALOG ===== */}
                <Dialog open={isExcelDialogOpen} onOpenChange={setIsExcelDialogOpen}>
                    <DialogContent className="sm:max-w-[700px]">
                        <DialogHeader>
                            <DialogTitle>Excel&apos;den {config.label} İçe Aktarma</DialogTitle>
                            <DialogDescription>
                                📄 <strong>{excelFileName}</strong> — {excelData.length} satır bulundu. Sütunları eşleştirin.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto">
                            {/* Column Mapping */}
                            <div className="border rounded-md divide-y">
                                <div className="grid grid-cols-2 px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                                    <span>Excel Sütunu</span>
                                    <span>Sistem Alanı</span>
                                </div>
                                {excelHeaders.map((header) => (
                                    <div key={header} className="grid grid-cols-2 px-4 py-2 items-center">
                                        <span className="text-sm font-medium text-slate-700">{header}</span>
                                        <select
                                            value={excelMapping[header] || ""}
                                            onChange={(e) => setExcelMapping((prev) => ({ ...prev, [header]: e.target.value }))}
                                            className="text-sm border rounded-md px-2 py-1.5 border-slate-200"
                                        >
                                            <option value="">— Atla —</option>
                                            {config.excelMappableFields.map((f) => (
                                                <option key={f.key} value={f.key}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            {/* Preview */}
                            {Object.values(excelMapping).some(Boolean) && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Önizleme (İlk 5 Satır)</p>
                                    <div className="border rounded-md overflow-x-auto text-xs">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-slate-50">
                                                    {Object.entries(excelMapping).filter(([, v]) => v).map(([h, v]) => (
                                                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">
                                                            {config.excelMappableFields.find((f) => f.key === v)?.label || v}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {excelData.slice(0, 5).map((row, i) => (
                                                    <tr key={i} className="border-t">
                                                        {Object.entries(excelMapping).filter(([, v]) => v).map(([h]) => {
                                                            const idx = excelHeaders.indexOf(h);
                                                            return <td key={h} className="px-3 py-1.5 text-slate-700">{row[idx] ?? "-"}</td>;
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsExcelDialogOpen(false)}>İptal</Button>
                            <Button
                                onClick={handleExcelImport}
                                disabled={loading || !Object.values(excelMapping).includes("name")}
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                {loading ? "İçe aktarılıyor..." : `${excelData.length} Kayıt İçe Aktar`}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ===== DELETE DIALOG ===== */}
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Kaydı Sil</DialogTitle>
                            <DialogDescription>
                                <span className="font-bold text-slate-900">{selectedEmployee?.name}</span> isimli kaydı silmek istediğinize emin misiniz?
                                <br /><br />
                                <strong className="text-rose-500">Dikkat:</strong> Bu kayda ait tüm randevu kayıtları da veritabanından silinecektir!
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>İptal</Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                                {loading ? "Siliniyor..." : "Evet, Sil"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </Card>
            )}
        </div>
    );
}
