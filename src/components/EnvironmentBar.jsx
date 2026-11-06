import React, { useState, useEffect } from 'react';
import { useSurfSchool } from '../context/SurfSchoolContext';

const LAT = -29.9533;
const LNG = -71.3394;

// Offset de calibración entre MLLW (modelo global TPXO de Stormglass) y el NRS
// (Nivel de Reducción de Sondas del SHOA para Puerto de Coquimbo / La Serena)
const SHOA_NRS_OFFSET_FROM_MLLW = 0.28;

const FALLBACK_TIDES = [
  { type: 'low', time: '02:41', height: '0.30', datum: 'NRS' },
  { type: 'high', time: '08:44', height: '1.23', datum: 'NRS' },
  { type: 'low', time: '14:58', height: '0.21', datum: 'NRS' },
  { type: 'high', time: '21:17', height: '1.32', datum: 'NRS' },
];

const FALLBACK_SUN = {
  sunrise: '06:38',
  sunset: '20:12',
};

const FALLBACK_SWELL = {
  waveHeight: '1.2',
  wavePeriod: '12',
  windSpeedKts: '11',
  windDirectionLabel: 'Suroeste',
};

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoToLocalHHMM(isoStr) {
  if (!isoStr) return '';
  const dateObj = new Date(isoStr);
  if (Number.isNaN(dateObj.getTime())) return '';
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function degreesToCardinalSpanish(deg) {
  let num = Number(deg);
  if (!Number.isFinite(num)) return 'Sur';
  const directions = [
    'Norte',
    'Noreste',
    'Este',
    'Sureste',
    'Sur',
    'Suroeste',
    'Oeste',
    'Noroeste',
  ];
  num = ((num % 360) + 360) % 360;
  const index = Math.round(num / 45) % 8;
  return directions[index];
}

function formatTideItem(rawItem, isAlreadyNRS = false) {
  const timeStr = rawItem.time?.includes('T')
    ? isoToLocalHHMM(rawItem.time)
    : String(rawItem.time || '');

  const rawHeight = Number(rawItem.height);
  const calibratedHeight = Number.isFinite(rawHeight)
    ? isAlreadyNRS || rawItem.datum === 'NRS'
      ? rawHeight
      : rawHeight + SHOA_NRS_OFFSET_FROM_MLLW
    : 0;

  return {
    type: rawItem.type === 'high' ? 'high' : 'low',
    time: timeStr,
    height: calibratedHeight.toFixed(2),
    datum: 'NRS',
  };
}

export default function EnvironmentBar() {
  const { setSunsetTime } = useSurfSchool();

  const [tides, setTides] = useState([]);
  const [sun, setSun] = useState(FALLBACK_SUN);
  const [swell, setSwell] = useState(FALLBACK_SWELL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const today = getTodayDateKey();

    const tidesCacheKey = `tides_cache_${today}`;
    const sunCacheKey = `sun_cache_${today}`;
    const swellCacheKey = `swell_cache_${today}`;

    // 1. Mareas (Stormglass API con datum=MLLW calibrado a NRS del SHOA y caché en localStorage)
    const loadTides = async () => {
      try {
        const cached = localStorage.getItem(tidesCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Verifica que el caché ya esté en datum NRS del SHOA y tenga los hitos completos del día local
          const isValidNRSCache =
            Array.isArray(parsed) &&
            parsed.length >= 3 &&
            parsed.every((item) => item?.datum === 'NRS' && Number(item?.height) >= 0);

          if (isValidNRSCache) {
            return parsed.slice(0, 4).map((item) => formatTideItem(item, true));
          }
        }
      } catch {
        // continuar con fetch
      }

      const apiKey = import.meta.env.VITE_STORMGLASS_API_KEY;
      if (!apiKey) return FALLBACK_TIDES;

      try {
        // Construir inicio y fin del día local (Chile) convertidos a UTC para no cortar la pleamar nocturna (>21:00 hrs)
        const now = new Date();
        const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const localEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${LAT}&lng=${LNG}&datum=MLLW&start=${encodeURIComponent(
          localStart.toISOString()
        )}&end=${encodeURIComponent(localEnd.toISOString())}`;

        const res = await fetch(url, {
          headers: { Authorization: apiKey },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const rawList = Array.isArray(json?.data) ? json.data : [];
        if (rawList.length > 0) {
          const formatted = rawList.slice(0, 4).map((item) => formatTideItem(item, false));
          try {
            localStorage.setItem(tidesCacheKey, JSON.stringify(formatted));
          } catch {
            // ignorar
          }
          return formatted;
        }
      } catch {
        // Si se alcanza la cuota diaria gratuita de Stormglass, guardar y retornar los hitos NRS del día
        try {
          localStorage.setItem(tidesCacheKey, JSON.stringify(FALLBACK_TIDES));
        } catch {
          // ignorar
        }
      }
      return FALLBACK_TIDES;
    };

    // 2. Amanecer y Ocaso (Sunrise-Sunset API con caché estricta sun_cache_YYYY-MM-DD)
    const loadSun = async () => {
      try {
        const cached = localStorage.getItem(sunCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.sunrise && parsed?.sunset) {
            return parsed;
          }
        }
      } catch {
        // continuar con fetch
      }

      try {
        const url = `https://api.sunrise-sunset.org/json?lat=${LAT}&lng=${LNG}&formatted=0`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.status === 'OK' && json?.results) {
          const sunObj = {
            sunrise: isoToLocalHHMM(json.results.sunrise) || FALLBACK_SUN.sunrise,
            sunset: isoToLocalHHMM(json.results.sunset) || FALLBACK_SUN.sunset,
          };
          try {
            localStorage.setItem(sunCacheKey, JSON.stringify(sunObj));
          } catch {
            // ignorar
          }
          return sunObj;
        }
      } catch {
        // fallback
      }
      return FALLBACK_SUN;
    };

    // 3. Oleaje y Viento (Open-Meteo Marine & Forecast API con caché estricta swell_cache_YYYY-MM-DD)
    const loadSwellAndWind = async () => {
      try {
        const cached = localStorage.getItem(swellCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.waveHeight && parsed?.windSpeedKts) {
            return parsed;
          }
        }
      } catch {
        // continuar con fetch
      }

      try {
        const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LNG}&current=wave_height,wave_period,swell_wave_height,swell_wave_period&timezone=auto`;
        const windUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kn&timezone=auto`;

        const [marineRes, windRes] = await Promise.all([
          fetch(marineUrl),
          fetch(windUrl),
        ]);

        const marineJson = marineRes.ok ? await marineRes.json() : null;
        const windJson = windRes.ok ? await windRes.json() : null;

        const rawWaveHeight =
          marineJson?.current?.swell_wave_height ??
          marineJson?.current?.wave_height ??
          1.2;
        const rawWavePeriod =
          marineJson?.current?.swell_wave_period ??
          marineJson?.current?.wave_period ??
          12;
        const rawWindSpeed = windJson?.current?.wind_speed_10m ?? 11;
        const rawWindDir = windJson?.current?.wind_direction_10m ?? 215;

        const swellObj = {
          waveHeight: Number(rawWaveHeight).toFixed(1),
          wavePeriod: String(Math.round(Number(rawWavePeriod) || 12)),
          windSpeedKts: String(Math.round(Number(rawWindSpeed) || 11)),
          windDirectionLabel: degreesToCardinalSpanish(rawWindDir),
        };

        try {
          localStorage.setItem(swellCacheKey, JSON.stringify(swellObj));
        } catch {
          // ignorar
        }
        return swellObj;
      } catch {
        // fallback
      }
      return FALLBACK_SWELL;
    };

    Promise.all([loadTides(), loadSun(), loadSwellAndWind()]).then(
      ([tidesData, sunData, swellData]) => {
        if (!isMounted) return;
        setTides(tidesData);
        setSun(sunData);
        setSunsetTime(sunData.sunset);
        setSwell(swellData);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [setSunsetTime]);

  return (
    <div className="w-full bg-slate-50 border-y border-slate-200 rounded-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-sm font-medium tabular-nums text-slate-800">
        {loading ? (
          <span className="text-slate-500 animate-pulse">
            Cargando condiciones de mareas, oleaje, viento y luz del día...
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {/* Bloque 1: Mareas */}
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-bold text-slate-900">🌊 Mareas:</span>
              {tides.map((t, idx) => (
                <span key={`${t.type}-${t.time}-${idx}`} className="inline-flex items-center gap-1">
                  <span>{t.type === 'high' ? '🔵' : '📉'}</span>
                  <span className="text-slate-900 font-semibold">{t.time}</span>
                  <span className="text-slate-500">({t.height}m)</span>
                </span>
              ))}
            </div>

            <span className="text-slate-300 select-none" aria-hidden="true">
              |
            </span>

            {/* Bloque 2: Oleaje */}
            <div className="inline-flex items-center gap-1.5">
              <span className="font-bold text-slate-900">🏄‍♂️ Oleaje:</span>
              <span className="text-slate-900 font-semibold">{swell.waveHeight}m</span>
              <span className="text-slate-500">({swell.wavePeriod}s)</span>
            </div>

            <span className="text-slate-300 select-none" aria-hidden="true">
              |
            </span>

            {/* Bloque 3: Viento */}
            <div className="inline-flex items-center gap-1.5">
              <span className="font-bold text-slate-900">💨 Viento:</span>
              <span className="text-slate-900 font-semibold">
                {swell.windSpeedKts}kts {swell.windDirectionLabel}
              </span>
            </div>

            <span className="text-slate-300 select-none" aria-hidden="true">
              |
            </span>

            {/* Bloque 4: Luz (Amanecer y Ocaso) */}
            <div className="inline-flex items-center gap-1.5">
              <span className="font-bold text-slate-900">☀️ Luz:</span>
              <span className="text-slate-900 font-semibold">
                {sun.sunrise} - {sun.sunset} hrs
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
