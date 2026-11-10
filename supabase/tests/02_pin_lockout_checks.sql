\set A '11111111-1111-1111-1111-111111111111'
INSERT INTO auth.users VALUES (:'A'); INSERT INTO public.schools (id, slug) VALUES (:'A','a');
SET ROLE authenticated; SELECT set_config('request.jwt.uid', :'A', false) \g /dev/null
SELECT public.admin_save_settings('1', NULL, NULL, NULL) AS r1;
SELECT public.admin_save_settings('2', NULL, NULL, NULL) AS r2;
SELECT public.admin_save_settings('3', NULL, NULL, NULL), public.admin_save_settings('4', NULL, NULL, NULL), public.admin_save_settings('5', NULL, NULL, NULL);
SELECT public.admin_save_settings('0000', NULL, NULL, '{"display_name":"X"}') AS bloqueado;
RESET ROLE; UPDATE public.schools SET pin_locked_until = NULL, pin_failed_attempts = 0; SET ROLE authenticated;
SELECT public.admin_change_pin('0000', '12') AS corto, public.admin_change_pin('0000','4321') AS ok, public.verify_admin_pin('4321') AS nuevo;
