"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateLeadStatus, updateLeadDetails, deleteLead } from "@/app/(app)/admin/leads/actions";
import Link from "next/link";
import {
    ArrowLeft, Building2, MapPin, Phone, Mail, Globe, Star,
    ExternalLink, Clock, Tag, Trash2, Save, AlertCircle,
    CheckCircle2, FileText, History
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    new: { label: "Yeni", color: "text-blue-700", bg: "bg-blue-100" },
    contacted: { label: "İletişime Geçildi", color: "text-purple-700", bg: "bg-purple-100" },
    demo_scheduled: { label: "Demo Planlandı", color: "text-indigo-700", bg: "bg-indigo-100" },
    proposal: { label: "Teklif Verildi", color: "text-amber-700", bg: "bg-amber-100" },
    won: { label: "Kazanıldı", color: "text-green-700", bg: "bg-green-100" },
    lost: { label: "Kaybedildi", color: "text-red-700", bg: "bg-red-100" },
    archived: { label: "Arşivlendi", color: "text-slate-600", bg: "bg-slate-100" },
};

export default function LeadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const leadId = params.id as string;

    const [lead, setLead] = useState<any>(null);
    const [statusHistory, setStatusHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [website, setWebsite] = useState("");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);

    useEffect(() => {
        const fetchLead = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("leads")
                .select("*")
                .eq("id", leadId)
                .single();

            if (data) {
                setLead(data);
                setEmail(data.email || "");
                setPhone(data.phone || "");
                setWebsite(data.website || "");
                setAddress(data.address || "");
                setNotes(data.notes || "");
                setTags(data.tags || []);
            }

            const { data: history } = await supabase
                .from("lead_status_history")
                .select("*")
                .eq("lead_id", leadId)
                .order("created_at", { ascending: false })
                .limit(10);

            if (history) setStatusHistory(history);
            setLoading(false);
        };
        fetchLead();
    }, [leadId]);

    const handleSave = async () => {
        setSaving(true);
        setSaveMsg(null);
        const result = await updateLeadDetails(leadId, { email, phone, website, address, notes, tags });
        if (result.error) {
            setSaveMsg(`Hata: ${result.error}`);
        } else {
            setSaveMsg("Kaydedildi!");
            setLead((prev: any) => ({ ...prev, email, phone, website, address, notes, tags, email_missing: !email }));
        }
        setSaving(false);
        setTimeout(() => setSaveMsg(null), 3000);
    };

    const handleStatusChange = async (newStatus: string) => {
        const result = await updateLeadStatus(leadId, newStatus);
        if (!result.error) {
            setLead((prev: any) => ({ ...prev, status: newStatus }));
            // Refresh history
            const supabase = createClient();
            const { data: history } = await supabase
                .from("lead_status_history")
                .select("*")
                .eq("lead_id", leadId)
                .order("created_at", { ascending: false })
                .limit(10);
            if (history) setStatusHistory(history);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Bu lead'i silmek istediğinize emin misiniz?")) return;
        await deleteLead(leadId);
        router.push("/admin/leads");
    };

    const addTag = () => {
        const t = tagInput.trim();
        if (t && !tags.includes(t)) {
            setTags([...tags, t]);
            setTagInput("");
        }
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    if (loading) {
        return (
            <div className="p-6 text-center text-slate-400 py-20">
                Yükleniyor...
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="p-6 text-center text-slate-400 py-20">
                Lead bulunamadı
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button 
                    onClick={() => {
                        if (window.history.length > 2) {
                            router.back();
                        } else {
                            router.push(lead.list_id ? `/admin/leads?listId=${lead.list_id}` : "/admin/leads");
                        }
                    }} 
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft size={20} className="text-slate-500" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800">{lead.business_name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        {lead.contact_name && (
                            <span className="text-sm text-slate-600 font-medium flex items-center gap-1">
                                👤 {lead.contact_name}
                            </span>
                        )}
                        {lead.sector_name && (
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Building2 size={14} /> {lead.sector_name}
                            </span>
                        )}
                        {lead.city && (
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                                <MapPin size={14} /> {lead.city}{lead.district ? ` / ${lead.district}` : ""}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleDelete}
                    className="p-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    title="Sil"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Main info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Editable Contact & Info */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Müşteri Bilgileri</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                                    <Phone size={14} /> Telefon
                                </label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="05..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><Mail size={14} /> E-posta Adresi</span>
                                    {lead.email_missing && (
                                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-normal flex items-center gap-1">
                                            <AlertCircle size={11} /> Eksik
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ornek@firma.com"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                />
                            </div>

                            {/* Website */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                                    <Globe size={14} /> Website
                                </label>
                                <input
                                    type="url"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    placeholder="https://"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                />
                            </div>

                            {/* Address */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                                    <MapPin size={14} /> Adres
                                </label>
                                <textarea
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    rows={2}
                                    placeholder="Tam adres..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                                />
                            </div>
                        </div>

                        {lead.google_rating && (
                            <div className="mb-6 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3 w-max">
                                <Star size={18} className="text-amber-400 fill-amber-400" />
                                <div>
                                    <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Google Rating</p>
                                    <p className="text-sm font-semibold text-slate-700">
                                        {lead.google_rating} / 5
                                        {lead.google_review_count && <span className="text-slate-400 font-normal ml-1">({lead.google_review_count} yorum)</span>}
                                    </p>
                                </div>
                            </div>
                        )}

                        <hr className="border-slate-100 my-6" />

                        {/* Notes */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                                <FileText size={14} /> Notlar
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Bu lead hakkında notlarınız..."
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                            />
                        </div>

                        {/* Tags */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                                <Tag size={14} /> Etiketler
                            </label>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {tags.map(tag => (
                                        <span key={tag} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full flex items-center gap-1">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                                    placeholder="Etiket ekle... (Enter'a basın)"
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                                <button onClick={addTag} className="px-5 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors">
                                    Ekle
                                </button>
                            </div>
                        </div>

                        {/* Save button */}
                        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-500/20"
                            >
                                <Save size={18} />
                                {saving ? "Kaydediliyor..." : "Tümünü Kaydet"}
                            </button>
                            {saveMsg && (
                                <span className={`text-sm ${saveMsg.includes("Hata") ? "text-red-600" : "text-green-600"} flex items-center gap-1.5 font-medium`}>
                                    <CheckCircle2 size={16} /> {saveMsg}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Status & History */}
                <div className="space-y-6">
                    {/* Status */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Durum</h2>
                        <div className="space-y-2">
                            {Object.entries(STATUS_MAP).map(([key, val]) => (
                                <button
                                    key={key}
                                    onClick={() => handleStatusChange(key)}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                        lead.status === key
                                            ? `${val.bg} ${val.color} ring-2 ring-offset-1 ring-current`
                                            : "text-slate-500 hover:bg-slate-50"
                                    }`}
                                >
                                    {val.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Score */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Skor</h2>
                        <div className="text-center">
                            <div className={`text-4xl font-bold ${
                                lead.score >= 80 ? "text-green-600" :
                                lead.score >= 50 ? "text-amber-600" :
                                lead.score > 0 ? "text-slate-500" :
                                "text-slate-300"
                            }`}>
                                {lead.score > 0 ? lead.score : "—"}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                {lead.score > 0 ? "/ 100" : "Henüz skorlanmadı"}
                            </p>
                        </div>
                    </div>

                    {/* Status History */}
                    {statusHistory.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                <History size={14} /> Durum Geçmişi
                            </h2>
                            <div className="space-y-3">
                                {statusHistory.map((h) => (
                                    <div key={h.id} className="flex items-start gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-slate-700">
                                                <span className="text-slate-400">{STATUS_MAP[h.old_status]?.label || h.old_status}</span>
                                                {" → "}
                                                <span className="font-medium">{STATUS_MAP[h.new_status]?.label || h.new_status}</span>
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {new Date(h.created_at).toLocaleString("tr-TR")}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Meta info */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Meta</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Kaynak</span>
                                <span className="text-slate-600">{lead.source}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Eklenme</span>
                                <span className="text-slate-600">{new Date(lead.created_at).toLocaleDateString("tr-TR")}</span>
                            </div>
                            {lead.google_place_id && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Google Place</span>
                                    <span className="text-slate-600 text-xs truncate max-w-[120px]">{lead.google_place_id}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
