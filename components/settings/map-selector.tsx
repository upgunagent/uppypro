import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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

function LocationMarker({ position, setPosition, onLocationChange }: any) {
    const map = useMapEvents({
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

    return (
        <MapContainer
            center={[initialLat, initialLng]}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker
                position={position}
                setPosition={setPosition}
                onLocationChange={onLocationChange}
            />
        </MapContainer>
    );
}
