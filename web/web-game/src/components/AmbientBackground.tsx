import { useEffect, useRef, useState } from 'react';
import { fetchWeather, getWeatherTheme, WeatherData } from '../lib/weather';

interface Particle { x: number; y: number; vx: number; vy: number; size: number; alpha: number; speed: number }
interface RainDrop { x: number; y: number; len: number; speed: number; alpha: number }
interface SnowFlake { x: number; y: number; size: number; speed: number; drift: number; alpha: number; wobble: number }

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const tryFetch = (lat: number, lng: number) => {
      fetchWeather(lat, lng).then(setWeather);
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => tryFetch(p.coords.latitude, p.coords.longitude),
        () => tryFetch(55.75, 37.62), // default Moscow
        { timeout: 5000 }
      );
    } else {
      tryFetch(55.75, 37.62);
    }
  }, []);

  useEffect(() => {
    if (!weather) return;
    const theme = getWeatherTheme(weather);
    document.documentElement.style.setProperty('--weather-sky-top', theme.skyTop);
    document.documentElement.style.setProperty('--weather-sky-bottom', theme.skyBottom);
    document.documentElement.style.setProperty('--weather-accent', theme.accentColor);
  }, [weather]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const theme = weather ? getWeatherTheme(weather) : getWeatherTheme({
      temp: 0, weatherCode: 0, isDay: true,
      description: 'clear', icon: 'sun', time: 'afternoon',
    });

    // Particles (floaty bits)
    const particles: Particle[] = Array.from({ length: theme.particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2 - 0.05,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.3 + 0.1,
      speed: Math.random() * 0.3 + 0.1,
    }));

    // Rain
    const rainDrops: RainDrop[] = Array.from({ length: Math.round(theme.rainIntensity * 120) }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * -1,
      len: Math.random() * 8 + 4,
      speed: Math.random() * 4 + 6,
      alpha: Math.random() * 0.15 + 0.05,
    }));

    // Snow
    const snowFlakes: SnowFlake[] = Array.from({ length: Math.round(theme.snowIntensity * 80) }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * -1,
      size: Math.random() * 3 + 1.5,
      speed: Math.random() * 0.5 + 0.3,
      drift: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.2,
      wobble: Math.random() * Math.PI * 2,
    }));

    // Sun/moon glow
    const sunX = weather?.time === 'morning' ? canvas.width * 0.2 : weather?.time === 'evening' ? canvas.width * 0.8 : canvas.width * 0.7;
    const sunY = weather?.time === 'morning' ? canvas.height * 0.7 : weather?.time === 'evening' ? canvas.height * 0.65 : canvas.height * 0.15;

    let raf: number;
    function animate() {
      if (!ctx || !canvas) return;
      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, theme.skyTop);
      grad.addColorStop(0.6, theme.skyBottom);
      grad.addColorStop(1, weather?.isDay ? theme.skyTop : '#020612');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fog layer
      if (theme.fogIntensity > 0) {
        ctx.fillStyle = `rgba(180,180,190,${theme.fogIntensity * 0.3})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Sun / moon
      const sunAlpha = theme.sunIntensity;
      if (sunAlpha > 0.05) {
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 200);
        if (weather?.isDay) {
          sunGrad.addColorStop(0, `rgba(255,220,100,${sunAlpha * 0.4})`);
          sunGrad.addColorStop(0.5, `rgba(255,180,50,${sunAlpha * 0.1})`);
          sunGrad.addColorStop(1, `rgba(255,180,50,0)`);
        } else {
          sunGrad.addColorStop(0, `rgba(200,200,255,${sunAlpha * 0.3})`);
          sunGrad.addColorStop(0.5, `rgba(200,200,255,${sunAlpha * 0.05})`);
          sunGrad.addColorStop(1, `rgba(200,200,255,0)`);
        }
        ctx.fillStyle = sunGrad;
        ctx.fillRect(sunX - 200, sunY - 200, 400, 400);

        if (weather?.isDay) {
          ctx.beginPath();
          ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,220,100,${sunAlpha * 0.6})`;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(sunX, sunY, 12, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(220,220,255,${sunAlpha * 0.3})`;
          ctx.fill();
        }
      }

      // Particles
      particles.forEach(p => {
        p.x += p.vx * p.speed;
        p.y += p.vy * p.speed;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${theme.particleColor}, ${p.alpha})`;
        ctx.fill();
      });

      // Rain
      rainDrops.forEach(r => {
        r.y += r.speed;
        r.x -= 0.5; // wind
        if (r.y > canvas.height + 10) { r.y = -10; r.x = Math.random() * canvas.width; }

        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 1, r.y + r.len);
        ctx.strokeStyle = `rgba(180,200,255,${r.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Snow
      snowFlakes.forEach(s => {
        s.y += s.speed;
        s.x += Math.sin(s.wobble) * 0.3 + s.drift;
        s.wobble += 0.02;
        if (s.y > canvas.height + 10) { s.y = -10; s.x = Math.random() * canvas.width; }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.fill();
      });

      // Lightning flash (thunderstorm)
      if (weather?.weatherCode && weather.weatherCode >= 95 && Math.random() < 0.003) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      raf = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(raf);
  }, [weather]);

  if (!weather) {
    // Show loading gradient while weather loads
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: -1,
        background: 'linear-gradient(180deg, #0a1628 0%, #0d2137 60%, #050a18 100%)',
        pointerEvents: 'none',
      }} />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: -1,
        pointerEvents: 'none',
        transition: 'opacity 0.5s',
      }}
    />
  );
}
