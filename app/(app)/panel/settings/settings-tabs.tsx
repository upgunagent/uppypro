"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, CreditCard, User, Plug, MessageSquare, Users, Megaphone } from "lucide-react";
import { ReactNode } from "react";

interface SettingsTabsProps {
    connectionTab: ReactNode;
    profileTab: ReactNode;
    whatsappTemplatesTab: ReactNode;
    subscriptionTab: ReactNode;
    employeeTab: ReactNode;
    chatSettingsTab: ReactNode;
    defaultValue?: string;
}

export function SettingsTabs({ connectionTab, profileTab, whatsappTemplatesTab, subscriptionTab, employeeTab, chatSettingsTab, defaultValue = "connections" }: SettingsTabsProps) {
    return (
        <Tabs defaultValue={defaultValue} className="w-full space-y-6">
            <TabsList className="flex md:grid w-full overflow-x-auto md:grid-cols-6 h-auto md:h-12 bg-slate-100 p-1 rounded-lg">
                <TabsTrigger value="connections" className="data-[state=active]:bg-white data-[state=active]:text-[#ff6900] data-[state=active]:shadow-sm rounded-md transition-all text-slate-600 font-medium hover:text-slate-900">
                    <Plug className="w-4 h-4 mr-2" />
                    Bağlantı Ayarları
                </TabsTrigger>
                <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:text-[#ff6900] data-[state=active]:shadow-sm rounded-md transition-all text-slate-600 font-medium hover:text-slate-900">
                    <User className="w-4 h-4 mr-2" />
                    Kişisel/Firma
                </TabsTrigger>
                <TabsTrigger value="chat" className="data-[state=active]:bg-white data-[state=active]:text-[#ff6900] data-[state=active]:shadow-sm rounded-md transition-all text-slate-600 font-medium hover:text-slate-900">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Hazır Cevaplar
                </TabsTrigger>
                <TabsTrigger value="employees" className="data-[state=active]:bg-white data-[state=active]:text-[#ff6900] data-[state=active]:shadow-sm rounded-md transition-all text-slate-600 font-medium hover:text-slate-900">
                    <Users className="w-4 h-4 mr-2" />
                    Çalışanlar
                </TabsTrigger>
                <TabsTrigger value="whatsapp-templates" className="data-[state=active]:bg-white data-[state=active]:text-[#ff6900] data-[state=active]:shadow-sm rounded-md transition-all text-slate-600 font-medium hover:text-slate-900">
                    <Megaphone className="w-4 h-4 mr-2" />
                    WhatsApp Şablonları
                </TabsTrigger>
                <TabsTrigger value="subscription" className="data-[state=active]:bg-white data-[state=active]:text-[#ff6900] data-[state=active]:shadow-sm rounded-md transition-all text-slate-600 font-medium hover:text-slate-900">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Abonelik
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
    return (
        <Tabs defaultValue="channels" className="w-full space-y-6">
            <div className="border-b border-slate-200">
                <TabsList className="bg-transparent h-auto p-0 space-x-6">
                    <TabsTrigger
                        value="channels"
                        className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 text-slate-500 data-[state=active]:text-primary mb-[-1px]"
                    >
                        İletişim Kanalları
                    </TabsTrigger>
                    <TabsTrigger
                        value="ai"
                        className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 text-slate-500 data-[state=active]:text-primary mb-[-1px]"
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
    return (
        <Tabs defaultValue="existing" className="w-full space-y-6">
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
