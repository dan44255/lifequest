import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';

// Fix default marker icons (Vite/CRA bundling)
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

type Pin = { id: string; name: string; pos: [number, number]; note?: string };

export default function MapView() {
  const [center, setCenter] = useState<LatLngExpression>([43.65107, -79.347015]); // fallback Toronto
  const [pins, setPins] = useState<Pin[]>([
    { id: 'camp', name: 'Camp Ravenwood', pos: [43.72, -79.39], note: 'Safe campsite (advantage on long rests)' },
  ]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {}, { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 8000 }
    );
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden shadow relative">
      <MapContainer center={center} zoom={12} style={{ height: 420, width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {pins.map(p => (
          <Marker key={p.id} position={p.pos}>
            <Popup>
              <strong>{p.name}</strong>
              <div className="text-sm opacity-80">{p.note}</div>
            </Popup>
          </Marker>
        ))}
        <LocateButton onLocate={(lat, lon) => setCenter([lat, lon])} />
        <ClickToAddPin onAdd={(lat, lon) => setPins(prev => [...prev, {
          id: crypto.randomUUID(), name: 'New Pin', pos: [lat, lon], note: 'Dropped pin'
        }])} />
      </MapContainer>
    </div>
  );
}

function LocateButton({ onLocate }: { onLocate: (lat: number, lon: number) => void }) {
  const map = useMap();
  return (
    <button
      className="absolute z-[1000] m-3 rounded-lg bg-white/90 px-3 py-1.5 shadow"
      style={{ top: 0, right: 0 }}
      onClick={() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], 14);
            onLocate(latitude, longitude);
          },
          () => {}
        );
      }}
    >
      📍 Locate me
    </button>
  );
}

function ClickToAddPin({ onAdd }: { onAdd: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onAdd(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}
