-- ============================================================================
-- SurfOps ERP · Esquema v2 (alineado con el frontend de la rama fix/auditoria)
-- ----------------------------------------------------------------------------
-- Reemplaza al borrador de db_schema_draft.md. Cambios principales:
--   * Nombres de columnas = los que usa src/lib/mappers.js (fuente única).
--   * Estados de clase (scheduled / pending_instructor / completed / no_show /
--     cancelled), packs de curso (course_group_id) e instructor opcional.
--   * Medio de pago en arriendos.
--   * Horario de atención de la escuela validado por trigger.
--   * Restricción de exclusión: un instructor no puede tener dos clases que se
--     solapen el mismo día.
--   * FKs compuestas (school_id, id) para impedir referencias entre escuelas.
--   * Configuración, tarifas y branding solo se modifican vía RPC con PIN.
--   * admin_pin_hash ya no es legible por el rol authenticated.
--   * Cierre diario por RPC con fecha como parámetro (sin barrer el historial).
--   * Fechas operativas por defecto en hora de Chile, no en UTC.
--
-- Pensado para un proyecto nuevo o de pruebas. Si ya hay datos reales, revisa
-- la sección "MIGRAR DESDE EL BORRADOR" al final antes de ejecutar.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Fecha y hora "de la playa" (America/Santiago por defecto)
CREATE OR REPLACE FUNCTION public.local_today(p_tz TEXT DEFAULT 'America/Santiago')
RETURNS DATE
LANGUAGE sql
STABLE
AS $$ SELECT (now() AT TIME ZONE p_tz)::date $$;

-- ============================================================================
-- 1. SCHOOLS (tenant raíz · id = auth.uid())
-- ============================================================================
CREATE TABLE public.schools (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
    display_name TEXT NOT NULL DEFAULT 'POISSON',
    monogram TEXT NOT NULL DEFAULT 'P' CHECK (char_length(monogram) BETWEEN 1 AND 3),
    tagline TEXT NOT NULL DEFAULT 'Sistema de Gestión Operativa',
    logo_storage_path TEXT,
    theme_palette JSONB NOT NULL DEFAULT '{
        "primary": "#172554",
        "primaryHover": "#1e3a8a",
        "secondary": "#0284c7",
        "accent": "#db2777"
    }'::jsonb,
    latitude NUMERIC(8,5) NOT NULL DEFAULT -29.97800,
    longitude NUMERIC(8,5) NOT NULL DEFAULT -71.36000,
    timezone TEXT NOT NULL DEFAULT 'America/Santiago',
    admin_pin_hash TEXT NOT NULL DEFAULT crypt('0000', gen_salt('bf')),
    pin_failed_attempts INTEGER NOT NULL DEFAULT 0,
    pin_locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_schools_theme_palette_keys CHECK (
        theme_palette ? 'primary' AND theme_palette ? 'secondary' AND theme_palette ? 'accent'
    )
);

-- ============================================================================
-- 2. CONFIGURACIÓN FINANCIERA Y HORARIO DE ATENCIÓN
-- ============================================================================
CREATE TABLE public.school_configs (
    school_id UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
    price_individual NUMERIC(12,0) NOT NULL DEFAULT 25000 CHECK (price_individual >= 0),
    price_group_base NUMERIC(12,0) NOT NULL DEFAULT 40000 CHECK (price_group_base >= 0),
    price_group_extra_pax NUMERIC(12,0) NOT NULL DEFAULT 18000 CHECK (price_group_extra_pax >= 0),
    price_course_pack8 NUMERIC(12,0) NOT NULL DEFAULT 160000 CHECK (price_course_pack8 >= 0),
    pay_individual NUMERIC(12,0) NOT NULL DEFAULT 7000 CHECK (pay_individual >= 0),
    pay_group_base NUMERIC(12,0) NOT NULL DEFAULT 9000 CHECK (pay_group_base >= 0),
    pay_group_extra_pax NUMERIC(12,0) NOT NULL DEFAULT 2000 CHECK (pay_group_extra_pax >= 0),
    pay_course_single_class NUMERIC(12,0) NOT NULL DEFAULT 6000 CHECK (pay_course_single_class >= 0),
    open_time TIME NOT NULL DEFAULT '09:00',
    close_time TIME NOT NULL DEFAULT '20:00',
    class_duration_minutes INTEGER NOT NULL DEFAULT 75 CHECK (class_duration_minutes BETWEEN 15 AND 300),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_school_hours CHECK (close_time > open_time)
);

