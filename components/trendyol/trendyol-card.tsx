"use client";

import { useState } from "react";
import { ShoppingBag, CheckCircle, Lock, RefreshCw } from "lucide-react";
import { TrendyolConnectDialog } from "@/components/trendyol/connect-dialog";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

interface TrendyolCardProps {
  connection: any;
  isKurumsal: boolean;
}

export function TrendyolCard({ connection, isKurumsal }: TrendyolCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();
  const isConnected = connection?.status === "connected";

  function handleConnectionChange() {
    router.refresh();
  }

  return (
    <>
      <div
        className={clsx(
          "p-6 rounded-2xl border flex flex-col justify-between min-h-[15rem] relative overflow-hidden transition-all duration-300",
          isKurumsal
            ? "bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 border-orange-400/30 text-white hover:shadow-2xl hover:scale-[1.02] animate-card-shimmer"
            : "bg-gradient-to-br from-slate-200 to-slate-300 border-slate-300 text-slate-500"
        )}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

        {/* Sparkles only if Kurumsal */}
        {isKurumsal && (
          <>
            <span className="card-sparkle sparkle-1" />
            <span className="card-sparkle sparkle-2" />
            <span className="card-sparkle sparkle-3" />
            <span className="card-sparkle sparkle-4" />
            <span className="card-sparkle sparkle-5" />
          </>
        )}

        {/* Header */}
        <div className="flex justify-between items-start z-10 relative">
          <div className="flex items-center gap-4">
            <div
              className={clsx(
                "p-3 rounded-2xl shadow-inner border",
                isKurumsal
                  ? "bg-white/20 backdrop-blur-md border-white/10"
                  : "bg-slate-300 border-slate-400/30"
              )}
            >
              {isKurumsal ? (
                <ShoppingBag className="w-8 h-8 text-white" />
              ) : (
                <Lock className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div>
              <h4 className="font-bold text-xl tracking-tight">Trendyol</h4>
              <div className="flex items-center gap-1.5 opacity-90">
                <span
                  className={clsx(
                    "w-2 h-2 rounded-full",
                    isConnected
                      ? "bg-white animate-pulse"
                      : isKurumsal
                      ? "bg-white/40"
                      : "bg-slate-400/40"
                  )}
                />
                <p className="text-xs font-medium">
                  {!isKurumsal
                    ? "Üst Paket Gerekli"
                    : isConnected
                    ? "Sistem Aktif"
                    : "Bağlantı Yok"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 z-10 relative">
          {!isKurumsal ? (
            // Paket uyarısı
            <div className="space-y-3">
              <p className="text-xs opacity-75">
                Trendyol mağaza entegrasyonu sadece UppyPro AI Trendyol ve UppyPro Kurumsal paketlerinde kullanılabilir.
              </p>
              <div className="bg-white/10 rounded-xl p-3 border border-white/5">
                <p className="text-xs">
                  🔒 Paketinizi <strong>Abonelik</strong> sayfanızdan yükseltebilirsiniz.
                </p>
              </div>
            </div>
          ) : isConnected ? (
            // Bağlı durum
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/15 rounded-xl p-2.5 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-wider opacity-70">Ürün</p>
                  <p className="font-bold text-lg">
                    {connection.meta_identifiers?.total_products || "—"}
                  </p>
                </div>
                <div className="bg-white/15 rounded-xl p-2.5 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-wider opacity-70">Durum</p>
                  <p className="font-bold text-sm mt-0.5 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Aktif
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDialogOpen(true)}
                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-white/10"
              >
                <RefreshCw className="w-4 h-4" />
                Yönet
              </button>
            </div>
          ) : (
            // Bağlı değil
            <div className="space-y-3">
              <p className="text-xs opacity-80">
                Trendyol mağazanızı bağlayarak sipariş, ürün ve müşteri
                yönetimini AI asistanınız ile birleştirin.
              </p>
              <button
                onClick={() => setDialogOpen(true)}
                className="w-full bg-white text-orange-600 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-50 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <ShoppingBag className="w-4 h-4" />
                Trendyol&apos;u Bağla
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connect Dialog */}
      <TrendyolConnectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        connection={connection}
        onConnectionChange={handleConnectionChange}
      />
    </>
  );
}
