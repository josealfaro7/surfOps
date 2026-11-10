-- La foto se purga solo si el arriendo se devolvió ANTES de hoy (hora de la escuela)
\set A '11111111-1111-1111-1111-111111111111'
INSERT INTO auth.users VALUES (:'A');
INSERT INTO public.schools (id, slug) VALUES (:'A', 'a');
INSERT INTO public.equipment_rentals (id, school_id, item_code, item_label, unit_price_per_hour, quantity, hours,
  check_in_time, estimated_return_time, estimated_return_at, subtotal, final_total, customer_name, customer_phone,
  id_photo_storage_path, status, returned_at) VALUES
 ('00000000-0000-0000-0000-0000000000a1', :'A', 'tabla_surf', 'Tabla', 8000, 1, 1, '10:00', '11:00', now(), 8000, 8000, 'Ayer', '9', 'a/ayer.jpg', 'completed', now() - interval '1 day'),
 ('00000000-0000-0000-0000-0000000000a2', :'A', 'tabla_surf', 'Tabla', 8000, 1, 1, '10:00', '11:00', now(), 8000, 8000, 'Hoy', '9', 'a/hoy.jpg', 'completed', now()),
 ('00000000-0000-0000-0000-0000000000a3', :'A', 'tabla_surf', 'Tabla', 8000, 1, 1, '10:00', '11:00', now(), 8000, 8000, 'Activo', '9', 'a/activo.jpg', 'active', NULL);
\echo '--- pendientes (debe ser solo "ayer")'
SELECT storage_path FROM public.rentals_pending_photo_purge();
SELECT public.mark_id_photos_purged(ARRAY['00000000-0000-0000-0000-0000000000a1'::uuid, '00000000-0000-0000-0000-0000000000a3'::uuid]) AS marcados;
\echo '--- estado (el activo conserva la foto)'
SELECT customer_name, id_photo_storage_path, id_photo_purged_at IS NOT NULL AS purgado FROM public.equipment_rentals ORDER BY customer_name;
\echo '--- un arriendo activo sin foto (debe fallar)'
UPDATE public.equipment_rentals SET id_photo_storage_path = NULL WHERE customer_name = 'Activo';
\echo '--- authenticated no puede llamar la purga (debe fallar)'
SET ROLE authenticated;
SELECT * FROM public.rentals_pending_photo_purge();
