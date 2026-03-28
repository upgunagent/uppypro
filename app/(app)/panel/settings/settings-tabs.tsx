"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, CreditCard, User, Plug, MessageSquare, Users, Megaphone, CalendarDays } from "lucide-react";
import { ReactNode, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface SettingsTabsProps {
    connectionTab: ReactNode;
    profileTab: ReactNode;
    whatsappTemplatesTab: ReactNode;
    subscriptionTab: ReactNode;
    employeeTab: ReactNode;
    chatSettingsTab: ReactNode;
    defaultValue?: string;
}

/** Helper: URL search params'ı güncelleyip router.replace yapar */
function useTabParam(paramName: string, defaultValue: string) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const current = searchParams.get(paramName) || defaultValue;

    const set = useCallback((value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(paramName, value);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [router, pathname, searchParams, paramName]);

    return [current, set] as const;
}

export function SettingsTabs({ connectionTab, profileTab, whatsappTemplatesTab, subscriptionTab, employeeTab, chatSettingsTab, defaultValue = "connections" }: SettingsTabsProps) {
    const [currentTab, setCurrentTab] = useTabParam("tab", defaultValue);

    return (
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto bg-slate-100 p-1.5 md:p-1 rounded-xl md:rounded-lg gap-1">
                <TabsTrigger value="connections" className="data-[state=active]:bg-white data-[state=active]:text-[#ff6900] data-[state=active]:shadow-sm rounded-lg md:rounded-md transition-all text-slate-600 font-medium md:font-semibold hover:text-slate-900 flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-2.5 text-[11px] md:text-sm px-1 md:px-3">
                    <Plug className="w-4 h-4 shrink-0" />
                    <span className="leading-tight text-center md:text-left">Bağlantılar</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:text-[#ff6900] data-[state=active]:shadow-sm rounded-lg md:rounded-md transition-all text-slate-600 font-medium md:font-semibold hover:text-slate-900 flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-2.5 text-[11px] md:text-sm px-1 md:px-3">
                    <User className="w-4 h-4 shrink-0" />
                    <span className="leading-tight text-center md:text-left">Kişisel/Firma</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="data-[state=active]:bg-white data-[state=active]:text-[#ff6900] data-[state=active]:shadow-sm rounded-lg md:rounded-md transition-all text-slate-600 font-medium md:font-semibold hover:text-slate-900 flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-2.5 text-[11px] md:text-sm px-1 md:px-3">
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="leading-tight text-center md:text-left">Hazır Cevaplar</span>
                </TabsTrigger>
                <TabsTrigger value="employees" className="data-[state=active]:bg-white data-[state=active]:text-[#ff6900] data-[state=active]:shadow-sm rounded-lg md:rounded-md transition-all text-slate-600 font-medium md:font-semibold hover:text-slate-900 flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-2.5 text-[11px] md:text-sm px-1 md:px-3">
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    <span className="leading-tight text-center md:text-left">Takvim & Kaynak</span>
                </TabsTrigger>
                <TabsTrigger value="whatsapp-templates" className="data-[state=active]:bg-white data-[state=active]:text-[#ff6900] data-[state=active]:shadow-sm rounded-lg md:rounded-md transition-all text-slate-600 font-medium md:font-semibold hover:text-slate-900 flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-2.5 text-[11px] md:text-sm px-1 md:px-3">
                    <Megaphone className="w-4 h-4 shrink-0" />
                    <span className="leading-tight text-center md:text-left">
                        <span className="md:hidden">WhatsApp</span>
                        <span className="hidden md:inline">WhatsApp Şablonlar</span>
                    </span>
                </TabsTrigger>
                <TabsTrigger value="subscription" className="data-[state=active]:bg-white data-[state=active]:text-[#ff6900] data-[state=active]:shadow-sm rounded-lg md:rounded-md transition-all text-slate-600 font-medium md:font-semibold hover:text-slate-900 flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-2.5 text-[11px] md:text-sm px-1 md:px-3">
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span className="leading-tight text-center md:text-left">Abonelik</span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="connections" className="space-y-6 outline-none">
                {connectionTab}
            </TabsContent>

            <TabsContent value="profile" className="space-y-6 outline-none">
                {profileTab}
            </TabsContent>

            <TabsContent value="chat" className="space-y-6 outline-none">
                {chatSettingsTab}
            </TabsContent>

            <TabsContent value="employees" className="space-y-6 outline-none">
                {employeeTab}
            </TabsContent>

            <TabsContent value="whatsapp-templates" className="space-y-6 outline-none">
                {whatsappTemplatesTab}
            </TabsContent>

            <TabsContent value="subscription" className="space-y-6 outline-none">
                {subscriptionTab}
            </TabsContent>
        </Tabs>
    );
}

export function ConnectionTabs({ channelsContent, aiContent }: { channelsContent: ReactNode, aiContent: ReactNode }) {
    const [currentSubtab, setCurrentSubtab] = useTabParam("subtab", "channels");

    return (
        <Tabs value={currentSubtab} onValueChange={setCurrentSubtab} className="w-full space-y-6">
            <div className="pb-4 border-b border-slate-200">
                <TabsList className="bg-transparent h-auto p-0 flex flex-wrap justify-start gap-2">
                    <TabsTrigger
                        value="channels"
                        className="bg-slate-50 transition-colors data-[state=active]:bg-orange-500 data-[state=active]:text-white px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100"
                    >
                        İletişim Kanalları
                    </TabsTrigger>
                    <TabsTrigger
                        value="ai"
                        className="bg-slate-50 transition-colors data-[state=active]:bg-orange-500 data-[state=active]:text-white px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100"
                    >
                        AI Asistan Ayarları
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="channels" className="outline-none pt-4">
                {channelsContent}
            </TabsContent>

            <TabsContent value="ai" className="outline-none pt-4">
                {aiContent}
            </TabsContent>
        </Tabs>
    );
}

export function WhatsappTemplatesTabs({ existingTab, builderTab, campaignTab, reportsTab, customerListsTab }: { existingTab: ReactNode, builderTab: ReactNode, campaignTab: ReactNode, reportsTab: ReactNode, customerListsTab: ReactNode }) {
    const [currentWt, setCurrentWt] = useTabParam("wt", "existing");

    return (
        <Tabs value={currentWt} onValueChange={setCurrentWt} className="w-full space-y-6">
            <div className="pb-4 border-b border-slate-200">
                <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <TabsTrigger
                        value="existing"
                        className="bg-slate-50 transition-colors data-[state=active]:bg-orange-500 data-[state=active]:text-white px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100"
                    >
                        Mevcut Şablonlar
                    </TabsTrigger>
                    <TabsTrigger
                        value="builder"
                        className="bg-slate-50 transition-colors data-[state=active]:bg-orange-500 data-[state=active]:text-white px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100"
                    >
                        Yeni Şablon Oluştur
                    </TabsTrigger>
                    <TabsTrigger
                        value="campaign"
                        className="bg-slate-50 transition-colors data-[state=active]:bg-orange-500 data-[state=active]:text-white px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100"
                    >
                        Yeni Kampanya (Toplu Gönderim)
                    </TabsTrigger>
                    <TabsTrigger
                        value="reports"
                        className="bg-slate-50 transition-colors data-[state=active]:bg-orange-500 data-[state=active]:text-white px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100"
                    >
                        Kampanya Raporları
                    </TabsTrigger>
                    <TabsTrigger
                        value="customer-lists"
                        className="bg-slate-50 transition-colors data-[state=active]:bg-orange-500 data-[state=active]:text-white px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100"
                    >
                        Müşteri Listeleri
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="existing" className="outline-none pt-4">
                {existingTab}
            </TabsContent>

            <TabsContent value="builder" className="outline-none pt-4">
                {builderTab}
            </TabsContent>

            <TabsContent value="campaign" className="outline-none pt-4">
                {campaignTab}
            </TabsContent>

            <TabsContent value="reports" className="outline-none pt-4">
                {reportsTab}
            </TabsContent>

            <TabsContent value="customer-lists" className="outline-none pt-4">
                {customerListsTab}
            </TabsContent>
        </Tabs>
    );
}
