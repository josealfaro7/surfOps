import React, { useState, useEffect } from 'react';

const FALLBACK_TIDES = [
  { type: 'low', time: '03:18', height: '0.32' },
  { type: 'high', time: '09:34', height: '1.58' },
  { type: 'low', time: '15:42', height: '0.41' },
  { type: 'high', time: '21:55', height: '1.72' },
];

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTideItem(rawItem) {
  let timeStr = rawItem.time || '';
  if (timeStr.includes('T')) {
    const dateObj = new Date(timeStr);
    if (!Number.isNaN(dateObj.getTime())) {
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      timeStr = `${hours}:${minutes}`;
    }
  }

  const numericHeight = Number(rawItem.height);
  const heightStr = Number.isFinite(numericHeight)
    ? numericHeight.toFixed(2)
    : String(rawItem.height ?? '0.00');

  return {
    type: rawItem.type === 'high' ? 'high' : 'low',
    time: timeStr,
    height: heightStr,
  };
}

export default function TideBar() {
  const [tides, setTides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = getTodayDateKey();
    const cacheKey = `tides_cache_${today}`;

    // 1. Verificar caché en localStorage antes de llamar a la API
    try {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTides(parsed.slice(0, 4));
          setLoading(false);
          return;
        }
      }
    } catch {
      // Si falla la lectura de localStorage, continuar con el fetch
    }

    // 2. Consultar API de Stormglass si no existe caché del día
    const apiKey = import.meta.env.VITE_STORMGLASS_API_KEY;
    if (!apiKey) {
      setTides(FALLBACK_TIDES);
      setLoading(false);
      return;
    }

    const startIso = `${today}T00:00:00`;
    const endIso = `${today}T23:59:59`;
    const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=-29.9533&lng=-71.3394&start=${encodeURIComponent(
      startIso
    )}&end=${encodeURIComponent(endIso)}`;

    let isMounted = true;

    fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Stormglass HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        if (!isMounted) return;
        const rawList = Array.isArray(json?.data) ? json.data : [];
        if (rawList.length > 0) {
          const formatted = rawList.slice(0, 4).map(formatTideItem);
          setTides(formatted);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(formatted));
          } catch {
            // Ignorar error de cuota de localStorage
          }
        } else {
          setTides(FALLBACK_TIDES);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setTides(FALLBACK_TIDES);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="w-full bg-sky-50 border-y border-slate-200 rounded-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[2.5rem] py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs sm:text-sm tabular-nums">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-bold text-slate-900 whitespace-nowrap">
            🌊 Mareas para hoy:
          </span>

          {loading ? (
            <span className="text-slate-500 font-medium animate-pulse">
              Calculando mareas del día...
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {tides.map((tide, index) => (
                <React.Fragment key={`${tide.type}-${tide.time}-${index}`}>
                  {index > 0 && (
                    <span className="text-slate-300 select-none" aria-hidden="true">
                      |
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium">
                    <span className="text-slate-800">
                      {tide.type === 'high' ? '🔵 Pleamar:' : '📉 Bajamar:'}
                    </span>
                    <span className="text-slate-900 font-semibold">{tide.time}</span>
                    <span className="text-slate-500">({tide.height}m)</span>
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <span className="hidden lg:inline-block text-[11px] font-mono text-slate-400">
          La Serena · -29.9533, -71.3394
        </span>
      </div>
    </div>
  );
}