-- ============================================================================
-- 3. TARIFARIO DE ARRIENDO
-- ============================================================================
CREATE TABLE public.rental_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    item_code TEXT NOT NULL CHECK (item_code IN ('tabla_surf', 'traje_surf', 'bodyboard', 'aletas')),
    label TEXT NOT NULL,
    price_per_hour NUMERIC(12,0) NOT NULL DEFAULT 5000 CHECK (price_per_hour >= 0),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rental_rates_school_item UNIQUE (school_id, item_code),
    CONSTRAINT uq_rental_rates_school_id UNIQUE (school_id, id)
);

-- ============================================================================
-- 4. INSTRUCTORES Y ASISTENCIA (retención 60 días)
-- ============================================================================
CREATE TABLE public.instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_instructors_school_id UNIQUE (school_id, id)
);

CREATE INDEX idx_instructors_school_active ON public.instructors (school_id, is_active, sort_order);

CREATE TABLE public.instructor_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL,
    attendance_date DATE NOT NULL DEFAULT public.local_today(),
    check_in_time TIME NOT NULL,
    check_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out_at TIMESTAMPTZ,
    CONSTRAINT fk_attendance_instructor FOREIGN KEY (school_id, instructor_id)
        REFERENCES public.instructors (school_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_instructor_daily_attendance UNIQUE (school_id, instructor_id, attendance_date)
);

CREATE INDEX idx_attendance_queue_lookup
    ON public.instructor_attendance (school_id, attendance_date, check_in_at)
    WHERE check_out_at IS NULL;

CREATE OR REPLACE FUNCTION public.purge_expired_instructor_attendance()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.instructor_attendance
    WHERE attendance_date < public.local_today() - 60;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_instructor_attendance() FROM PUBLIC, anon, authenticated;

-- Con pg_cron habilitado (Database → Extensions), programar a las 04:00 de Chile ≈ 07:00 UTC:
-- SELECT cron.schedule('purge-attendance-60d', '0 7 * * *', $$SELECT public.purge_expired_instructor_attendance();$$);

-- ============================================================================
-- 5. CLASES DE SURF (clases únicas y sesiones de curso)
-- ============================================================================
CREATE TABLE public.surf_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    instructor_id UUID,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
        status IN ('scheduled', 'pending_instructor', 'completed', 'no_show', 'cancelled')
    ),
    operation_date DATE NOT NULL DEFAULT public.local_today(),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    modality TEXT NOT NULL CHECK (modality IN ('individual', 'grupal')),
    pax INTEGER NOT NULL DEFAULT 1 CHECK (
        (modality = 'individual' AND pax = 1) OR (modality = 'grupal' AND pax >= 2)
    ),
    category TEXT NOT NULL CHECK (category IN ('unica', 'curso')),
    course_group_id UUID,
    session_index INTEGER NOT NULL DEFAULT 1 CHECK (session_index BETWEEN 1 AND 8),
    is_paid_in_pack BOOLEAN NOT NULL DEFAULT FALSE,
    payment_method TEXT NOT NULL DEFAULT 'Transferencia' CHECK (
        payment_method IN ('Transferencia', 'Tarjeta', 'Efectivo')
    ),
    subtotal NUMERIC(12,0) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    final_total NUMERIC(12,0) NOT NULL CHECK (final_total >= 0),
    instructor_pay NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (instructor_pay >= 0),
    was_suggested_by_queue BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_at TIMESTAMPTZ,
    student_name TEXT NOT NULL,
    student_phone TEXT NOT NULL DEFAULT '',
    student_email TEXT NOT NULL DEFAULT '',
    emergency_contact_name TEXT NOT NULL DEFAULT '',
    emergency_contact_phone TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_class_instructor FOREIGN KEY (school_id, instructor_id)
        REFERENCES public.instructors (school_id, id) ON DELETE RESTRICT,
    CONSTRAINT chk_class_time_range CHECK (end_time > start_time),
    CONSTRAINT chk_class_final_total CHECK (final_total = GREATEST(0, subtotal - discount)),
    CONSTRAINT chk_class_course_group CHECK (category = 'unica' OR course_group_id IS NOT NULL),
    CONSTRAINT chk_class_pack_paid CHECK (NOT is_paid_in_pack OR final_total = 0),
    CONSTRAINT chk_class_instructor_status CHECK (
        (instructor_id IS NULL AND status IN ('pending_instructor', 'cancelled'))
        OR (instructor_id IS NOT NULL AND status <> 'pending_instructor')
    ),
    -- Inasistencia o cancelación: el instructor no cobra esa sesión
    CONSTRAINT chk_class_unpaid_status CHECK (
        status NOT IN ('no_show', 'cancelled', 'pending_instructor') OR instructor_pay = 0
    ),
    -- Un instructor no puede tener dos clases activas que se solapen
    CONSTRAINT excl_instructor_overlap EXCLUDE USING gist (
        school_id WITH =,
        instructor_id WITH =,
        tsrange(operation_date + start_time, operation_date + end_time, '[)') WITH &&
    ) WHERE (instructor_id IS NOT NULL AND status IN ('scheduled', 'completed'))
);

