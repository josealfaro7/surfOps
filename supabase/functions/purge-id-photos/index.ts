// Edge Function "purge-id-photos": borra del bucket privado id-cards las fotos de carnet
// de los arriendos devueltos ANTES de hoy (hora local de cada escuela) y marca el registro
// como purgado. La ejecuta pg_cron una vez al día.
//
// Autorización: el encabezado x-cron-secret debe coincidir con el secreto guardado en
// Vault (purge_cron_secret), que se lee con la RPC get_purge_cron_secret (solo service_role).
// Así nadie necesita copiar el secreto a mano.
//
// Despliegue: supabase functions deploy purge-id-photos --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'id-cards';
const BATCH = 100;

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const { data: expected, error: secretError } = await supabase.rpc('get_purge_cron_secret');
  const provided = req.headers.get('x-cron-secret');
  if (secretError || !expected || !provided || provided !== expected) {
    return new Response('No autorizado', { status: 401 });
  }

  let purged = 0;
  const failures: string[] = [];

  // Hasta 10 lotes por ejecución; lo que quede se borra al día siguiente
  for (let i = 0; i < 10; i += 1) {
    const { data: pending, error } = await supabase.rpc('rentals_pending_photo_purge', { p_limit: BATCH });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    if (!pending || pending.length === 0) break;

    const paths = pending.map((r: { storage_path: string }) => r.storage_path);
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
    if (removeError) {
      failures.push(removeError.message);
      break; // no marcar como borradas fotos que siguen en el bucket
    }

    const ids = pending.map((r: { rental_id: string }) => r.rental_id);
    const { data: marked, error: markError } = await supabase.rpc('mark_id_photos_purged', { p_rental_ids: ids });
    if (markError) {
      failures.push(markError.message);
      break;
    }
    purged += Number(marked) || 0;
    if (pending.length < BATCH) break;
  }

  return new Response(JSON.stringify({ purged, failures }), {
    status: failures.length ? 207 : 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
