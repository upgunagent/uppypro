import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet ikonlarını düzeltmek için (Next.js'te klasik sorun)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapSelectorProps {
    initialLat: number;
    initialLng: number;
    onLocationChange: (lat: number, lng: number) => void;
}

// Dialog/Modal içinde açıldığında haritanın gri kalmasını engellemek için bileşen
function MapController({ position, setPosition, onLocationChange }: any) {
    const map = useMap();

    useEffect(() => {
        // Modal animasyonu bitince boyutları yeniden hesapla
        // Tailwind/Radix Dialog animasyonu genelde 300ms sürer, garanti etmek için birkaç kez tetikliyoruz.
        const timer1 = setTimeout(() => map.invalidateSize(), 150);
        const timer2 = setTimeout(() => map.invalidateSize(), 400);
        const timer3 = setTimeout(() => map.invalidateSize(), 800);
        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        }
    }, [map]);

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onLocationChange(e.latlng.lat, e.latlng.lng);
        }
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom(), { duration: 0.5 });
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export default function MapSelector({ initialLat, initialLng, onLocationChange }: MapSelectorProps) {
    const [position, setPosition] = useState<L.LatLngExpression | null>({ lat: initialLat, lng: initialLng });
    const [center, setCenter] = useState<[number, number]>([initialLat, initialLng]);

    useEffect(() => {
        // Eğer varsayılan İstanbul konumu geldiyse ve kullanıcı lokasyon izni verirse, mevcut konumuna git
        if (initialLat === 41.0082 && initialLng === 28.9784) {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    const { latitude, longitude } = pos.coords;
                    setCenter([latitude, longitude]);
                    setPosition({ lat: latitude, lng: longitude });
                    onLocationChange(latitude, longitude);
                }, (err) => {
                    console.warn("Geolocation API Error: ", err);
                });
            }
        }
    }, [initialLat, initialLng]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <MapContainer
                center={center}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController
                    position={position}
                    setPosition={setPosition}
                    onLocationChange={onLocationChange}
                />
            </MapContainer>
        </>
    );
}
