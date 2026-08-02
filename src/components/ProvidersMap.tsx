import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Screen } from '../types';

/**
 * Mapa de prestadores.
 *
 * Vive em arquivo próprio para que o Leaflet — biblioteca, CSS e imagens dos
 * marcadores — saia do carregamento inicial da home. O mapa só aparece quando
 * o usuário troca para o modo mapa, mas antes disso o pacote vinha junto de
 * qualquer forma, pesando para quem nunca o abre.
 */

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const createProviderIcon = (imageUrl: string) =>
  L.divIcon({
    className: 'custom-provider-marker',
    html: `<div class="size-10 rounded-full border-2 border-primary bg-white overflow-hidden shadow-lg transform -translate-x-1/2 -translate-y-1/2"><img src="${imageUrl}" class="w-full h-full object-cover" /></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

/** Recentra o mapa quando a cidade ou o GPS mudam. */
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

interface ProvidersMapProps {
  center: [number, number];
  userCoords: { lat: number; lng: number } | null;
  providers: any[];
  onNavigate: (screen: Screen, params?: any) => void;
}

export default function ProvidersMap({ center, userCoords, providers, onNavigate }: ProvidersMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={userCoords ? 13 : 12}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MapUpdater center={center} />

      {userCoords && (
        <CircleMarker
          center={[userCoords.lat, userCoords.lng]}
          radius={8}
          pathOptions={{ fillColor: '#3b82f6', color: '#ffffff', weight: 3, fillOpacity: 1 }}
        >
          <Popup>📍 Você está aqui</Popup>
        </CircleMarker>
      )}

      {providers.map((p) => {
        if (!p.latitude || !p.longitude) return null;
        return (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={createProviderIcon(p.image)}>
            <Popup className="provider-popup">
              <div className="p-2 w-48 font-display bg-[#0f171e] text-white rounded-lg">
                <img src={p.image} loading="lazy" decoding="async" className="w-full h-24 object-cover rounded-md mb-2" alt={p.name} />
                <h4 className="font-bold text-white">{p.name}</h4>
                <p className="text-xs text-primary font-bold mb-1">{p.service}</p>
                <button
                  onClick={() => onNavigate('profile', { professionalId: p.id })}
                  className="w-full bg-primary text-white text-[10px] py-2 rounded font-black mt-2"
                >
                  Ver Perfil
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
