-- ============================================================================
-- SurfOps · Tareas programadas (pg_cron + pg_net)
-- Ejecutar DESPUÉS de 20261109000000_surfops_schema_v2.sql y de desplegar la
-- Edge Function purge-id-photos. Reemplaza <ref> por el project ref.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Secreto compartido entre pg_cron y la Edge Function, generado dentro de la base:
-- nadie necesita verlo ni copiarlo.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'purge_cron_secret') THEN
        PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'purge_cron_secret',
                                    'Secreto de pg_cron para la Edge Function purge-id-photos');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'project_url') THEN
        PERFORM vault.create_secret('https://<ref>.supabase.co', 'project_url',
                                    'URL del proyecto para llamadas de pg_cron');
    END IF;
END $$;

-- La Edge Function (service_role) valida el encabezado x-cron-secret contra este valor
CREATE OR REPLACE FUNCTION public.get_purge_cron_secret()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'purge_cron_secret' LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_purge_cron_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_purge_cron_secret() TO service_role;

-- Fotos de carnet: todos los días 03:15 de Chile (06:15 UTC en horario de verano)
SELECT cron.schedule('purge-id-photos', '15 6 * * *', $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/purge-id-photos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'purge_cron_secret')
    ),
    body := '{}'::jsonb
  );
$cron$);

-- Asistencia de instructores: retención de 60 días
SELECT cron.schedule('purge-attendance-60d', '0 7 * * *',
  $cron$SELECT public.purge_expired_instructor_attendance();$cron$);
