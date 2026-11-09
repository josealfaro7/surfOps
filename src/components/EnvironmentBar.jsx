import React, { useState, useEffect } from 'react';
import { Waves, Wind, Sun, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';
import { useSurfSchool } from '../context/SurfSchoolContext';

const LAT = -29.9533;
const LNG = -71.3394;

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

    const loadTides = async () => {
      try {
        const cached = localStorage.getItem(tidesCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // continuar con fetch
      }

      const stormglassApiKey = import.meta.env.VITE_STORMGLASS_API_KEY;
      if (stormglassApiKey) {
        try {
          const startIso = `${today}T00:00:00Z`;
          const endIso = `${today}T23:59:59Z`;
          const sgUrl = `https://api.stormglass.io/v2/tide/extremes/point?lat=${LAT}&lng=${LNG}&start=${startIso}&end=${endIso}&datum=mllw`;

          const res = await fetch(sgUrl, {
            headers: {
              Authorization: stormglassApiKey,
            },
          });

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.data) && data.data.length > 0) {
              const formatted = data.data.map((item) => formatTideItem(item, false));
              try {
                localStorage.setItem(tidesCacheKey, JSON.stringify(formatted));
              } catch {
                // ignorar
              }
              return formatted;
            }
          }
        } catch {
          // continuar con scraping o fallback
        }
      }

      try {
        const directShoaUrl = 'https://www.shoa.cl/php/mareas.php';
        const shoaRes = await fetch(directShoaUrl);
        if (shoaRes.ok) {
          const html = await shoaRes.text();
          const regex = /(\d{1,2}:\d{2})\s*hrs?[^\d]*([0-9.,]+)\s*m/gi;
          const matches = [...html.matchAll(regex)];
          if (matches.length >= 2) {
            const parsedShoa = matches.slice(0, 4).map((m, idx) => ({
              type: idx % 2 === 0 ? 'low' : 'high',
              time: m[1],
              height: Number(m[2].replace(',', '.')).toFixed(2),
              datum: 'NRS',
            }));
            try {
              localStorage.setItem(tidesCacheKey, JSON.stringify(parsedShoa));
            } catch {
              // ignorar
            }
            return parsedShoa;
          }
        }
      } catch {
        // continuar a fallback
      }

      return FALLBACK_TIDES;
    };

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
        // continuar
      }

      try {
        const sunriseUrl = `https://api.sunrise-sunset.org/json?lat=${LAT}&lng=${LNG}&formatted=0&date=today`;
        const res = await fetch(sunriseUrl);
        if (res.ok) {
          const data = await res.json();
          if (data?.results?.sunrise && data?.results?.sunset) {
            const sunObj = {
              sunrise: isoToLocalHHMM(data.results.sunrise),
              sunset: isoToLocalHHMM(data.results.sunset),
            };
            try {
              localStorage.setItem(sunCacheKey, JSON.stringify(sunObj));
            } catch {
              // ignorar
            }
            return sunObj;
          }
        }
      } catch {
        // fallback
      }
      return FALLBACK_SUN;
    };

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
    <div className="w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        {loading ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 animate-pulse">
            Sincronizando telemetría marítima y solar (SHOA / NOAA)...
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Mareas */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sky-700">
                <Waves className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Mareas</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums font-medium text-slate-800">
                {tides.map((t, idx) => (
                  <span
                    key={`${t.type}-${t.time}-${idx}`}
                    className="inline-flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded-sm border border-slate-200 text-xs"
                  >
                    {t.type === 'high' ? (
                      <ArrowUpRight className="w-3 h-3 text-sky-600" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-slate-500" />
                    )}
                    <span className="font-semibold text-slate-900">{t.time}</span>
                    <span className="text-slate-500 font-light">({t.height}m)</span>
                  </span>
                ))}
              </div>
            </div>

            <span className="text-slate-200 hidden sm:inline" aria-hidden="true">|</span>

            {/* Oleaje */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sky-700">
                <Compass className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Oleaje</span>
              </div>
              <div className="tabular-nums font-medium text-slate-800 text-xs bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-200">
                <span className="font-semibold text-slate-900">{swell.waveHeight}m</span>
                <span className="text-slate-500 font-light ml-1">· {swell.wavePeriod}s</span>
              </div>
            </div>

            <span className="text-slate-200 hidden sm:inline" aria-hidden="true">|</span>

            {/* Viento */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sky-700">
                <Wind className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Viento</span>
              </div>
              <div className="tabular-nums font-medium text-slate-800 text-xs bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-200">
                <span className="font-semibold text-slate-900">{swell.windSpeedKts} kts</span>
                <span className="text-slate-500 font-light ml-1">· {swell.windDirectionLabel}</span>
              </div>
            </div>

            <span className="text-slate-200 hidden sm:inline" aria-hidden="true">|</span>

            {/* Ventana Solar */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sky-700">
                <Sun className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Luz Operativa</span>
              </div>
              <div className="tabular-nums font-medium text-slate-800 text-xs bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-200">
                <span className="font-semibold text-slate-900">{sun.sunrise}</span>
                <span className="text-slate-400 mx-1">→</span>
                <span className="font-semibold text-slate-900">{sun.sunset}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
