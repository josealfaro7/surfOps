import React, { useState, useEffect } from 'react';
import { Waves, Wind, Sun, ArrowUpRight, ArrowDownRight, Compass, AlertTriangle } from 'lucide-react';
import { useSurfSchool } from '../context/SurfSchoolContext';
import { supabase } from '../lib/supabaseClient';
import { getNowHHMM } from '../utils/dates';

// Valores de respaldo: se muestran marcados como "referenciales", nunca como datos en vivo
const FALLBACK_SUN = { sunrise: '06:40', sunset: '20:10' };

const SWELL_CACHE_MINUTES = 60;

function degreesToCardinalSpanish(deg) {
  const num = Number(deg);
  if (!Number.isFinite(num)) return '—';
  const directions = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste'];
  return directions[Math.round((((num % 360) + 360) % 360) / 45) % 8];
}

function readCache(key, maxAgeMinutes = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (maxAgeMinutes && Date.now() - (parsed.savedAt || 0) > maxAgeMinutes * 60000) return null;
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // sin espacio: se vuelve a consultar la próxima vez
  }
}

export default function EnvironmentBar() {
  const { schoolBranding, todayIso, timezone, isLive, setSunsetInfo } = useSurfSchool();
  const lat = Number(schoolBranding?.latitude) || -29.978;
  const lng = Number(schoolBranding?.longitude) || -71.36;
  const place = `${lat.toFixed(3)}_${lng.toFixed(3)}`;

  const [tides, setTides] = useState({ items: [], status: 'loading' });
  const [sun, setSun] = useState({ ...FALLBACK_SUN, isFallback: true });
  const [swell, setSwell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  // Refrescar oleaje y viento cada hora
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), SWELL_CACHE_MINUTES * 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const toLocal = (iso) => (iso ? getNowHHMM(timezone, new Date(iso)) : '');

    // Mareas: vía Edge Function "tides" (la API key de Stormglass vive en el servidor)
    const loadTides = async () => {
      const key = `surfops_tides_${place}_${todayIso}`;
      const cached = readCache(key);
      if (Array.isArray(cached) && cached.length > 0) return { items: cached, status: 'ok' };
      if (!isLive || !supabase) return { items: [], status: 'unavailable' };
      try {
        const { data, error } = await supabase.functions.invoke('tides', {
          body: { lat, lng, date: todayIso, timezone },
        });
        if (error || !Array.isArray(data?.extremes) || data.extremes.length === 0) {
          return { items: [], status: 'unavailable' };
        }
        const items = data.extremes.map((t) => ({
          type: t.type === 'high' ? 'high' : 'low',
          time: toLocal(t.time),
          height: Number(t.height).toFixed(2),
        }));
        writeCache(key, items);
        return { items, status: 'ok' };
      } catch {
        return { items: [], status: 'unavailable' };
      }
    };

    const loadSun = async () => {
      const key = `surfops_sun_${place}_${todayIso}`;
      const cached = readCache(key);
      if (cached?.sunrise && cached?.sunset) return { ...cached, isFallback: false };
      try {
        const res = await fetch(
          `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0&date=${todayIso}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json?.results?.sunrise && json?.results?.sunset) {
            const value = { sunrise: toLocal(json.results.sunrise), sunset: toLocal(json.results.sunset) };
            writeCache(key, value);
            return { ...value, isFallback: false };
          }
        }
      } catch {
        // sin conexión
      }
      return { ...FALLBACK_SUN, isFallback: true };
    };

    const loadSwellAndWind = async () => {
      const key = `surfops_swell_${place}`;
      const cached = readCache(key, SWELL_CACHE_MINUTES);
      if (cached) return cached;
      try {
        const [marineRes, windRes] = await Promise.all([
          fetch(
            `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,wave_period,swell_wave_height,swell_wave_period&timezone=auto`
          ),
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kn&timezone=auto`
          ),
        ]);
        const marine = marineRes.ok ? await marineRes.json() : null;
        const wind = windRes.ok ? await windRes.json() : null;
        const waveHeight = marine?.current?.swell_wave_height ?? marine?.current?.wave_height;
        const wavePeriod = marine?.current?.swell_wave_period ?? marine?.current?.wave_period;
        const windSpeed = wind?.current?.wind_speed_10m;
        if (waveHeight == null && windSpeed == null) return null;
        const value = {
          waveHeight: waveHeight != null ? Number(waveHeight).toFixed(1) : '—',
          wavePeriod: wavePeriod != null ? String(Math.round(Number(wavePeriod))) : '—',
          windSpeedKts: windSpeed != null ? String(Math.round(Number(windSpeed))) : '—',
          windDirectionLabel: degreesToCardinalSpanish(wind?.current?.wind_direction_10m),
          observedAt: getNowHHMM(timezone),
        };
        writeCache(key, value);
        return value;
      } catch {
        return null;
      }
    };

    Promise.all([loadTides(), loadSun(), loadSwellAndWind()]).then(([tidesData, sunData, swellData]) => {
      if (!isMounted) return;
      setTides(tidesData);
      setSun(sunData);
      setSunsetInfo({ sunset: sunData.sunset, isFallback: sunData.isFallback });
      setSwell(swellData);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [lat, lng, place, todayIso, timezone, isLive, refreshTick, setSunsetInfo]);

  const chip = 'tabular-nums font-medium text-slate-800 text-xs bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-200';

  return (
    <div className="w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        {loading ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 animate-pulse">
            Sincronizando condiciones del mar y luz solar...
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Mareas */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sky-700">
                <Waves className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Mareas</span>
              </div>
              {tides.items.length === 0 ? (
                <span className="text-xs text-slate-400">
                  {isLive ? 'No disponibles' : 'No disponibles en demo'}
                </span>
              ) : (
                <div className="flex items-center gap-2 tabular-nums font-medium text-slate-800">
                  {tides.items.map((t, idx) => (
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
              )}
            </div>

            <span className="text-slate-200 hidden sm:inline" aria-hidden="true">|</span>

            {/* Oleaje y viento */}
            {swell ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-sky-700">
                    <Compass className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Oleaje</span>
                  </div>
                  <div className={chip}>
                    <span className="font-semibold text-slate-900">{swell.waveHeight}m</span>
                    <span className="text-slate-500 font-light ml-1">· {swell.wavePeriod}s</span>
                  </div>
                </div>

                <span className="text-slate-200 hidden sm:inline" aria-hidden="true">|</span>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-sky-700">
                    <Wind className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Viento</span>
                  </div>
                  <div className={chip}>
                    <span className="font-semibold text-slate-900">{swell.windSpeedKts} kts</span>
                    <span className="text-slate-500 font-light ml-1">· {swell.windDirectionLabel}</span>
                  </div>
                  <span className="text-xs text-slate-400">act. {swell.observedAt}</span>
                </div>
              </>
            ) : (
              <span className="text-xs text-slate-400">Oleaje y viento no disponibles (sin conexión)</span>
            )}

            <span className="text-slate-200 hidden sm:inline" aria-hidden="true">|</span>

            {/* Ventana Solar */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sky-700">
                <Sun className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Luz Operativa</span>
              </div>
              <div className={chip}>
                <span className="font-semibold text-slate-900">{sun.sunrise}</span>
                <span className="text-slate-400 mx-1">→</span>
                <span className="font-semibold text-slate-900">{sun.sunset}</span>
              </div>
              {sun.isFallback && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700" title="Sin conexión al servicio solar">
                  <AlertTriangle className="w-3 h-3" /> referencial
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
