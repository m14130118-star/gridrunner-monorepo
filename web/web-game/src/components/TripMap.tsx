import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Waypoint {
  id: number; name: string; lat: number; lng: number;
  score: number; vibe_tags?: string[];
}

export default function TripMap({ path, waypoints, finish, currentPos }: {
  path: [number, number][];
  waypoints?: Waypoint[];
  finish?: Waypoint;
  currentPos?: [number, number] | null;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const wpMarkersRef = useRef<L.Marker[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const wpIcon = L.divIcon({
    className: '',
    html: '<div style="width:22px;height:22px;border-radius:50%;background:#7c3aed;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.5)"><i class="fa-solid fa-flag" style="font-size:11px"></i></div>',
    iconSize: [22, 22], iconAnchor: [11, 11],
  });
  const finishIcon = L.divIcon({
    className: '',
    html: '<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ffd740,#ff9100);border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.5)">🏁</div>',
    iconSize: [28, 28], iconAnchor: [14, 14],
  });
  const posIcon = L.divIcon({
    className: '',
    html: '<div style="width:16px;height:16px;border-radius:50%;background:#00e676;border:3px solid #fff;box-shadow:0 0 12px rgba(0,230,118,0.5),0 2px 8px rgba(0,0,0,0.5)"></div>',
    iconSize: [16, 16], iconAnchor: [8, 8],
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const darkSchema = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    });
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Esri World Imagery'
    });

    const savedTheme = localStorage.getItem('gridrunner_map_theme') || 'schema';
    const defaultLayer = savedTheme === 'satellite' ? satellite : darkSchema;

    const map = L.map(containerRef.current, {
      zoomControl: false, attributionControl: false,
      layers: [defaultLayer]
    }).setView([55.75, 37.62], 15);

    L.control.layers({
      "СХЕМА": darkSchema,
      "СПУТНИК": satellite
    }, undefined, { position: 'topright' }).addTo(map);

    const marker = L.marker([55.75, 37.62], { icon: posIcon, zIndexOffset: 1000 }).addTo(map);
    const polyline = L.polyline([], {
      color: '#007aff', weight: 5, opacity: 0.8,
    }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    polylineRef.current = polyline;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!polylineRef.current || path.length < 2) return;
    polylineRef.current.setLatLngs(path.map(p => L.latLng(p[0], p[1])));
  }, [path]);

  useEffect(() => {
    if (path.length === 0 || !mapRef.current || !markerRef.current) return;
    const last = path[path.length - 1];
    markerRef.current.setLatLng(last);
    mapRef.current.setView(last, mapRef.current.getZoom(), { animate: true });
  }, [path.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    wpMarkersRef.current.forEach(m => m.remove());
    wpMarkersRef.current = [];
    if (waypoints) {
      waypoints.forEach((wp, i) => {
        const label = document.createElement('div');
        label.style.cssText = 'width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#6d28d9);border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.5)';
        label.textContent = String(i + 1);
        const icon = L.divIcon({ className: '', html: label.outerHTML, iconSize: [24, 24], iconAnchor: [12, 12] });
        const m = L.marker([wp.lat, wp.lng], { icon }).addTo(map);
        m.bindTooltip(`<b>${wp.name}</b><br>${wp.score} XP`, { direction: 'top', offset: L.point(0, -14) });
        wpMarkersRef.current.push(m);
      });
    }
    if (finish) {
      const m = L.marker([finish.lat, finish.lng], { icon: finishIcon }).addTo(map);
      m.bindTooltip(`🏁 <b>${finish.name}</b>`, { direction: 'top', offset: L.point(0, -16) });
      wpMarkersRef.current.push(m);
    }
  }, [waypoints, finish]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
  );
}
