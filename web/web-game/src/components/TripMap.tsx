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

interface Checkpoint {
  order: number; name: string; vibe: string; lat: number; lng: number;
  kind?: string;
}

// Tactical radar map: top-down locked, neon data-line route,
// checkpoints as 30 m capture circles instead of nav pins.
export default function TripMap({ path, waypoints, finish, currentPos, plannedPath, checkpoints, visited }: {
  path: [number, number][];
  waypoints?: Waypoint[];
  finish?: Waypoint;
  currentPos?: [number, number] | null;
  plannedPath?: [number, number][];
  checkpoints?: Checkpoint[];
  visited?: Set<number>;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const plannedRef = useRef<L.Polyline | null>(null);
  const plannedGlowRef = useRef<L.Polyline | null>(null);
  const cpLayersRef = useRef<L.Layer[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const posIcon = L.divIcon({
    className: '',
    html: '<div class="gr-player-dot"><div class="gr-player-core"></div></div>',
    iconSize: [18, 18], iconAnchor: [9, 9],
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

    // Top-down lock: no tilt, no rotation — tactical recon view only
    const map = L.map(containerRef.current, {
      zoomControl: false, attributionControl: false,
      layers: [defaultLayer]
    }).setView([55.75, 37.62], 15);

    L.control.layers({
      "СХЕМА": darkSchema,
      "СПУТНИК": satellite
    }, undefined, { position: 'topright' }).addTo(map);

    const marker = L.marker([55.75, 37.62], { icon: posIcon, zIndexOffset: 1000 }).addTo(map);
    // traveled path
    const polyline = L.polyline([], {
      color: '#00e5ff', weight: 4, opacity: 0.75,
    }).addTo(map);
    // planned route: glow underlay + animated data-line
    const plannedGlow = L.polyline([], {
      color: '#00e676', weight: 11, opacity: 0.15,
    }).addTo(map);
    const planned = L.polyline([], {
      color: '#00e676', weight: 3.5, opacity: 0.95,
      dashArray: '10 8', className: 'gr-route-anim',
    }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    polylineRef.current = polyline;
    plannedRef.current = planned;
    plannedGlowRef.current = plannedGlow;

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
    if (!plannedRef.current || !plannedPath || plannedPath.length < 2) return;
    const lls = plannedPath.map(p => L.latLng(p[0], p[1]));
    plannedRef.current.setLatLngs(lls);
    plannedGlowRef.current?.setLatLngs(lls);
    // First fit: show the whole route once
    if (mapRef.current && path.length <= 1) {
      mapRef.current.fitBounds(L.latLngBounds(lls), { padding: [40, 40] });
    }
  }, [plannedPath]);

  useEffect(() => {
    if (path.length === 0 || !mapRef.current || !markerRef.current) return;
    const last = path[path.length - 1];
    markerRef.current.setLatLng(last);
    mapRef.current.setView(last, mapRef.current.getZoom(), { animate: true });
  }, [path.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    cpLayersRef.current.forEach(m => m.remove());
    cpLayersRef.current = [];

    const addCheckpoint = (lat: number, lng: number, idx: number, name: string, sub: string, kind: string, done: boolean) => {
      const color = done ? '#00e676' : kind === 'food' ? '#ffd54f' : kind === 'finish' ? '#00e5ff' : '#76ff8f';
      // 30 m data-capture zone
      const zone = L.circle([lat, lng], {
        radius: 30, color, weight: 2,
        opacity: done ? 0.9 : 0.65,
        fillColor: color, fillOpacity: done ? 0.25 : 0.08,
        className: done ? '' : 'gr-cp-pulse',
      }).addTo(map);
      const iconHtml = done
        ? `<div class="gr-cp-marker gr-cp-done"><i class="fa-solid fa-check"></i></div>`
        : kind === 'food'
          ? `<div class="gr-cp-marker gr-cp-food"><i class="fa-solid fa-utensils"></i></div>`
          : kind === 'finish'
            ? `<div class="gr-cp-marker gr-cp-finish"><i class="fa-solid fa-flag-checkered"></i></div>`
            : `<div class="gr-cp-marker">${idx}</div>`;
      const m = L.marker([lat, lng], {
        icon: L.divIcon({ className: '', html: iconHtml, iconSize: [26, 26], iconAnchor: [13, 13] }),
      }).addTo(map);
      m.bindTooltip(`<b>${name}</b><br><span style="opacity:0.7">${sub}</span>`, { direction: 'top', offset: L.point(0, -16) });
      cpLayersRef.current.push(zone, m);
    };

    if (checkpoints && checkpoints.length > 0) {
      checkpoints.forEach((cp, i) => {
        addCheckpoint(cp.lat, cp.lng, i + 1, cp.name, cp.vibe, cp.kind || 'poi', visited?.has(cp.order) || false);
      });
    } else if (waypoints) {
      waypoints.forEach((wp, i) => {
        addCheckpoint(wp.lat, wp.lng, i + 1, wp.name, `${wp.score} XP`, 'poi', false);
      });
    }
    if (finish) {
      addCheckpoint(finish.lat, finish.lng, 0, finish.name, 'FINISH', 'finish', false);
    }
  }, [waypoints, finish, checkpoints, visited]);

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <style jsx global>{`
        @keyframes gr-dash-march { to { stroke-dashoffset: -36; } }
        .gr-route-anim { animation: gr-dash-march 1.4s linear infinite; filter: drop-shadow(0 0 4px rgba(0,230,118,0.8)); }
        @keyframes gr-cp-blink { 0%,100% { fill-opacity: 0.08; } 50% { fill-opacity: 0.22; } }
        .gr-cp-pulse { animation: gr-cp-blink 2.4s ease-in-out infinite; }
        .gr-player-dot { width: 18px; height: 18px; border-radius: 50%; position: relative; }
        .gr-player-dot::after { content: ''; position: absolute; inset: -7px; border-radius: 50%; border: 2px solid rgba(0,230,118,0.55); animation: gr-ping 1.8s ease-out infinite; }
        .gr-player-core { position: absolute; inset: 2px; border-radius: 50%; background: #00e676; border: 2px solid #fff; box-shadow: 0 0 14px rgba(0,230,118,0.9); }
        @keyframes gr-ping { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(1.9); opacity: 0; } }
        .gr-cp-marker { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; font-family: monospace; color: #04120a; background: #76ff8f; border: 2px solid rgba(255,255,255,0.85); box-shadow: 0 0 10px rgba(0,230,118,0.6), 0 2px 8px rgba(0,0,0,0.5); }
        .gr-cp-done { background: #00e676; }
        .gr-cp-food { background: #ffd54f; box-shadow: 0 0 10px rgba(255,213,79,0.6), 0 2px 8px rgba(0,0,0,0.5); }
        .gr-cp-finish { background: #00e5ff; box-shadow: 0 0 10px rgba(0,229,255,0.6), 0 2px 8px rgba(0,0,0,0.5); }
      `}</style>
    </>
  );
}
