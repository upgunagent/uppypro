"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Building2, User, ChevronRight, Phone, Mail, Instagram, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const router = useRouter();

    useEffect(() => {
        const fetchCustomers = async () => {
            const supabase = createClient();

            // Get current tenant
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Assuming tenant_id logic is handled in RLS or we need to fetch it.
            // For now, let's just fetch all customers the user can see.
            let query = supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });

            if (search) {
                query = query.or(`full_name.ilike.%${search}%,company_name.ilike.%${search}%,phone.ilike.%${search}%`);
            }

            const { data, error } = await query;
            if (data) setCustomers(data);
            setLoading(false);
        };

        fetchCustomers();
    }, [search]);

    return (
        <div className="py-10 pl-12 pr-10 max-w-[1600px] space-y-8">
            <div className="flex flex-col sm:flex-row gap-6 items-end justify-between">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">Müşteriler</h1>
                    <p className="text-slate-500 mt-2 text-lg">Müşterilerinizi ve firmaları tek panelden yönetin.</p>
                </div>
                <Button
                    onClick={() => router.push('/panel/customers/new')}
                    className="h-12 px-6 bg-orange-600 hover:bg-orange-700 text-white font-medium text-base shadow-lg shadow-orange-500/20 rounded-xl transition-all hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5 mr-2" /> Yeni Müşteri
                </Button>
            </div>

            <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <Input
                    placeholder="Müşteri ara (Ad, Firma, Telefon)..."
                    className="pl-12 h-14 bg-white border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-2xl text-base shadow-sm transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-400">Yükleniyor...</p>
                </div>
            ) : customers.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Henüz müşteri yok</h3>
                    <p className="text-slate-500 mb-6 max-w-sm mx-auto">Müşteri listeniz boş görünüyor. Hemen yeni bir müşteri ekleyerek başlayın.</p>
                    <Button onClick={() => router.push('/panel/customers/new')} variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                        İlk Müşteriyi Ekle
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {customers.map((customer) => (
                        <Link href={`/panel/customers/${customer.id}`} key={customer.id} className="group block h-full">
                            <div className="bg-white p-6 rounded-3xl border-2 border-orange-500 shadow-xl shadow-gray-200 hover:shadow-orange-500/10 transition-all duration-300 h-full relative group-hover:-translate-y-1">
                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                    <div className="bg-orange-50 text-orange-600 p-2 rounded-full">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>

                                <div className="flex flex-col h-full">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold transition-colors overflow-hidden ${customer.profile_pic ? 'bg-white' :
                                            customer.invoice_type === 'corporate' ? 'bg-purple-50 text-purple-600' :
                                                customer.instagram_username ? 'bg-pink-50 text-pink-600' :
                                                    'bg-green-50 text-green-600' // Default / WhatsApp style
                                            }`}>
                                            {customer.profile_pic ? (
                                                <img src={customer.profile_pic} alt="" className="w-full h-full object-cover" />
                                            ) : customer.invoice_type === 'corporate' ? (
                                                <Building2 className="w-7 h-7" />
                                            ) : customer.instagram_username ? (
                                                <Instagram className="w-7 h-7" />
                                            ) : (
                                                // Assuming individual with phone is likely WhatsApp or generic
                                                <MessageCircle className="w-7 h-7" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pt-1">
                                            <h3 className="font-bold text-slate-900 truncate text-lg">
                                                {customer.invoice_type === 'corporate' ? customer.company_name : customer.full_name}
                                            </h3>
                                            <div className="text-sm text-slate-500 truncate font-medium">
                                                {customer.invoice_type === 'corporate' ? customer.full_name : 'Bireysel Müşteri'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mt-auto">
                                        {customer.phone && (
                                            <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                                                <Phone className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium">{customer.phone}</span>
                                            </div>
                                        )}
                                        {customer.email && (
                                            <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                                                <Mail className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium truncate">{customer.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
