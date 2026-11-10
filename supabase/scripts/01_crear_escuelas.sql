-- ============================================================================
-- Alta de escuelas a partir de usuarios ya creados en Authentication.
-- Reemplaza los correos, nombres y slugs, y ejecuta UN bloque por escuela.
-- slug: minúsculas, números y guiones (se usa en el nombre del CSV).
-- PIN inicial: 0000 → cámbialo en el Módulo 01 al primer ingreso.
-- ============================================================================

-- ---------- Escuela 1 ----------
WITH u AS (SELECT id FROM auth.users WHERE email = 'dueno1@correo.cl')
INSERT INTO public.schools (id, slug, display_name, monogram, tagline, latitude, longitude)
SELECT id, 'escuela-uno', 'ESCUELA UNO', 'E1', 'Sistema de Gestión Operativa', -29.97800, -71.36000 FROM u;

INSERT INTO public.school_configs (school_id)
SELECT id FROM auth.users WHERE email = 'dueno1@correo.cl';

INSERT INTO public.rental_rates (school_id, item_code, label, price_per_hour)
SELECT u.id, r.item_code, r.label, r.price
FROM auth.users u
CROSS JOIN (VALUES ('tabla_surf', 'Tabla de Surf', 8000), ('traje_surf', 'Traje de Surf', 5000),
                   ('bodyboard', 'Bodyboard', 5000), ('aletas', 'Aletas', 3000)) AS r(item_code, label, price)
WHERE u.email = 'dueno1@correo.cl';

INSERT INTO public.instructors (school_id, name, sort_order)
SELECT u.id, i.name, i.ord
FROM auth.users u
CROSS JOIN (VALUES ('Diego', 1), ('Jose', 2), ('Vitoco', 3), ('Caco', 4), ('Alfred', 5)) AS i(name, ord)
WHERE u.email = 'dueno1@correo.cl';

-- ---------- Escuela 2 (copia el bloque anterior cambiando correo, slug y nombres) ----------

-- ---------- Verificación ----------
SELECT s.slug, s.display_name, u.email,
       (SELECT count(*) FROM public.instructors i WHERE i.school_id = s.id) AS instructores,
       (SELECT count(*) FROM public.rental_rates r WHERE r.school_id = s.id) AS tarifas
FROM public.schools s JOIN auth.users u ON u.id = s.id;
