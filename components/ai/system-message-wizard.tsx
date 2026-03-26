"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  X, ChevronRight, ChevronLeft, Wand2, Loader2, Check, RefreshCw, Sparkles, Search
} from "lucide-react";
import { sectors, commonQuestions, type SectorDefinition } from "@/lib/ai/system-message-template";

interface Props {
  onComplete: (systemMessage: string) => void;
  onClose: () => void;
}

export function SystemMessageWizard({ onComplete, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [selectedSector, setSelectedSector] = useState<SectorDefinition | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [editableMessage, setEditableMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sectorSearch, setSectorSearch] = useState("");

  const filteredSectors = useMemo(() => {
    if (!sectorSearch.trim()) return sectors;
    const q = sectorSearch.toLowerCase();
    return sectors.filter(s => s.label.toLowerCase().includes(q));
  }, [sectorSearch]);

  function setAnswer(id: string, value: string) {
    setAnswers(prev => ({ ...prev, [id]: value }));
  }

  async function handleGenerate() {
    if (!selectedSector) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate-system-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorLabel: selectedSector.label, answers }),
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center shadow-md">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Sistem Mesajı Sihirbazı</h3>
              <p className="text-xs text-slate-500">
                Adım {step}/{totalSteps}
                {selectedSector && step > 1 && ` — ${selectedSector.emoji} ${selectedSector.label}`}
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
                  s <= step ? "bg-gradient-to-r from-purple-500 to-orange-500" : "bg-slate-200"
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
              <p className="text-sm text-slate-500 mb-4">İşletmenize en uygun sektörü seçin. Sistem mesajı bu sektöre göre özelleştirilecektir.</p>
              
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
                        ? "border-purple-400 bg-purple-50 shadow-sm"
                        : "border-slate-200 hover:border-purple-300 hover:bg-purple-50/50"
                    }`}
                  >
                    <span className="text-xl shrink-0">{sector.emoji}</span>
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
                  </div>
                  );
                })}

                {/* Extra Questions - sektöre özel */}
                {selectedSector.extraQuestions.length > 0 && (
                  <>
                    <div className="border-t border-dashed border-slate-200 pt-4 mt-4">
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3">
                        {selectedSector.emoji} {selectedSector.label} — Sektöre Özel Sorular
                      </p>
                    </div>
                    {selectedSector.extraQuestions.map((q) => (
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
                        ) : (
                          <Input
                            placeholder={q.placeholder}
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                          />
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
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg text-slate-800">Sistem mesajınız oluşturuluyor...</p>
                    <p className="text-sm text-slate-500 mt-1">Gemini AI sektörünüze özel mesajı hazırlıyor</p>
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
                  <h4 className="font-semibold text-slate-800">Oluşturulan Sistem Mesajı</h4>
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
                  const missing = allRequired.filter(q => !answers[q.id]?.trim());
                  if (missing.length > 0) {
                    setError(`Lütfen zorunlu alanları doldurun: ${missing.map(q => q.label).join(", ")}`);
                    return;
                  }
                  setError("");
                  setStep(3);
                  setTimeout(() => handleGenerate(), 100);
                }}
                className="bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white"
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
                className="bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white"
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
