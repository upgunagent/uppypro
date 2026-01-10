"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, CreditCard, User, Plug, MessageSquare } from "lucide-react";
import { ReactNode } from "react";

interface SettingsTabsProps {
    connectionTab: ReactNode;
    profileTab: ReactNode;
    subscriptionTab: ReactNode;
}

export function SettingsTabs({ connectionTab, profileTab, subscriptionTab }: SettingsTabsProps) {
    return (
        <Tabs defaultValue="connections" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-[600px] h-12 bg-slate-100 p-1">
                <TabsTrigger value="connections" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">
                    <Plug className="w-4 h-4 mr-2" />
                    Bağlantı Ayarları
                </TabsTrigger>
                <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">
                    <User className="w-4 h-4 mr-2" />
                    Kişisel/Firma
                </TabsTrigger>
                <TabsTrigger value="subscription" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">
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
