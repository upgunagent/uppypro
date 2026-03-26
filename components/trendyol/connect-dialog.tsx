"use client";

import { useState } from "react";
import { ShoppingBag, Loader2, ExternalLink, CheckCircle2, AlertCircle, X } from "lucide-react";
import { connectTrendyolAction, disconnectTrendyolAction, syncTrendyolManualAction } from "@/app/actions/trendyol";

interface TrendyolConnectDialogProps {
  open: boolean;
  onClose: () => void;
  connection: any;
  onConnectionChange: () => void;
}

export function TrendyolConnectDialog({
  open,
  onClose,
  connection,
  onConnectionChange,
}: TrendyolConnectDialogProps) {
  const [supplierId, setSupplierId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = connection?.status === "connected";

  async function handleConnect() {
    if (!supplierId.trim() || !apiKey.trim() || !apiSecret.trim()) {
      setError("Tüm alanları doldurun");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await connectTrendyolAction({
        supplierId: supplierId.trim(),
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      });

      if (result.success) {
        let msg = `Bağlantı başarılı! ${result.totalProducts} ürün senkronize ediliyor...`;
        if (result.systemMessageUpdated) {
          msg += " Sistem mesajınız otomatik güncellendi.";
        }
        if (result.cloudflareWarning) {
          msg = result.cloudflareWarning;
        }
        setSuccess(msg);
        onConnectionChange();
        setTimeout(() => onClose(), 4000);
      } else {
        setError(result.error || "Bağlantı kurulamadı");
      }
    } catch (e: any) {
      setError(e.message || "Beklenmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Trendyol bağlantısını kesmek istediğinize emin misiniz?")) return;
    setDisconnecting(true);
    try {
      await disconnectTrendyolAction();
      onConnectionChange();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleManualSync() {
    setSyncing(true);
    try {
      const result = await syncTrendyolManualAction();
      if (result.success) {
        setSuccess("Ürünler başarıyla senkronize edildi!");
        onConnectionChange();
      } else {
        setError(result.error || "Senkronizasyon başarısız");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Trendyol Mağaza Bağlantısı</h2>
              <p className="text-white/80 text-sm">
                {isConnected ? "Bağlantı yönetimi" : "Mağazanızı bağlayın"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Bilgilendirme */}
          {!isConnected && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">📋 API bilgilerine nasıl ulaşırım?</p>
              <p className="text-blue-700">
                Trendyol Satıcı Paneli → Hesap Bilgileri → Entegrasyon Bilgileri sayfasından
                "{" "}
                <strong>Yeni Entegratör Ekle</strong>" butonuyla API bilgilerinizi
                oluşturabilirsiniz.
              </p>
              <a
                href="https://partner.trendyol.com/account/info/integration"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800 font-medium underline"
              >
                Trendyol Satıcı Paneli <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Bağlı ise bilgi göster */}
          {isConnected ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Bağlantı Aktif</span>
                </div>
                <div className="space-y-1 text-sm text-green-700">
                  <p>
                    Satıcı ID:{" "}
                    <span className="font-mono font-semibold">
                      {connection.meta_identifiers?.supplier_id || "—"}
                    </span>
                  </p>
                  <p>
                    Ürün Sayısı:{" "}
                    <span className="font-semibold">
                      {connection.meta_identifiers?.total_products || "—"}
                    </span>
                  </p>
                  {connection.meta_identifiers?.last_sync && (
                    <p>
                      Son Senkronizasyon:{" "}
                      <span className="font-semibold">
                        {new Date(connection.meta_identifiers.last_sync).toLocaleString("tr-TR")}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Senkronize ediliyor...
                    </>
                  ) : (
                    "🔄 Ürünleri Senkronize Et"
                  )}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 font-medium"
                >
                  {disconnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Bağlantıyı Kes"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Satıcı ID (Supplier ID) *
                  </label>
                  <input
                    type="text"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    placeholder="100847"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    API Key *
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    API Secret *
                  </label>
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Connect Button */}
              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Bağlantı test ediliyor...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    Bağlantıyı Test Et & Kaydet
                  </>
                )}
              </button>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
