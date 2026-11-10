// Edge Function "tides": consulta Stormglass desde el servidor para que la API key
// no quede publicada en el bundle del frontend.
//
// Despliegue:
//   supabase secrets set STORMGLASS_API_KEY=<tu_key>
//   supabase functions deploy tides
//
// Llamada desde el frontend (requiere sesión):
//   supabase.functions.invoke('tides', { body: { lat, lng, date: 'YYYY-MM-DD', timezone } })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Desfase (ms) de una zona horaria en un instante dado
function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - date.getTime();
}

// Medianoche local de `date` en `timeZone`, como instante UTC
function localMidnightUtc(date: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d));
  return new Date(guess.getTime() - tzOffsetMs(guess, timeZone));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('STORMGLASS_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'STORMGLASS_API_KEY no configurada' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { lat, lng, date, timezone = 'America/Santiago' } = await req.json();
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: 'Parámetros inválidos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Día LOCAL de la playa (no el día UTC)
    const start = localMidnightUtc(date, timezone);
    const end = new Date(start.getTime() + 24 * 3600 * 1000 - 1000);

    const url =
      `https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}` +
      `&start=${start.toISOString()}&end=${end.toISOString()}`;
    const res = await fetch(url, { headers: { Authorization: apiKey } });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Stormglass ${res.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const json = await res.json();
    // Altura relativa al datum por defecto de Stormglass (MSL). Si necesitas NRS del SHOA,
    // calibra el desfase para tu playa y súmalo aquí.
    const extremes = (json?.data || []).map((t: { type: string; time: string; height: number }) => ({
      type: t.type,
      time: t.time,
      height: t.height,
    }));

    return new Response(JSON.stringify({ extremes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'max-age=3600' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