CREATE INDEX idx_surf_classes_school_date ON public.surf_classes (school_id, operation_date, start_time);
CREATE INDEX idx_surf_classes_course_group ON public.surf_classes (school_id, course_group_id)
    WHERE course_group_id IS NOT NULL;

-- ============================================================================
-- 6. ARRIENDOS DE EQUIPAMIENTO
-- ============================================================================
CREATE TABLE public.equipment_rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    rental_rate_id UUID,
    operation_date DATE NOT NULL DEFAULT public.local_today(),
    item_code TEXT NOT NULL CHECK (item_code IN ('tabla_surf', 'traje_surf', 'bodyboard', 'aletas')),
    item_label TEXT NOT NULL,
    unit_price_per_hour NUMERIC(12,0) NOT NULL CHECK (unit_price_per_hour >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 50),
    hours INTEGER NOT NULL DEFAULT 1 CHECK (hours BETWEEN 1 AND 12),
    check_in_time TIME NOT NULL,
    estimated_return_time TIME NOT NULL,
    returned_time TIME,
    check_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estimated_return_at TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,
    payment_method TEXT NOT NULL DEFAULT 'Efectivo' CHECK (
        payment_method IN ('Transferencia', 'Tarjeta', 'Efectivo')
    ),
    subtotal NUMERIC(12,0) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    final_total NUMERIC(12,0) NOT NULL CHECK (final_total >= 0),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT NOT NULL DEFAULT '',
    emergency_contact TEXT NOT NULL DEFAULT '',
    id_photo_storage_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_rental_rate FOREIGN KEY (school_id, rental_rate_id)
        REFERENCES public.rental_rates (school_id, id) ON DELETE SET NULL (rental_rate_id),
    CONSTRAINT chk_rental_subtotal CHECK (subtotal = unit_price_per_hour * quantity * hours),
    CONSTRAINT chk_rental_final_total CHECK (final_total = GREATEST(0, subtotal - discount)),
    CONSTRAINT chk_rental_return_after_checkin CHECK (estimated_return_time > check_in_time),
    CONSTRAINT chk_rental_returned CHECK (
        (status = 'active' AND returned_at IS NULL) OR (status = 'completed' AND returned_at IS NOT NULL)
    )
);

CREATE INDEX idx_equipment_rentals_active_monitor
    ON public.equipment_rentals (school_id, estimated_return_at) WHERE status = 'active';
CREATE INDEX idx_equipment_rentals_school_date
    ON public.equipment_rentals (school_id, operation_date, status);

-- ============================================================================
-- 7. VALIDACIÓN DE HORARIO DE ATENCIÓN (trigger)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_school_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_open TIME;
    v_close TIME;
BEGIN
    SELECT open_time, close_time INTO v_open, v_close
    FROM public.school_configs WHERE school_id = NEW.school_id;

    IF v_open IS NULL THEN
        RETURN NEW; -- sin configuración: no se valida
    END IF;

    IF TG_TABLE_NAME = 'surf_classes' THEN
        IF NEW.status IN ('scheduled', 'pending_instructor')
           AND (NEW.start_time < v_open OR NEW.end_time > v_close) THEN
            RAISE EXCEPTION 'La clase (% - %) queda fuera del horario de atención (% - %).',
                NEW.start_time, NEW.end_time, v_open, v_close
                USING ERRCODE = 'check_violation';
        END IF;
    ELSIF TG_TABLE_NAME = 'equipment_rentals' THEN
        IF TG_OP = 'INSERT'
           AND (NEW.check_in_time < v_open OR NEW.estimated_return_time > v_close) THEN
            RAISE EXCEPTION 'El arriendo (% - %) queda fuera del horario de atención (% - %).',
                NEW.check_in_time, NEW.estimated_return_time, v_open, v_close
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_surf_classes_hours
    BEFORE INSERT OR UPDATE OF start_time, end_time, status ON public.surf_classes
    FOR EACH ROW EXECUTE FUNCTION public.enforce_school_hours();

