\set ON_ERROR_STOP 0
\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'
INSERT INTO auth.users VALUES (:'A'), (:'B');
INSERT INTO public.schools (id, slug) VALUES (:'A','escuela-a'), (:'B','escuela-b');
INSERT INTO public.school_configs (school_id) VALUES (:'A'), (:'B');
INSERT INTO public.instructors (id, school_id, name) VALUES
 ('aaaaaaaa-0000-0000-0000-000000000001', :'A', 'Diego'),
 ('bbbbbbbb-0000-0000-0000-000000000001', :'B', 'Pedro');

SET ROLE authenticated;
SELECT set_config('request.jwt.uid', :'A', false);

\echo '--- 1. no puede leer admin_pin_hash'
SELECT admin_pin_hash FROM public.schools;
\echo '--- 2. lee su branding'
SELECT slug FROM public.schools;
\echo '--- 3. UPDATE directo de config bloqueado'
UPDATE public.school_configs SET price_individual = 1;
\echo '--- 4. PIN incorrecto / correcto'
SELECT public.verify_admin_pin('1234') AS mal, public.verify_admin_pin('0000') AS bien;
\echo '--- 5. guardar config con PIN'
SELECT public.admin_save_settings('0000', '{"price_individual":30000,"price_group_base":40000,"price_group_extra_pax":18000,"price_course_pack8":160000,"pay_individual":7000,"pay_group_base":9000,"pay_group_extra_pax":2000,"pay_course_single_class":6000,"open_time":"09:00","close_time":"20:00"}'::jsonb,
  '[{"item_code":"tabla_surf","label":"Tabla","price_per_hour":8000,"is_enabled":true}]'::jsonb, '{"display_name":"Escuela A"}'::jsonb);
SELECT price_individual FROM public.school_configs;
SELECT display_name FROM public.schools;
\echo '--- 6. guardar con PIN malo falla'
SELECT public.admin_save_settings('9999', '{"price_individual":1}'::jsonb, NULL, NULL) AS pin_malo;
\echo '--- 7. clase válida'
INSERT INTO public.surf_classes (school_id, instructor_id, operation_date, start_time, end_time, modality, pax, category, subtotal, final_total, instructor_pay, student_name)
VALUES (:'A', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-11-10', '10:30', '11:45', 'individual', 1, 'unica', 25000, 25000, 7000, 'Ok');
\echo '--- 8. solape mismo instructor (debe fallar 23P01)'
INSERT INTO public.surf_classes (school_id, instructor_id, operation_date, start_time, end_time, modality, pax, category, subtotal, final_total, instructor_pay, student_name)
VALUES (:'A', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-11-10', '11:00', '12:15', 'individual', 1, 'unica', 25000, 25000, 7000, 'Choque');
\echo '--- 9. mismo horario otro día: OK'
INSERT INTO public.surf_classes (school_id, instructor_id, operation_date, start_time, end_time, modality, pax, category, subtotal, final_total, instructor_pay, student_name)
VALUES (:'A', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-11-11', '10:30', '11:45', 'individual', 1, 'unica', 25000, 25000, 7000, 'Otro dia');
\echo '--- 10. fuera de horario (debe fallar)'
INSERT INTO public.surf_classes (school_id, instructor_id, operation_date, start_time, end_time, modality, pax, category, subtotal, final_total, instructor_pay, student_name)
VALUES (:'A', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-11-10', '19:00', '20:15', 'individual', 1, 'unica', 25000, 25000, 7000, 'Tarde');
\echo '--- 11. instructor de otra escuela (debe fallar FK)'
INSERT INTO public.surf_classes (school_id, instructor_id, operation_date, start_time, end_time, modality, pax, category, subtotal, final_total, instructor_pay, student_name)
VALUES (:'A', 'bbbbbbbb-0000-0000-0000-000000000001', '2026-11-10', '15:00', '16:15', 'individual', 1, 'unica', 25000, 25000, 7000, 'Ajeno');
\echo '--- 12. pack: sesión 1 pagada + sesión pendiente sin instructor'
INSERT INTO public.surf_classes (school_id, instructor_id, status, operation_date, start_time, end_time, modality, pax, category, course_group_id, session_index, is_paid_in_pack, subtotal, final_total, instructor_pay, student_name) VALUES
 (:'A', 'aaaaaaaa-0000-0000-0000-000000000001', 'scheduled', '2026-11-10', '15:00', '16:15', 'individual', 1, 'curso', 'cccccccc-0000-0000-0000-000000000001', 1, false, 160000, 160000, 6000, 'Pack'),
 (:'A', NULL, 'pending_instructor', '2026-11-12', '15:00', '16:15', 'individual', 1, 'curso', 'cccccccc-0000-0000-0000-000000000001', 2, true, 0, 0, 0, 'Pack');
\echo '--- 13. no-show con pago > 0 (debe fallar CHECK)'
UPDATE public.surf_classes SET status = 'no_show' WHERE student_name = 'Ok';
\echo '--- 14. no-show con pago 0: OK y libera horario'
UPDATE public.surf_classes SET status = 'no_show', instructor_pay = 0 WHERE student_name = 'Ok';
\echo '--- 15. arriendo con medio de pago'
INSERT INTO public.equipment_rentals (school_id, operation_date, item_code, item_label, unit_price_per_hour, quantity, hours, check_in_time, estimated_return_time, estimated_return_at, payment_method, subtotal, final_total, customer_name, customer_phone, id_photo_storage_path)
VALUES (:'A', '2026-11-10', 'tabla_surf', 'Tabla', 8000, 1, 2, '10:00', '12:00', now(), 'Efectivo', 16000, 16000, 'Cli', '9', 'x/y.jpg');
\echo '--- 16. arriendo que pasa el cierre (debe fallar)'
INSERT INTO public.equipment_rentals (school_id, operation_date, item_code, item_label, unit_price_per_hour, quantity, hours, check_in_time, estimated_return_time, estimated_return_at, subtotal, final_total, customer_name, customer_phone, id_photo_storage_path)
VALUES (:'A', '2026-11-10', 'tabla_surf', 'Tabla', 8000, 1, 6, '15:00', '21:00', now(), 48000, 48000, 'Cli', '9', 'x/z.jpg');
\echo '--- 17. cierre del 10 y 12'
SELECT * FROM public.get_closing_range('2026-11-10', '2026-11-12');
\echo '--- 18. escuela B no ve datos de A'
SELECT set_config('request.jwt.uid', :'B', false);
SELECT count(*) AS clases_vistas_por_B FROM public.surf_classes;
SELECT * FROM public.get_closing_range('2026-11-10', '2026-11-10');
\echo '--- 19. bloqueo tras 5 PIN malos'
SELECT public.verify_admin_pin('1'),public.verify_admin_pin('2'),public.verify_admin_pin('3'),public.verify_admin_pin('4'),public.verify_admin_pin('5');
SELECT public.verify_admin_pin('0000') AS correcto_pero_bloqueado;
