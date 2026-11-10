-- ============================================================================
-- SOLO PARA PROYECTOS CON DATOS DE PRUEBA.
-- Borra las tablas, vistas, funciones y políticas del borrador anterior
-- (db_schema_draft.md) para poder ejecutar la migración v2 desde cero.
-- No toca los usuarios de Authentication.
-- ============================================================================

DROP VIEW IF EXISTS public.v_daily_closing_summary;
DROP VIEW IF EXISTS public.v_daily_instructor_leaderboard;
DROP VIEW IF EXISTS public.v_daily_rental_item_breakdown;

DROP TABLE IF EXISTS public.equipment_rentals CASCADE;
DROP TABLE IF EXISTS public.surf_classes CASCADE;
DROP TABLE IF EXISTS public.instructor_attendance CASCADE;
DROP TABLE IF EXISTS public.instructors CASCADE;
DROP TABLE IF EXISTS public.rental_rates CASCADE;
DROP TABLE IF EXISTS public.school_configs CASCADE;
DROP TABLE IF EXISTS public.schools CASCADE;

DROP FUNCTION IF EXISTS public.get_school_branding_by_slug(TEXT);
DROP FUNCTION IF EXISTS public.purge_expired_instructor_attendance();

-- Políticas de Storage del borrador (las de la v2 tienen otros nombres)
DROP POLICY IF EXISTS "id_cards_storage_select_own" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_storage_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_storage_delete_own" ON storage.objects;
-- Por si ya corriste la v2 antes y quieres repetirla
DROP POLICY IF EXISTS "id_cards_select_own" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_update_own" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_delete_own" ON storage.objects;

-- Las fotos de prueba que hayan quedado en el bucket id-cards se borran desde
-- Storage → id-cards en el panel (seleccionar todo → Delete).