CREATE TRIGGER trg_equipment_rentals_hours
    BEFORE INSERT ON public.equipment_rentals
    FOR EACH ROW EXECUTE FUNCTION public.enforce_school_hours();

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surf_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_rentals ENABLE ROW LEVEL SECURITY;

-- 8.1 schools: solo lectura de columnas públicas; escritura únicamente vía RPC admin
REVOKE ALL ON public.schools FROM anon, authenticated;
GRANT SELECT (
    id, slug, display_name, monogram, tagline, logo_storage_path, theme_palette,
    latitude, longitude, timezone, created_at, updated_at
) ON public.schools TO authenticated;

CREATE POLICY "schools_select_own" ON public.schools
    FOR SELECT TO authenticated USING (id = auth.uid());

-- 8.2 school_configs y rental_rates: lectura propia, escritura solo vía RPC admin
REVOKE INSERT, UPDATE, DELETE ON public.school_configs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rental_rates FROM anon, authenticated;

CREATE POLICY "school_configs_select_own" ON public.school_configs
    FOR SELECT TO authenticated USING (school_id = auth.uid());
CREATE POLICY "rental_rates_select_own" ON public.rental_rates
    FOR SELECT TO authenticated USING (school_id = auth.uid());

-- 8.3 Tablas operativas: CRUD propio
CREATE POLICY "instructors_all_own" ON public.instructors
    FOR ALL TO authenticated USING (school_id = auth.uid()) WITH CHECK (school_id = auth.uid());
CREATE POLICY "instructor_attendance_all_own" ON public.instructor_attendance
    FOR ALL TO authenticated USING (school_id = auth.uid()) WITH CHECK (school_id = auth.uid());
CREATE POLICY "surf_classes_all_own" ON public.surf_classes
    FOR ALL TO authenticated USING (school_id = auth.uid()) WITH CHECK (school_id = auth.uid());
CREATE POLICY "equipment_rentals_all_own" ON public.equipment_rentals
    FOR ALL TO authenticated USING (school_id = auth.uid()) WITH CHECK (school_id = auth.uid());

