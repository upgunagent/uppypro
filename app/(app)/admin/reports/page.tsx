import { Suspense } from "react";
import { ReportsClient } from "./reports-client";
import {
  getAiCostSummary,
  getAiCostTrend,
  getModelDistribution,
  getTenantUsage,
  getTrendyolReport,
  getChannelReport,
  getRevenueReport,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [
    aiCostSummary,
    aiCostTrend,
    modelDistribution,
    tenantUsage,
    trendyolReport,
    channelReport,
    revenueReport,
  ] = await Promise.all([
    getAiCostSummary(),
    getAiCostTrend(),
    getModelDistribution(),
    getTenantUsage(),
    getTrendyolReport(),
    getChannelReport(),
    getRevenueReport(),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Yükleniyor...</div>}>
      <ReportsClient
        aiCostSummary={aiCostSummary}
        aiCostTrend={aiCostTrend}
        modelDistribution={modelDistribution}
        tenantUsage={tenantUsage}
        trendyolReport={trendyolReport}
        channelReport={channelReport}
        revenueReport={revenueReport}
      />
    </Suspense>
  );
}
