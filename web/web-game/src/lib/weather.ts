export interface WeatherData {
  temp: number;
  weatherCode: number;
  isDay: boolean;
  description: string;
  icon: string;
  time: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

// WMO Weather codes → human readable
const WMO: Record<number, { desc: string; icon: string }> = {
  0:  { desc: 'clear', icon: 'sun' },
  1:  { desc: 'mostly_clear', icon: 'sun' },
  2:  { desc: 'partly_cloudy', icon: 'cloud_sun' },
  3:  { desc: 'overcast', icon: 'cloud' },
  45: { desc: 'foggy', icon: 'fog' },
  48: { desc: 'foggy', icon: 'fog' },
  51: { desc: 'drizzle', icon: 'drizzle' },
  53: { desc: 'drizzle', icon: 'drizzle' },
  55: { desc: 'drizzle', icon: 'drizzle' },
  61: { desc: 'rain', icon: 'rain' },
  63: { desc: 'rain', icon: 'rain' },
  65: { desc: 'heavy_rain', icon: 'rain' },
  71: { desc: 'snow', icon: 'snow' },
  73: { desc: 'snow', icon: 'snow' },
  75: { desc: 'heavy_snow', icon: 'snow' },
  77: { desc: 'snow_grains', icon: 'snow' },
  80: { desc: 'rain_showers', icon: 'rain' },
  81: { desc: 'rain_showers', icon: 'rain' },
  82: { desc: 'heavy_rain_showers', icon: 'rain' },
  85: { desc: 'snow_showers', icon: 'snow' },
  86: { desc: 'snow_showers', icon: 'snow' },
  95: { desc: 'thunderstorm', icon: 'thunderstorm' },
  96: { desc: 'thunderstorm', icon: 'thunderstorm' },
  99: { desc: 'thunderstorm', icon: 'thunderstorm' },
};

const CACHE_KEY = 'gridrunner_weather_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 min

function getCached(): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts < CACHE_TTL) return cached.data;
  } catch {}
  return null;
}

function setCached(data: WeatherData) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  // Check cache first (even before request — instant display)
  const cached = getCached();
  if (cached) return cached;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const res = await fetch(url);
    const json = await res.json();
    const current = json.current;

    const wCode = current.weather_code ?? 0;
    const wmo = WMO[wCode] || WMO[0];
    const hour = new Date().getHours();

    // Determine actual day/night — prefer API data but fall back to local time
    const isDay = current.is_day === 1;
    const data: WeatherData = {
      temp: Math.round(current.temperature_2m),
      weatherCode: wCode,
      isDay,
      description: wmo.desc,
      icon: wmo.icon,
      time: isDay ? (hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening') : 'night',
    };

    setCached(data);
    return data;
  } catch {
    // Fallback: time-based guess
    const hour = new Date().getHours();
    const isDay = hour > 6 && hour < 20;
    return {
      temp: 0, weatherCode: 0, isDay,
      description: 'clear', icon: 'sun',
      time: isDay ? (hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening') : 'night',
    };
  }
}

/* ── Season ── */

export function getSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/* ── HUD Theme ── */

export interface HUDTheme {
  name: string;
  vibes: string;
  hudBg: string;
  hudText: string;
  hudAccent: string;
  hudSecondary: string;
  lineColor: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  lineWidth: number;
  speedColor: string;
  compassColor: string;
  blurIntensity: number;
}

export interface WeatherTheme {
  skyTop: string;
  skyBottom: string;
  particleColor: string;
  particleCount: number;
  rainIntensity: number;
  snowIntensity: number;
  fogIntensity: number;
  sunIntensity: number;
  ambientLight: string;
  accentColor: string;
  hudTheme: HUDTheme;
  ambianceLabel: string;
}

export function getHUDTheme(w: WeatherData, season: string): HUDTheme {
  const { description, isDay, time } = w;
  const isNight = !isDay;
  const isMorning = time === 'morning';
  const isEvening = time === 'evening';

  // Summer / Sunny / Day
  if (season === 'summer' && description === 'clear' && isDay && !isEvening) {
    return {
      name: 'Hot Asphalt',
      vibes: 'Раскалённый асфальт',
      hudBg: 'rgba(20,20,18,0.85)',
      hudText: '#f0e8d0',
      hudAccent: '#ff7700',
      hudSecondary: '#f0a030',
      lineColor: '#ff7700',
      lineStyle: 'solid',
      lineWidth: 5,
      speedColor: '#ff8800',
      compassColor: '#ff6600',
      blurIntensity: 2,
    };
  }

  // Autumn / Rain / Evening
  if ((season === 'autumn' || description.includes('rain') || description.includes('drizzle')) && isEvening) {
    return {
      name: 'Cyber-Grunge',
      vibes: 'Мокрый асфальт',
      hudBg: 'rgba(25,20,15,0.9)',
      hudText: '#c8b098',
      hudAccent: '#d4782a',
      hudSecondary: '#8a3a2a',
      lineColor: '#d4782a',
      lineStyle: 'dashed',
      lineWidth: 4,
      speedColor: '#c06020',
      compassColor: '#d4782a',
      blurIntensity: 4,
    };
  }

  // Winter / Snow / Night
  if ((season === 'winter' || description.includes('snow')) && isNight) {
    return {
      name: 'Stealth Frost',
      vibes: 'Морозная ночь',
      hudBg: 'rgba(10,12,20,0.92)',
      hudText: '#c0d8e8',
      hudAccent: '#58b4d0',
      hudSecondary: '#3a6a8a',
      lineColor: '#e0f7fa',
      lineStyle: 'dotted',
      lineWidth: 3,
      speedColor: '#70c8e0',
      compassColor: '#58b4d0',
      blurIntensity: 1,
    };
  }

  // Spring / Fog / Morning
  if (season === 'spring' || description.includes('fog') || isMorning) {
    return {
      name: 'Ghost Highway',
      vibes: 'Туманное утро',
      hudBg: 'rgba(30,35,32,0.88)',
      hudText: '#b8c8b8',
      hudAccent: '#6aaa50',
      hudSecondary: '#4a7a3a',
      lineColor: '#6aaa50',
      lineStyle: 'dashed',
      lineWidth: 3,
      speedColor: '#5a9a40',
      compassColor: '#6aaa50',
      blurIntensity: 5,
    };
  }

  // Default / Clear winter day
  if (season === 'winter' && isDay) {
    return {
      name: 'White Silence',
      vibes: 'Снежная тишина',
      hudBg: 'rgba(40,45,50,0.8)',
      hudText: '#e8eef0',
      hudAccent: '#8ac0d0',
      hudSecondary: '#6a9ab0',
      lineColor: '#b0d8e8',
      lineStyle: 'solid',
      lineWidth: 4,
      speedColor: '#8ac0d0',
      compassColor: '#6ab0c8',
      blurIntensity: 1,
    };
  }

  // Default sunny day
  return {
    name: 'Clear Day',
    vibes: 'Солнечный день',
    hudBg: 'rgba(15,20,25,0.8)',
    hudText: '#d0e0e8',
    hudAccent: '#00c8a0',
    hudSecondary: '#3a8a7a',
    lineColor: '#00c8a0',
    lineStyle: 'solid',
    lineWidth: 4,
    speedColor: '#00c8a0',
    compassColor: '#00a880',
    blurIntensity: 1,
  };
}

