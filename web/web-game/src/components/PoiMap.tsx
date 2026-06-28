import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

const customIcon = L.divIcon({
  className: '',
  html: `<div style="background: #7c3aed; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; border: 3px solid #fff; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
           <i class="fa-solid fa-location-dot" style="color: white; transform: rotate(45deg); font-size: 14px;"></i>
         </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function MapEvents({ onClick }: any) {
  useMapEvents({ click: (e: any) => onClick(e.latlng) });
  return null;
}

export default function PoiMap({ center, onClick, markerPos }: any) {
  return (
    <MapContainer center={center} zoom={13} style={{ height: '300px', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapEvents onClick={onClick} />
      {markerPos && <Marker position={markerPos} icon={customIcon} />}
    </MapContainer>
  );
}
