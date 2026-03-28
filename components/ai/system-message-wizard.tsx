"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  X, ChevronRight, ChevronLeft, Wand2, Loader2, Check, RefreshCw, Sparkles, Search, ExternalLink,
  User, DoorOpen, Ship, Car, UtensilsCrossed, Leaf, Pen, Building2, Scissors, Syringe,
  HeartPulse, Wrench, ShoppingBag, Stethoscope, Heart, Camera, Brain, Gauge,
  PartyPopper, Apple, Calculator, Home, GraduationCap, Dumbbell, PawPrint, Scale,
  SprayCan, Printer, Eye, Flower2, Ruler, Pill, Building, type LucideIcon
} from "lucide-react";
import { sectors, commonQuestions, type SectorDefinition } from "@/lib/ai/system-message-template";
import { createClient } from "@/lib/supabase/client";
import { formatResourceAttributes, type ResourceType } from "@/lib/resource-types";

/** Lucide ikon mapping — iconName string → React component */
const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles, Leaf, Pen, Building2, Scissors, Syringe, HeartPulse, Wrench, ShoppingBag,
  Stethoscope, Heart, Camera, Brain, UtensilsCrossed, Gauge, Car, PartyPopper, Apple,
  Calculator, Home, GraduationCap, Dumbbell, PawPrint, Scale, SprayCan, Printer, Eye,
  Flower2, Ruler, Pill, Ship, Building, User, DoorOpen,
};

function SectorIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Building;
  return <Icon className={className} />;
}

interface Props {
  tenantId: string;
  onComplete: (systemMessage: string) => void;
  onClose: () => void;
}

/** Sektör ID → hangi resource_type'ları otomatik çekeceğiz */
const SECTOR_RESOURCE_MAP: Record<string, ResourceType[]> = {
  hotel: ["room"],
  restaurant: ["table"],
  car_rental: ["vehicle"],
  boat_rental: ["boat"],
  // Personel bazlı sektörler — ayrıca belirtmeye gerek yok, hepsi employee
};

interface RegisteredResource {
  id: string;
  name: string;
  title: string | null;
  resource_type: string;
  attributes: Record<string, any>;
  extra_info: string | null;
}

