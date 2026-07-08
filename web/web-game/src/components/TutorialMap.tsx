import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import { useEffect } from 'react';

const playerIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#00e676;border:3px solid #fff;box-shadow:0 0 14px rgba(0,230,118,0.8)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const mineIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:26px;height:26px">
           <div style="position:absolute;inset:0;border-radius:50%;background:rgba(255,0,85,0.25);animation:gr-mine-pulse 1.2s infinite"></div>
           <div style="position:absolute;inset:5px;border-radius:50%;background:#ff0055;border:2px solid #fff;box-shadow:0 0 16px rgba(255,0,85,0.9)"></div>
         </div>
         <style>@keyframes gr-mine-pulse{0%{transform:scale(1);opacity:1}100%{transform:scale(2.2);opacity:0}}</style>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center[0], center[1]]);
  return null;
}

type Props = {
  player: [number, number];
  mine: [number, number] | null;
  locked: boolean;
};

export default function TutorialMap({ player, mine, locked }: Props) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer center={player} zoom={18} style={{ height: '100%', width: '100%' }}
        attributionControl={false} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <Recenter center={player} />
        <Marker position={player} icon={playerIcon} />
        {mine && <Marker position={mine} icon={mineIcon} />}
        {mine && <Circle center={mine} radius={5} pathOptions={{ color: '#ff0055', weight: 1, fillOpacity: 0.08 }} />}
      </MapContainer>
      {locked && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 500,
          background: 'rgba(4,8,12,0.72)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace', fontSize: 12, color: '#8fa3b0', textAlign: 'center', padding: 24,
        }}>
          Карта заблокирована. Включи Режим Ниндзя, чтобы продолжить.
        </div>
      )}
    </div>
  );
}