export function getWeatherTheme(w: WeatherData): WeatherTheme {
  const { description, isDay, time } = w;
  const season = getSeason();
  const hud = getHUDTheme(w, season);

  const isNight = !isDay;
  const isMorning = time === 'morning';
  const isEvening = time === 'evening';

  let skyTop = '#0a1628';
  let skyBottom = '#0d2137';
  let particleColor = '255,255,255';
  let particleCount = 30;
  let rainIntensity = 0;
  let snowIntensity = 0;
  let fogIntensity = 0;
  let sunIntensity = 1;
  let accentColor = '#00e676';
  let ambianceLabel = '🌙 Ночь';

  if (isNight) {
    skyTop = '#050a18';
    skyBottom = '#0d1528';
    particleColor = '180,200,255';
    particleCount = 50;
    sunIntensity = 0.1;
    accentColor = '#7c3aed';
    ambianceLabel = '🌙 Ночь';
  } else if (isMorning) {
    skyTop = '#ff6b35';
    skyBottom = '#ffb347';
    particleColor = '255,200,150';
    particleCount = 20;
    accentColor = '#ff9100';
    ambianceLabel = '🌅 Рассвет';
  } else if (isEvening) {
    skyTop = '#c0392b';
    skyBottom = '#e67e22';
    particleColor = '255,180,100';
    particleCount = 25;
    accentColor = '#ff6d00';
    ambianceLabel = '🌆 Закат';
  } else {
    skyTop = '#1a8fe5';
    skyBottom = '#56b4f0';
    particleColor = '200,220,255';
    particleCount = 15;
    accentColor = '#00e676';
    ambianceLabel = '☀️ День';
  }

  if (description.includes('cloud') || description.includes('overcast')) {
    skyTop = '#7a8a9a'; skyBottom = '#9aabba';
    sunIntensity = 0.4; accentColor = '#6b8e9e';
    particleCount = 10;
    ambianceLabel = '☁️ Облачно';
  }

  if (description.includes('fog')) {
    skyTop = '#8a8a8a'; skyBottom = '#b0b0b0';
    fogIntensity = 0.7; sunIntensity = 0.15;
    accentColor = '#8a8a8a'; particleCount = 5;
    ambianceLabel = '🌫 Туман';
  }

  if (description.includes('drizzle') || description.includes('rain') || description.includes('showers')) {
    if (isDay) { skyTop = '#4a5a6a'; skyBottom = '#6a7a8a'; }
    rainIntensity = description.includes('heavy') ? 1 : description.includes('drizzle') ? 0.3 : 0.6;
    sunIntensity = 0.1; accentColor = '#4a7a9a';
    ambianceLabel = description.includes('heavy') ? '🌧 Ливень' : '🌦 Дождь';
  }

  if (description.includes('snow')) {
    skyTop = '#c8d0d8'; skyBottom = '#e0e6ec';
    sunIntensity = description.includes('heavy') ? 0.2 : 0.5;
    snowIntensity = description.includes('heavy') ? 1 : description.includes('showers') ? 0.5 : 0.7;
    accentColor = '#8ab4d0';
    ambianceLabel = '❄️ Снег';
  }

  if (description.includes('thunderstorm')) {
    skyTop = '#1a1a2e'; skyBottom = '#2a1a2e';
    sunIntensity = 0.05; rainIntensity = 0.9;
    accentColor = '#7c3aed';
    ambianceLabel = '⛈ Гроза';
  }

  const ambientLight = isNight ? '#0a0a2a' : isMorning ? '#ffd080' : isEvening ? '#e06040' : '#c0e0ff';

  return {
    skyTop, skyBottom, particleColor, particleCount,
    rainIntensity, snowIntensity, fogIntensity, sunIntensity,
    ambientLight, accentColor, hudTheme: hud, ambianceLabel,
  };
}
