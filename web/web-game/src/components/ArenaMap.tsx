import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  zones: any[];
  onZoneClick?: (zone: any, latlng: { lat: number; lng: number }) => void;
  userCoords?: { lat: number; lng: number };
  myFactionId?: string | null;
  scannedTraps?: Array<{ zoneId?: string; lat: number; lng: number }>;
}

// Диагональная штриховка для СВОИХ зон: SVG-паттерн инжектится в рендерер
// Leaflet, а полигоны своей банды получают класс gr-own-hatch (CSS fill).
function ensureHatchPattern(map: L.Map, color: string) {
  const svg = map.getPanes().overlayPane.querySelector('svg');
  if (!svg) return;
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.prepend(defs);
  }
  let pattern = svg.querySelector('#gr-hatch') as SVGPatternElement | null;
  if (!pattern) {
    pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern') as SVGPatternElement;
    pattern.setAttribute('id', 'gr-hatch');
    pattern.setAttribute('width', '8');
    pattern.setAttribute('height', '8');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('patternTransform', 'rotate(45)');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0'); line.setAttribute('y1', '0');
    line.setAttribute('x2', '0'); line.setAttribute('y2', '8');
    line.setAttribute('stroke-width', '3');
    pattern.appendChild(line);
    defs.appendChild(pattern);
  }
  const line = pattern.querySelector('line');
  if (line) line.setAttribute('stroke', color);
}

export default function ArenaMap({ zones, onZoneClick, userCoords, myFactionId, scannedTraps }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const trapsRef = useRef<L.LayerGroup | null>(null);
  const gpsMarkerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map('arena-map', { zoomControl: false, attributionControl: false }).setView([55.75, 37.62], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '' }).addTo(map);
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (layerRef.current) { mapRef.current.removeLayer(layerRef.current); layerRef.current = null; }
    if (markersRef.current) { mapRef.current.removeLayer(markersRef.current); markersRef.current = null; }
    if (!zones?.length) return;

    layerRef.current = L.geoJSON({ type: 'FeatureCollection', features: zones } as any, {
      style: (f: any) => {
        const color = f?.properties?.factionColor || '#555';
        const owned = !!f?.properties?.controllingFaction;
        const isMine = !!myFactionId && f?.properties?.controllingFaction === myFactionId;
        const isHq = f?.properties?.isBase;
        return {
          color: isHq ? '#ffd740' : color,
          weight: isHq ? 3 : (isMine ? 2 : owned ? 1.5 : 0.5),
          fillColor: isHq ? '#ffd740' : color,
          fillOpacity: isHq ? 0.2 : (isMine ? 1 : owned ? 0.35 : 0.08),
          dashArray: isHq ? '5,5' : undefined,
          className: isMine && !isHq ? 'gr-own-hatch' : undefined,
        };
      },
      onEachFeature: (f: any, layer: L.Layer) => {
        if (!onZoneClick) return;
        layer.on('click', (e: L.LeafletMouseEvent) => {
          onZoneClick(f, { lat: e.latlng.lat, lng: e.latlng.lng });
        });
      },
    }).addTo(mapRef.current);

    // Паттерн штриховки в цвет своей банды
    const myColor = zones.find((z: any) => z.properties?.controllingFaction === myFactionId)?.properties?.factionColor || '#00e676';
    ensureHatchPattern(mapRef.current, myColor);

    markersRef.current = L.layerGroup().addTo(mapRef.current);
    zones.forEach((z: any) => {
      const props = z.properties || {};
      if (!z.geometry?.coordinates?.[0]?.length) return;
      const coords = z.geometry.coordinates[0];
      const center = coords.reduce((a: number[], c: number[]) => [a[0] + c[0], a[1] + c[1]], [0, 0]);
      center[0] /= coords.length;
      center[1] /= coords.length;

      if (props.isBase) {
        L.marker([center[1], center[0]], {
          icon: L.divIcon({
            className: '',
            html: '<i class="fa-solid fa-shield-halved" style="font-size:20px;color:#ffd740;text-shadow:0 0 12px rgba(255,215,64,0.9)"></i>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).addTo(markersRef.current!);
      }
      if (props.hasTrap) {
        L.marker([center[1], center[0]], {
          icon: L.divIcon({
            className: '',
            html: '<i class="fa-solid fa-bomb" style="font-size:14px;color:#ff7043;text-shadow:0 0 10px rgba(255,112,67,0.9)"></i>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        }).addTo(markersRef.current!);
      }
    });
  }, [zones, onZoneClick, myFactionId]);

  // Неоновые маркеры мин, найденных Сканером
  useEffect(() => {
    if (!mapRef.current) return;
    if (trapsRef.current) { mapRef.current.removeLayer(trapsRef.current); trapsRef.current = null; }
    if (!scannedTraps?.length) return;
    trapsRef.current = L.layerGroup().addTo(mapRef.current);
    scannedTraps.forEach(t => {
      L.marker([t.lat, t.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="position:relative;width:26px;height:26px">
                   <div style="position:absolute;inset:0;border-radius:50%;background:rgba(255,0,85,0.25);animation:gr-mine-pulse 1.2s infinite"></div>
                   <div style="position:absolute;inset:6px;border-radius:50%;background:#ff0055;border:2px solid #fff;box-shadow:0 0 16px rgba(255,0,85,0.95)"></div>
                 </div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      }).addTo(trapsRef.current!);
    });
  }, [scannedTraps]);

  useEffect(() => {
    if (!mapRef.current || !userCoords) return;
    if (gpsMarkerRef.current) {
      gpsMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
      return;
    }
    const marker = L.circleMarker([userCoords.lat, userCoords.lng], {
      radius: 8, color: '#00ffcc', weight: 2, fillColor: '#00ffcc', fillOpacity: 0.4,
    }).addTo(mapRef.current);
    const pulse = L.circleMarker([userCoords.lat, userCoords.lng], {
      radius: 16, color: '#00ffcc44', weight: 1, fillColor: '#00ffcc', fillOpacity: 0.15,
    }).addTo(mapRef.current);
    let growing = true;
    const interval = setInterval(() => {
      const r = pulse.getRadius();
      if (growing && r >= 24) growing = false;
      if (!growing && r <= 12) growing = true;
      pulse.setRadius(growing ? r + 1 : r - 1);
    }, 80);
    gpsMarkerRef.current = marker;
    (marker as any)._pulseInterval = interval;
    (marker as any)._pulseMarker = pulse;
    mapRef.current.setView([userCoords.lat, userCoords.lng]);
    return () => {
      clearInterval(interval);
      if (gpsMarkerRef.current) { mapRef.current?.removeLayer(gpsMarkerRef.current); gpsMarkerRef.current = null; }
      if (pulse) mapRef.current?.removeLayer(pulse);
    };
  }, [userCoords]);

  return (
    <>
      <div id="arena-map" style={{ width: '100%', height: '100%' }} />
      <style jsx global>{`
        #arena-map .leaflet-interactive { transition: fill-opacity 0.5s ease, stroke-opacity 0.5s ease; }
        #arena-map .gr-own-hatch { fill: url(#gr-hatch); fill-opacity: 0.55; }
        @keyframes gr-mine-pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }
      `}</style>
    </>
  );
}