-- 8.4 Storage: bucket privado de carnets, carpeta = school_id
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-cards', 'id-cards', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "id_cards_select_own" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'id-cards' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "id_cards_insert_own" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'id-cards' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "id_cards_update_own" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'id-cards' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'id-cards' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "id_cards_delete_own" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'id-cards' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- 9. PIN DE ADMINISTRADOR Y GUARDADO DE CONFIGURACIÓN (RPC SECURITY DEFINER)
-- ============================================================================
-- Valida el PIN contra el hash con bloqueo de 15 min tras 5 intentos fallidos.
-- IMPORTANTE: no lanza excepciones. Una excepción revertiría también el contador de
-- intentos (misma transacción) y permitiría probar PINs sin límite. Por eso devuelve
-- NULL si el PIN es válido o un mensaje de error, y las RPC que lo usan retornan ese
-- mensaje en vez de hacer RAISE.
CREATE OR REPLACE FUNCTION public._check_admin_pin(p_pin TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_school public.schools%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN 'Sesión requerida.';
    END IF;

    SELECT * INTO v_school FROM public.schools WHERE id = auth.uid() FOR UPDATE;
    IF NOT FOUND THEN
        RETURN 'Escuela no encontrada.';
    END IF;

    IF v_school.pin_locked_until IS NOT NULL AND v_school.pin_locked_until > now() THEN
        RETURN 'PIN bloqueado por intentos fallidos. Intenta nuevamente en unos minutos.';
    END IF;

    IF v_school.admin_pin_hash <> crypt(COALESCE(p_pin, ''), v_school.admin_pin_hash) THEN
        UPDATE public.schools
        SET pin_failed_attempts = pin_failed_attempts + 1,
            pin_locked_until = CASE WHEN pin_failed_attempts + 1 >= 5
                                    THEN now() + INTERVAL '15 minutes' ELSE NULL END
        WHERE id = v_school.id;
        RETURN 'PIN incorrecto.';
    END IF;

    UPDATE public.schools
    SET pin_failed_attempts = 0, pin_locked_until = NULL
    WHERE id = v_school.id;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public._check_admin_pin(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_admin_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN public._check_admin_pin(p_pin) IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_pin(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_admin_pin(TEXT) TO authenticated;

-- Guarda configuración, tarifas de arriendo y branding en una sola transacción.
-- Cada parámetro jsonb es opcional (NULL = no tocar).
-- Retorna NULL si guardó, o el mensaje de error del PIN (ver _check_admin_pin).
CREATE OR REPLACE FUNCTION public.admin_save_settings(
    p_pin TEXT,
    p_config JSONB DEFAULT NULL,
    p_rates JSONB DEFAULT NULL,
    p_branding JSONB DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_rate JSONB;
    v_pin_error TEXT;
BEGIN
    v_pin_error := public._check_admin_pin(p_pin);
    IF v_pin_error IS NOT NULL THEN
        RETURN v_pin_error;
    END IF;

    IF p_config IS NOT NULL THEN
        INSERT INTO public.school_configs AS sc (
            school_id, price_individual, price_group_base, price_group_extra_pax, price_course_pack8,
            pay_individual, pay_group_base, pay_group_extra_pax, pay_course_single_class,
            open_time, close_time, class_duration_minutes, updated_at
        ) VALUES (
            auth.uid(),
            (p_config->>'price_individual')::numeric,
            (p_config->>'price_group_base')::numeric,
            (p_config->>'price_group_extra_pax')::numeric,
            (p_config->>'price_course_pack8')::numeric,
            (p_config->>'pay_individual')::numeric,
            (p_config->>'pay_group_base')::numeric,
            (p_config->>'pay_group_extra_pax')::numeric,
            (p_config->>'pay_course_single_class')::numeric,
            COALESCE((p_config->>'open_time')::time, '09:00'),
            COALESCE((p_config->>'close_time')::time, '20:00'),
            COALESCE((p_config->>'class_duration_minutes')::integer, 75),
            now()
        )
        ON CONFLICT (school_id) DO UPDATE SET
            price_individual = EXCLUDED.price_individual,
            price_group_base = EXCLUDED.price_group_base,
            price_group_extra_pax = EXCLUDED.price_group_extra_pax,
            price_course_pack8 = EXCLUDED.price_course_pack8,
            pay_individual = EXCLUDED.pay_individual,
            pay_group_base = EXCLUDED.pay_group_base,
            pay_group_extra_pax = EXCLUDED.pay_group_extra_pax,
            pay_course_single_class = EXCLUDED.pay_course_single_class,
            open_time = EXCLUDED.open_time,
            close_time = EXCLUDED.close_time,
            class_duration_minutes = EXCLUDED.class_duration_minutes,
            updated_at = now();
    END IF;

    IF p_rates IS NOT NULL THEN
        FOR v_rate IN SELECT * FROM jsonb_array_elements(p_rates) LOOP
            INSERT INTO public.rental_rates (school_id, item_code, label, price_per_hour, is_enabled, updated_at)
            VALUES (
                auth.uid(),
                v_rate->>'item_code',
                v_rate->>'label',
                (v_rate->>'price_per_hour')::numeric,
                COALESCE((v_rate->>'is_enabled')::boolean, TRUE),
                now()
            )
            ON CONFLICT (school_id, item_code) DO UPDATE SET
                label = EXCLUDED.label,
                price_per_hour = EXCLUDED.price_per_hour,
                is_enabled = EXCLUDED.is_enabled,
                updated_at = now();
        END LOOP;
    END IF;

    IF p_branding IS NOT NULL THEN
        UPDATE public.schools SET
            display_name = COALESCE(NULLIF(trim(p_branding->>'display_name'), ''), display_name),
            monogram = COALESCE(NULLIF(upper(trim(p_branding->>'monogram')), ''), monogram),
            tagline = COALESCE(NULLIF(trim(p_branding->>'tagline'), ''), tagline),
            theme_palette = COALESCE(p_branding->'theme_palette', theme_palette),
            updated_at = now()
        WHERE id = auth.uid();
    END IF;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_settings(TEXT, JSONB, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_settings(TEXT, JSONB, JSONB, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_change_pin(p_current_pin TEXT, p_new_pin TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_pin_error TEXT;
BEGIN
    IF COALESCE(p_new_pin, '') !~ '^[0-9]{4,8}$' THEN
        RETURN 'El nuevo PIN debe tener entre 4 y 8 dígitos.';
    END IF;
    v_pin_error := public._check_admin_pin(p_current_pin);
    IF v_pin_error IS NOT NULL THEN
        RETURN v_pin_error;
    END IF;
    UPDATE public.schools
    SET admin_pin_hash = crypt(p_new_pin, gen_salt('bf')), updated_at = now()
    WHERE id = auth.uid();
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_pin(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_change_pin(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 10. CIERRE DIARIO Y SEMANAL (filtrado por fecha antes de agregar)
-- ============================================================================
-- Reglas:
--   * Caja clases: final_total de clases de la fecha, excepto canceladas
--     (el pack completo entra en la fecha de la sesión #1; sesiones 2..N = $0).
--   * Nómina: instructor_pay de clases de la fecha en estado scheduled/completed
--     (no_show y cancelled valen 0 por CHECK).
--   * Arriendos: 100% a la escuela, en la fecha de salida.
--   * Medios de pago incluyen clases + arriendos.
CREATE OR REPLACE FUNCTION public.get_closing_range(p_from DATE, p_to DATE)
RETURNS TABLE (
    operation_date DATE,
    total_classes INTEGER,
    classes_revenue NUMERIC,
    instructor_payroll NUMERIC,
    total_rentals INTEGER,
    rentals_revenue NUMERIC,
    combined_revenue NUMERIC,
    combined_net_profit NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    WITH days AS (
        SELECT d::date AS operation_date FROM generate_series(p_from, p_to, INTERVAL '1 day') d
    ),
    c AS (
        SELECT sc.operation_date,
               COUNT(*) FILTER (WHERE sc.status <> 'cancelled')::int AS total_classes,
               COALESCE(SUM(sc.final_total) FILTER (WHERE sc.status <> 'cancelled'), 0) AS classes_revenue,
               COALESCE(SUM(sc.instructor_pay) FILTER (WHERE sc.status IN ('scheduled', 'completed')), 0) AS payroll
        FROM public.surf_classes sc
        WHERE sc.school_id = auth.uid() AND sc.operation_date BETWEEN p_from AND p_to
        GROUP BY sc.operation_date
    ),
    r AS (
        SELECT er.operation_date, COUNT(*)::int AS total_rentals, COALESCE(SUM(er.final_total), 0) AS rentals_revenue
        FROM public.equipment_rentals er
        WHERE er.school_id = auth.uid() AND er.operation_date BETWEEN p_from AND p_to
        GROUP BY er.operation_date
    )
    SELECT d.operation_date,
           COALESCE(c.total_classes, 0),
           COALESCE(c.classes_revenue, 0),
           COALESCE(c.payroll, 0),
           COALESCE(r.total_rentals, 0),
           COALESCE(r.rentals_revenue, 0),
           COALESCE(c.classes_revenue, 0) + COALESCE(r.rentals_revenue, 0),
           COALESCE(c.classes_revenue, 0) - COALESCE(c.payroll, 0) + COALESCE(r.rentals_revenue, 0)
    FROM days d
    LEFT JOIN c ON c.operation_date = d.operation_date
    LEFT JOIN r ON r.operation_date = d.operation_date
    ORDER BY d.operation_date;
$$;

GRANT EXECUTE ON FUNCTION public.get_closing_range(DATE, DATE) TO authenticated;

-- ============================================================================
-- MIGRAR DESDE EL BORRADOR (solo si ya ejecutaste db_schema_draft.md)
-- ----------------------------------------------------------------------------
-- Si las tablas del borrador están vacías, lo más simple es borrarlas y correr
-- este archivo completo:
--   DROP VIEW IF EXISTS public.v_daily_closing_summary, public.v_daily_instructor_leaderboard,
--                       public.v_daily_rental_item_breakdown;
--   DROP TABLE IF EXISTS public.equipment_rentals, public.surf_classes, public.instructor_attendance,
--                        public.instructors, public.rental_rates, public.school_configs, public.schools CASCADE;
--   DROP POLICY IF EXISTS "id_cards_storage_select_own" ON storage.objects;
--   DROP POLICY IF EXISTS "id_cards_storage_insert_own" ON storage.objects;
--   DROP POLICY IF EXISTS "id_cards_storage_delete_own" ON storage.objects;
-- Si tienen datos reales, pídeme una migración incremental (ALTER TABLE).
-- ============================================================================
