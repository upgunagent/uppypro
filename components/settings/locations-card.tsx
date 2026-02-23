"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTenantLocation, deleteTenantLocation } from "@/app/actions/locations";
import { MapPin, Plus, Trash2, Map, Loader2, Navigation } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// CSS React-Leaflet için global'de yüklenmeli, genelde layout.tsx veya component içinde dahil edilir.
// Dinamik import gerektiren MapSelector component'i (Hydration hatalarını önlemek için)
import dynamic from 'next/dynamic';

const MapSelector = dynamic(() => import('@/components/settings/map-selector'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse flex items-center justify-center rounded-lg">Harita Yükleniyor...</div>
});

interface LocationData {
    id: string;
    title: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    url: string | null;
}

export function LocationsCard({ tenantId, initialLocations }: { tenantId: string, initialLocations: LocationData[] }) {
    const [locations, setLocations] = useState<LocationData[]>(initialLocations || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: "",
        address: "",
        latitude: "",
        longitude: "",
        url: ""
    });

    // Harita Modalı state
    const [isMapOpen, setIsMapOpen] = useState(false);
    // Harita üstündeki seçim
    const [tempLocation, setTempLocation] = useState<{ lat: number, lng: number } | null>(null);

    const handleMapSelectConfirm = () => {
        if (!tempLocation) return;
        setForm({
            ...form,
            latitude: tempLocation.lat.toString(),
            longitude: tempLocation.lng.toString(),
            url: `https://maps.google.com/?q=${tempLocation.lat},${tempLocation.lng}`
        });
        setIsMapOpen(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.address) {
            alert("Başlık ve Adres alanları zorunludur.");
            return;
        }

        setIsSubmitting(true);
        try {
            const newLoc = await addTenantLocation(tenantId, form);
            setLocations([newLoc, ...locations]);
            setForm({ title: "", address: "", latitude: "", longitude: "", url: "" });
            alert("Konum başarıyla eklendi.");
        } catch (error: any) {
            alert("Konum eklenirken hata: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Bu konumu silmek istediğinize emin misiniz?")) return;

        setIsDeleting(id);
        try {
            await deleteTenantLocation(id);
            setLocations(locations.filter(loc => loc.id !== id));
            alert("Konum silindi.");
        } catch (error: any) {
            alert("Silme hatası: " + error.message);
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/50 p-6">
                <div className="flex items-center gap-3">
                    <div className="bg-red-100 p-2.5 rounded-lg text-red-600">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">İşletme Konumları</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Müşterilerinize gönderebileceğiniz ofis veya mağaza konumlarınızı buradan yönetin.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* Ekleme Formu */}
                <form onSubmit={handleAdd} className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                        <Plus size={16} /> Yeni Konum Ekle
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Konum Başlığı *</Label>
                            <Input
                                placeholder="Örn: Merkez Ofis, Beşiktaş Mağaza"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Google Haritalar URL (İsteğe Bağlı)</Label>
                            <Input
                                placeholder="Örn: https://maps.app.goo.gl/..."
                                value={form.url}
                                onChange={e => setForm({ ...form, url: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Açık Adres *</Label>
                        <Input
                            placeholder="Örn: Barbaros Bulvarı No:123 Beşiktaş/İstanbul"
                            value={form.address}
                            onChange={e => setForm({ ...form, address: e.target.value })}
                            required
                        />
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4 mt-2">
                        <div className="text-sm text-slate-600 flex-1">
                            {form.latitude && form.longitude ? (
                                <div>
                                    <span className="font-semibold text-green-600 flex items-center gap-1"><MapPin size={14} /> Konum seçildi:</span>
                                    <span className="font-mono text-xs opacity-75">{form.latitude}, {form.longitude}</span>
                                </div>
                            ) : (
                                <span>Haritadan işletmenizin tam konumunu işaretleyin. (İsteğe bağlı)</span>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsMapOpen(true)}
                            className="bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 w-full md:w-auto shrink-0 transition-colors"
                        >
                            <Navigation className="w-4 h-4 mr-2" />
                            {form.latitude ? 'Konumu Değiştir' : 'Haritadan Konum Seç'}
                        </Button>
                    </div>

                    <div className="flex justify-end mt-4">
                        <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 w-full md:w-auto">
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Konumu Kaydet
                        </Button>
                    </div>
                </form>

                {/* Kayıtlı Konumlar Listesi */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Kayıtlı Konumlar</h3>

                    {locations.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 bg-slate-50 border border-dashed rounded-xl">
                            <Map className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400" />
                            Henüz eklenmiş bir konumunuz yok.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {locations.map((loc) => (
                                <div key={loc.id} className="p-4 border border-slate-200 rounded-xl hover:border-red-200 transition-colors group relative bg-white">
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <MapPin className="text-red-500" size={16} />
                                        {loc.title}
                                    </h4>
                                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{loc.address}</p>

                                    {(loc.latitude || loc.url) && (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 bg-slate-50 w-fit px-2 py-1 rounded">
                                            {loc.latitude ? `${loc.latitude}, ${loc.longitude}` : 'Sadece Link Kayıtlı'}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleDelete(loc.id)}
                                        disabled={isDeleting === loc.id}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Konumu Sil"
                                    >
                                        {isDeleting === loc.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Harita Modal (Dialog) */}
            <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>Haritadan Konum Seç</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 w-full bg-slate-100 min-h-[400px] h-[50vh] md:h-[60vh] relative z-0">
                        {isMapOpen && (
                            <MapSelector
                                initialLat={form.latitude ? parseFloat(form.latitude) : 41.0082}
                                initialLng={form.longitude ? parseFloat(form.longitude) : 28.9784}
                                onLocationChange={(lat, lng) => setTempLocation({ lat, lng })}
                            />
                        )}
                    </div>

                    <div className="p-4 border-t flex items-center justify-between bg-white z-10">
                        <div className="text-sm text-slate-500 font-mono">
                            {tempLocation ? `${tempLocation.lat.toFixed(6)}, ${tempLocation.lng.toFixed(6)}` : 'Haritaya tıklayarak konum seçin.'}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsMapOpen(false)}>İptal</Button>
                            <Button onClick={handleMapSelectConfirm} disabled={!tempLocation} className="bg-red-600 hover:bg-red-700">Seçimi Kaydet</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
