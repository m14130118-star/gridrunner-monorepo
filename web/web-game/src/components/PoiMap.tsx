import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { useEffect } from 'react';

const customIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative">
           <div style="background:#00e676;width:28px;height:28px;border-radius:50% 50% 50% 0;border:2px solid #fff;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(0,230,118,0.7),0 4px 6px rgba(0,0,0,0.4)">
             <i class="fa-solid fa-location-dot" style="color:#04120a;transform:rotate(45deg);font-size:13px"></i>
           </div>
         </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function MapEvents({ onClick }: any) {
  useMapEvents({ click: (e: any) => onClick(e.latlng) });
  return null;
}

// Recenter the map when the parent supplies fresh coordinates (e.g. GPS lock)
function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center[0], center[1]]);
  return null;
}

export default function PoiMap({ center, onClick, markerPos }: any) {
  return (
    <MapContainer center={center} zoom={15} style={{ height: '320px', width: '100%' }} attributionControl={false} zoomControl={false}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      <Recenter center={center} />
      <MapEvents onClick={onClick} />
      {markerPos && <Marker position={markerPos} icon={customIcon} />}
    </MapContainer>
  );
}