export function SystemMessageWizard({ tenantId, onComplete, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [selectedSector, setSelectedSector] = useState<SectorDefinition | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [editableMessage, setEditableMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sectorSearch, setSectorSearch] = useState("");

  // Registered resources
  const [allResources, setAllResources] = useState<RegisteredResource[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const filteredSectors = useMemo(() => {
    if (!sectorSearch.trim()) return sectors;
    const q = sectorSearch.toLowerCase();
    return sectors.filter(s => s.label.toLowerCase().includes(q));
  }, [sectorSearch]);

  // Fetch resources when sector changes
  useEffect(() => {
    if (!selectedSector || !tenantId) return;

    const fetchResources = async () => {
      setResourcesLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("tenant_employees")
        .select("id, name, title, resource_type, attributes, extra_info")
        .eq("tenant_id", tenantId)
        .order("name");

      if (data) {
        setAllResources(data as RegisteredResource[]);
        // Auto-select all relevant resources
        const relevantTypes = getRelevantResourceTypes(selectedSector.id);
        const relevant = data.filter(r => relevantTypes.includes(r.resource_type as ResourceType));
        setSelectedResourceIds(new Set(relevant.map(r => r.id)));
      }
      setResourcesLoading(false);
    };
    fetchResources();
  }, [selectedSector, tenantId]);

  /** Sektöre göre ilgili kaynak tiplerini döndürür */
  function getRelevantResourceTypes(sectorId: string): ResourceType[] {
    // Her sektör her zaman employee'leri de gösterebilir
    const mapped = SECTOR_RESOURCE_MAP[sectorId];
    if (mapped) return [...mapped, "employee"];
    return ["employee"];
  }

  /** Kaynak tipinin Türkçe etiketini döndürür */
  function getResourceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      employee: "Personel",
      room: "Oda",
      boat: "Tekne",
      vehicle: "Araç",
      table: "Masa",
    };
    return labels[type] || type;
  }

  /** Seçili kaynakların gruplandırılmış metni — AI prompt'a eklenmek üzere */
  function buildResourcesText(): string {
    const selected = allResources.filter(r => selectedResourceIds.has(r.id));
    if (!selected.length) return "";

    // Gruplama
    const groups: Record<string, RegisteredResource[]> = {};
    for (const r of selected) {
      const type = r.resource_type || "employee";
      if (!groups[type]) groups[type] = [];
      groups[type].push(r);
    }

    const lines: string[] = [];
    for (const [type, resources] of Object.entries(groups)) {
      const label = getResourceTypeLabel(type);
      lines.push(`\n### ${label}ler:`);
      for (const r of resources) {
        const attrs = formatResourceAttributes(r);
        const titlePart = r.title ? ` (${r.title})` : "";
        const attrsPart = attrs ? ` — ${attrs}` : "";
        lines.push(`- ${r.name}${titlePart}${attrsPart}`);
      }
    }

    return lines.join("\n");
  }

  /** Kaynakla ilgili sektörler için employees sorusunu çekilen verilerle doldur */
  function getRelevantResources(): RegisteredResource[] {
    if (!selectedSector) return [];
    const types = getRelevantResourceTypes(selectedSector.id);
    return allResources.filter(r => types.includes(r.resource_type as ResourceType));
  }

  /** Bu sektör kaynak-tabanlı mı? (Otel, Restoran, Araç Kiralama vb.) */
  function isResourceBasedSector(): boolean {
    return !!selectedSector && !!SECTOR_RESOURCE_MAP[selectedSector.id];
  }

  function toggleResource(id: string) {
    setSelectedResourceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setAnswer(id: string, value: string) {
    setAnswers(prev => ({ ...prev, [id]: value }));
  }

  async function handleGenerate() {
    if (!selectedSector) return;
    setLoading(true);
    setError("");

    // Kaynak bilgilerini answers'a ekle
    const resourceText = buildResourcesText();
    const enrichedAnswers = { ...answers };
    if (resourceText) {
      enrichedAnswers["registered_resources"] = resourceText;
    }

    // employees alanı boşsa ve kayıtlı personel seçildiyse otomatik doldur
    if (!enrichedAnswers["employees"] && selectedResourceIds.size > 0) {
      const selectedEmployees = allResources
        .filter(r => selectedResourceIds.has(r.id) && r.resource_type === "employee")
        .map(r => r.title ? `${r.name} (${r.title})` : r.name);
      if (selectedEmployees.length) {
        enrichedAnswers["employees"] = selectedEmployees.join(", ");
      }
    }

    try {
      const res = await fetch("/api/ai/generate-system-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorLabel: selectedSector.label, answers: enrichedAnswers }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setGeneratedMessage(data.systemMessage);
        setEditableMessage(data.systemMessage);
        setStep(4);
      }
    } catch (e: any) {
      setError("Bağlantı hatası: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    onComplete(isEditing ? editableMessage : generatedMessage);
  }

  // Total steps indicator
  const totalSteps = 4;
  const relevantResources = getRelevantResources();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center shadow-md">
              <Wand2 className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">AI Eğitim Dokümanı Sihirbazı</h3>
              <p className="text-xs text-slate-500">
                Adım {step}/{totalSteps}
                {selectedSector && step > 1 && (
                  <span className="inline-flex items-center gap-1 ml-1">
                    — <SectorIcon name={selectedSector.iconName} className="w-3.5 h-3.5 inline" /> {selectedSector.label}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-3">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                  s <= step ? "bg-gradient-to-r from-blue-900 to-orange-500" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* STEP 1: Sektör Seçimi */}
          {step === 1 && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Sektörünüzü Seçin</h4>
              <p className="text-sm text-slate-500 mb-4">İşletmenize en uygun sektörü seçin. AI eğitim dokümanı bu sektöre göre özelleştirilecektir.</p>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Sektör ara..."
                  value={sectorSearch}
                  onChange={(e) => setSectorSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredSectors.map((sector) => (
                  <button
                    key={sector.id}
                    onClick={() => {
                      setSelectedSector(sector);
                      setStep(2);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 hover:shadow-md ${
                      selectedSector?.id === sector.id
                        ? "border-orange-400 bg-orange-50 shadow-sm"
                        : "border-slate-200 hover:border-orange-300 hover:bg-orange-50/50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <SectorIcon name={sector.iconName} className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 leading-tight">{sector.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Firma Soruları */}
          {step === 2 && selectedSector && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Firma Bilgilerinizi Girin</h4>
              <p className="text-sm text-slate-500 mb-5">Bu bilgiler AI asistanınızın doğru çalışması için gereklidir.</p>
              
              <div className="space-y-4">
                {/* Common Questions */}
                {commonQuestions.map((q) => {
                  const placeholder = selectedSector.placeholderOverrides?.[q.id] || q.placeholder;

                  // employees sorusu → kaynak bazlı sektörlerde checkbox listesi göster
                  if (q.id === "employees" && isResourceBasedSector()) {
                    return (
                      <div key={q.id} className="space-y-2">
                        <Label className="text-sm">
                          Kayıtlı Kaynaklarınız
                        </Label>

                        {resourcesLoading ? (
                          <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin" /> Kaynaklar yükleniyor...
                          </div>
                        ) : relevantResources.length > 0 ? (
                          <>
                            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
                              {relevantResources.map((r) => {
                                const attrs = formatResourceAttributes(r);
                                const typeLabel = getResourceTypeLabel(r.resource_type);
                                return (
                                  <label
                                    key={r.id}
                                    className="flex items-start gap-3 px-3 py-2.5 hover:bg-orange-50/50 cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedResourceIds.has(r.id)}
                                      onChange={() => toggleResource(r.id)}
                                      className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-800">{r.name}</span>
                                        {r.title && <span className="text-xs text-slate-500">({r.title})</span>}
                                        <span className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">{typeLabel}</span>
                                      </div>
                                      {attrs && (
                                        <p className="text-xs text-slate-400 truncate mt-0.5">{attrs}</p>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                            <p className="text-xs text-emerald-600">
                              ✅ {selectedResourceIds.size} / {relevantResources.length} kaynak seçildi — Seçilen kaynaklar AI eğitim dokümanına dahil edilecek.
                            </p>
                          </>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3">
                            <p className="text-xs text-amber-800">
                              ⚠️ Henüz kayıtlı kaynağınız yok. Aşağıya manuel olarak yazabilir veya önce{" "}
                              <strong>Ayarlar → Takvim &amp; Kaynak</strong> sayfasından kaynaklarınızı ekleyebilirsiniz.
                            </p>
                            <a
                              href="/panel/settings?tab=employees"
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium mt-1.5 hover:underline"
                            >
                              Kaynak Ekle <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Hala manuel giriş alanı da göster (fallback) */}
                        <div className="mt-2">
                          <Label className="text-xs text-slate-400">veya manuel girin</Label>
                          <Input
                            placeholder={placeholder}
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    );
                  }

                  // employees sorusu → personel sektörlerinde var olan kayıtları göster
                  if (q.id === "employees" && !isResourceBasedSector()) {
                    const employees = allResources.filter(r => r.resource_type === "employee");
                    return (
                      <div key={q.id} className="space-y-1.5">
                        <Label className="text-sm">
                          {q.label}
                          {q.required && <span className="text-red-500 ml-0.5">*</span>}
                        </Label>

                        {employees.length > 0 && (
                          <>
                            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[160px] overflow-y-auto mb-2">
                              {employees.map((r) => (
                                <label
                                  key={r.id}
                                  className="flex items-center gap-3 px-3 py-2 hover:bg-orange-50/50 cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedResourceIds.has(r.id)}
                                    onChange={() => toggleResource(r.id)}
                                    className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                  />
                                  <span className="text-sm text-slate-800">{r.name}</span>
                                  {r.title && <span className="text-xs text-slate-500">({r.title})</span>}
                                </label>
                              ))}
                            </div>
                            <p className="text-xs text-emerald-600 mb-2">
                              ✅ {selectedResourceIds.size} / {employees.length} personel seçildi
                            </p>
                          </>
                        )}

                        <Input
                          placeholder={placeholder}
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                        />
                        <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mt-1">
                          <span className="text-amber-500 text-base mt-0.5 shrink-0">⚠️</span>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            AI asistanın randevuları takvime otomatik olarak doğru personele işleyebilmesi için, burada yazdığınız personel isimleri ile <strong>Ayarlar → Takvim &amp; Kaynak</strong> sekmesindeki kayıtların isimleri <strong>birebir aynı</strong> olmalıdır.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                  <div key={q.id} className="space-y-1.5">
                    <Label className="text-sm">
                      {q.label}
                      {q.required && <span className="text-red-500 ml-0.5">*</span>}
                    </Label>
                    {q.type === 'textarea' ? (
                      <Textarea
                        placeholder={placeholder}
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        className="min-h-[80px]"
                      />
                    ) : q.type === 'select' ? (
                      <select
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm border-slate-200 bg-white"
                      >
                        <option value="">Seçiniz...</option>
                        {q.options?.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        placeholder={placeholder}
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                      />
                    )}
                    {q.id === 'appointment_duration' && (
                      <div className="flex gap-2 items-start bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 mt-1">
                        <span className="text-blue-500 text-base mt-0.5 shrink-0">💡</span>
                        <p className="text-xs text-blue-800 leading-relaxed">
                          Bu alan genel varsayılan süredir. Aşağıdaki <strong>Hizmetler</strong> bölümünde her hizmetin yanına ayrıca işlem süresini de belirtebilirsiniz. <em>Örn: {selectedSector.placeholderOverrides?.duration_hint || 'Saç kesimi (30 dk), Boya (90 dk)'}</em>
                        </p>
                      </div>
                    )}
                  </div>
                  );
                })}

                {/* Extra Questions - sektöre özel */}
                {selectedSector.extraQuestions.length > 0 && (
                  <>
                    <div className="border-t border-dashed border-slate-200 pt-4 mt-4">
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <SectorIcon name={selectedSector.iconName} className="w-3.5 h-3.5" /> {selectedSector.label} — Sektöre Özel Sorular
                      </p>
                    </div>
                    {selectedSector.extraQuestions
                      .filter((q) => {
                        // trendyol_integrate sorusu sadece has_trendyol=Evet ise göster
                        if (q.id === 'trendyol_integrate') return answers['has_trendyol'] === 'Evet';
                        return true;
                      })
                      .map((q) => (
                      <div key={q.id} className="space-y-1.5">
                        <Label className="text-sm">
                          {q.label}
                          {q.required && <span className="text-red-500 ml-0.5">*</span>}
                        </Label>
                        {q.type === 'textarea' ? (
                          <Textarea
                            placeholder={q.placeholder}
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                            className="min-h-[80px]"
                          />
                        ) : q.type === 'select' ? (
                          <select
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                            className="w-full border rounded-md px-3 py-2 text-sm border-slate-200 bg-white"
                          >
                            <option value="">Seçiniz...</option>
                            {q.options?.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            placeholder={q.placeholder}
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                          />
                        )}
                        {/* Trendyol entegrasyon bilgi kutusu */}
                        {q.id === 'trendyol_integrate' && answers['trendyol_integrate'] === 'Evet' && (
                          <div className="flex gap-2 items-start bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 mt-1">
                            <span className="text-orange-500 text-base mt-0.5 shrink-0">🛍️</span>
                            <p className="text-xs text-orange-800 leading-relaxed">
                              Harika! Eğitim dokümanınız Trendyol mağaza entegrasyonuna uygun olarak oluşturulacak.
                              AI asistanınız ürün önerme, sipariş sorgulama ve iade talebi oluşturma yeteneklerine sahip olacak.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Oluşturuluyor */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              {loading ? (
                <>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-blue-900 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-10 h-10 text-orange-400" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg text-slate-800">Eğitim dokümanınız oluşturuluyor...</p>
                    <p className="text-sm text-slate-500 mt-1">Yapay Zeka ile sektörünüze özel eğitim dokümanı hazırlıyor</p>
                  </div>
                </>
              ) : error ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="w-10 h-10 text-red-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg text-red-700">Hata Oluştu</p>
                    <p className="text-sm text-red-500 mt-1">{error}</p>
                  </div>
                  <Button onClick={handleGenerate} variant="outline" className="mt-2">
                    <RefreshCw className="w-4 h-4 mr-2" /> Tekrar Dene
                  </Button>
                </>
              ) : null}
            </div>
          )}

          {/* STEP 4: Önizleme & Düzenleme */}
          {step === 4 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-800">Oluşturulan AI Eğitim Dokümanı</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Kontrol edin, düzenleyin ve onaylayın.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs"
                  >
                    {isEditing ? <Check className="w-3 h-3 mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}
                    {isEditing ? "Önizlemeye Dön" : "Düzenle"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setStep(3); handleGenerate(); }}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Yeniden Oluştur
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <Textarea
                  value={editableMessage}
                  onChange={(e) => setEditableMessage(e.target.value)}
                  className="min-h-[400px] font-mono text-xs leading-relaxed"
                />
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-h-[400px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                    {generatedMessage}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between shrink-0">
          <div>
            {step > 1 && step !== 3 && (
              <Button variant="ghost" onClick={() => setStep(step === 4 ? 2 : step - 1)} className="text-slate-500">
                <ChevronLeft className="w-4 h-4 mr-1" /> Geri
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step === 2 && (
              <Button
                onClick={() => {
                  const requiredCommon = commonQuestions.filter(q => q.required);
                  const requiredExtra = selectedSector?.extraQuestions.filter(q => q.required) || [];
                  const allRequired = [...requiredCommon, ...requiredExtra];
                  // employees sorusu kaynak bazlı sektörlerde artık zorunlu değil (checkbox'tan geliyor)
                  const missing = allRequired.filter(q => {
                    if (q.id === "employees" && isResourceBasedSector() && selectedResourceIds.size > 0) return false;
                    return !answers[q.id]?.trim();
                  });
                  if (missing.length > 0) {
                    setError(`Lütfen zorunlu alanları doldurun: ${missing.map(q => q.label).join(", ")}`);
                    return;
                  }
                  setError("");
                  setStep(3);
                  setTimeout(() => handleGenerate(), 100);
                }}
                className="bg-blue-900 hover:bg-blue-950 text-orange-400"
              >
                <Sparkles className="w-4 h-4 mr-2" /> AI ile Oluştur
              </Button>
            )}
            {step === 2 && error && (
              <p className="text-xs text-red-500 self-center">{error}</p>
            )}
            {step === 4 && (
              <Button
                onClick={handleApply}
                className="bg-blue-900 hover:bg-blue-950 text-orange-400"
              >
                <Check className="w-4 h-4 mr-2" /> Onayla ve Uygula
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
