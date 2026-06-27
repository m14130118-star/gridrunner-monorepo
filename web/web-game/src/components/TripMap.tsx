import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Waypoint {
  id: number;
  name: string;
  lat: number;
  lng: number;
  score: number;
  vibe_tags?: string[];
}

export default function TripMap({ path, waypoints, finish }: { path: [number, number][]; waypoints?: Waypoint[]; finish?: Waypoint }) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const wpMarkersRef = useRef<L.Marker[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const wpIcon = L.divIcon({ className: '', html: '<div style="width:20px;height:20px;border-radius:50%;background:#7c3aed;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.4)"><i class="fa-solid fa-flag" style="font-size:10px"></i></div>', iconSize: [20, 20], iconAnchor: [10, 10] });
  const finishIcon = L.divIcon({ className: '', html: '<div style="width:24px;height:24px;border-radius:50%;background:#ffd740;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.4)">🏁</div>', iconSize: [24, 24], iconAnchor: [12, 12] });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([55.75, 37.62], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([55.75, 37.62], { draggable: false }).addTo(map);
    const polyline = L.polyline([], { color: '#00e676', weight: 4, opacity: 0.8 }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    polylineRef.current = polyline;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update path
  useEffect(() => {
    if (!polylineRef.current || path.length < 2) return;
    polylineRef.current.setLatLngs(path.map(p => L.latLng(p[0], p[1])));
  }, [path]);

  // Follow last position
  useEffect(() => {
    if (path.length === 0 || !mapRef.current || !markerRef.current) return;
    const last = path[path.length - 1];
    markerRef.current.setLatLng(last);
    mapRef.current.setView(last, mapRef.current.getZoom(), { animate: true });
  }, [path.length]);

  // Update waypoint markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    wpMarkersRef.current.forEach(m => m.remove());
    wpMarkersRef.current = [];
    if (waypoints) {
      waypoints.forEach((wp, i) => {
        const label = document.createElement('div');
        label.style.cssText = 'width:22px;height:22px;border-radius:50%;background:#7c3aed;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.4)';
        label.textContent = String(i + 1);
        const icon = L.divIcon({ className: '', html: label.outerHTML, iconSize: [22, 22], iconAnchor: [11, 11] });
        const m = L.marker([wp.lat, wp.lng], { icon }).addTo(map);
        m.bindTooltip(wp.name, { direction: 'top', offset: L.point(0, -12) });
        wpMarkersRef.current.push(m);
      });
    }
    if (finish) {
      const m = L.marker([finish.lat, finish.lng], { icon: finishIcon }).addTo(map);
      m.bindTooltip(`🏁 ${finish.name}`, { direction: 'top', offset: L.point(0, -14) });
      wpMarkersRef.current.push(m);
    }
  }, [waypoints, finish]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }} />
  );
}
