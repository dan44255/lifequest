import React, { useEffect, useState } from 'react';

type Weather = {
  temp: number | null;
  wind: number | null;
  desc: string;
  icon: string; // simple text icon
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<Weather>({ temp: null, wind: null, desc: 'Loading…', icon: '⏳' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather(lat: number, lon: number) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
        const data = await res.json();
        const c = data.current;
        const { temperature_2m, wind_speed_10m, weather_code } = c;

        const [desc, icon] = codeToDesc(weather_code);
        if (!cancelled) {
          setWeather({ temp: temperature_2m, wind: wind_speed_10m, desc, icon });
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load weather');
      }
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => {
        // Fallback: Toronto
        fetchWeather(43.65107, -79.347015);
      },
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 8000 }
    );

    return () => { cancelled = true; };
  }, []);

  if (error) return <div className="rounded-xl p-3 bg-red-50 text-red-700">⚠️ {error}</div>;

  return (
    <div className="rounded-2xl p-4 bg-white/60 backdrop-blur shadow">
      <div className="text-sm opacity-70">Current Weather</div>
      <div className="flex items-center gap-3 mt-1">
        <span style={{ fontSize: 28 }}>{weather.icon}</span>
        <div>
          <div className="text-xl font-semibold">
            {weather.temp !== null ? `${Math.round(weather.temp)}°C` : '—'}
          </div>
          <div className="text-sm opacity-80">{weather.desc}</div>
          <div className="text-xs opacity-60">Wind {weather.wind ?? '—'} km/h</div>
        </div>
      </div>
    </div>
  );
}

// Minimal WMO code map
function codeToDesc(code: number): [string, string] {
  const map: Record<number, [string, string]> = {
    0: ['Clear sky', '☀️'],
    1: ['Mainly clear', '🌤️'],
    2: ['Partly cloudy', '⛅'],
    3: ['Overcast', '☁️'],
    45: ['Fog', '🌫️'],
    48: ['Depositing rime fog', '🌫️'],
    51: ['Light drizzle', '🌦️'],
    53: ['Drizzle', '🌦️'],
    55: ['Heavy drizzle', '🌧️'],
    61: ['Light rain', '🌦️'],
    63: ['Rain', '🌧️'],
    65: ['Heavy rain', '🌧️'],
    71: ['Light snow', '🌨️'],
    73: ['Snow', '🌨️'],
    75: ['Heavy snow', '❄️'],
    95: ['Thunderstorm', '⛈️'],
  };
  return map[code] ?? ['Weather unknown', '❔'];
}
