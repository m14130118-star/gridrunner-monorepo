import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function ArenaMap({ zones }: { zones: any[] }) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map('arena-map', { zoomControl: false, attributionControl: false }).setView([55.75, 37.62], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '' }).addTo(map);
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (layerRef.current) { mapRef.current.removeLayer(layerRef.current); layerRef.current = null; }
    if (!zones?.length) return;
    layerRef.current = L.geoJSON({ type: 'FeatureCollection', features: zones } as any, {
      style: (f: any) => {
        const color = f?.properties?.factionColor || '#555';
        const owned = !!f?.properties?.controllingFaction;
        return { color, weight: owned ? 1.5 : 0.5, fillColor: color, fillOpacity: owned ? 0.35 : 0.08 };
      },
    }).addTo(mapRef.current);
  }, [zones]);

  return <div id="arena-map" style={{ width: '100%', height: '100%' }} />;
}
