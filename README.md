# SurfOps ERP — Gestión Operativa y Liquidación para Escuelas de Surf

**Demo en vivo:** [https://josealfaro7.github.io/surfOps/](https://josealfaro7.github.io/surfOps/)
**Repositorio:** [https://github.com/josealfaro7/surfOps](https://github.com/josealfaro7/surfOps)

Aplicación React + Tailwind (Vite) con backend Supabase (PostgreSQL + Auth + Storage) para la operación diaria en playa de una escuela de surf: fila de instructores por turno, ingreso de clases y cursos, arriendos con carnet en garantía y cierre diario de caja y nómina.

---

## 1. Dos modos de uso

| Modo | Cómo se entra | Dónde viven los datos |
| :--- | :--- | :--- |
| **Demo** | Botón "Cargar Sesión Demo" en el login | Solo en este navegador (`localStorage`, clave `surfops_demo_v2_state`). PIN de configuración: `0000`. |
| **Real** | Correo y contraseña de la escuela (Supabase Auth) | Supabase. En el navegador solo se guarda el branding (nombre y colores) por escuela. |

En modo real **nada se marca como guardado si la base de datos no lo confirma**: los errores se muestran en pantalla.

---

## 2. Reglas de negocio

### Fila de instructores (Módulo 02 → Módulo 03)
- **Rotación estricta (round-robin):** el orden inicial es la hora de check-in. Cada vez que un instructor recibe una **clase única** del día (sugerida por la fila o asignada a mano) pasa al final de la fila.
- **Las sesiones de curso no mueven la fila:** el curso pertenece al instructor que lo tomó. Si ese instructor está en una sesión de curso a la hora pedida, se salta para ese bloque y conserva su lugar.
- Si el primero de la fila está ocupado en ese bloque, se salta **pero conserva su turno** para la siguiente clase.
- Quitar el check-in pide confirmación: al volver a marcar, el instructor toma la nueva hora de llegada.

### Clases (Módulo 03)
- Duración configurable (por defecto 75 min). No se puede guardar una clase que:
  - choque con otra clase del mismo instructor **el mismo día**,
  - quede fuera del **horario de atención** (por defecto 09:00–20:00),
  - termine después del **ocaso** (solo para hoy y solo si el dato solar viene del servicio en línea).
- La base de datos repite estas validaciones (restricción de exclusión + trigger), así que dos recepciones simultáneas no pueden duplicar a un instructor.

### Cursos (Pack)
- El alumno **paga el pack completo al inscribirse**: el ingreso entra a caja en la fecha de la sesión #1. Las sesiones 2..N quedan en $0 ("Pack Pagado").
- Al instructor se le paga **cada sesión el día que la dicta**.
- Todas las sesiones quedan asignadas por defecto al instructor de la sesión #1 (el dueño del curso). Las excepciones se cambian a mano en la bitácora.
- Si el alumno **no asiste** ("No asistió"), el instructor no cobra esa sesión. El ingreso del pack se mantiene.
- Se pueden agregar sesiones a un pack existente (hasta 8) desde la bitácora.
- Eliminar la sesión #1 elimina el pack completo (pide confirmación), para no dejar sesiones "pagadas" sin ingreso.

### Arriendos (Módulo 05)
- Las horas de arriendo se limitan a lo que queda hasta el cierre.
- Cada arriendo registra su **medio de pago** (entra a la cuadratura de caja).
- Un arriendo activo de un día anterior aparece como "No devuelto (día anterior)".
- La foto del carnet se sube a un bucket privado y solo se ve con una URL firmada de 60 segundos. En modo real nunca se guarda en el navegador.
- **La foto se elimina el día siguiente a la devolución** (Edge Function `purge-id-photos`, diaria). Mientras el arriendo está activo la foto es obligatoria.
- Sin cobro por atraso: el sistema solo marca el arriendo como "Atrasado".

### Cierre diario (Módulo 04)
- Todo se filtra por la fecha de hoy (hora de la escuela, no UTC).
- **Caja clases** = total de clases de hoy (excepto canceladas). **Nómina** = sesiones de hoy agendadas o realizadas. **Arriendos** = 100 % escuela.
- **Medios de pago** suman clases + arriendos.
- La semana (lunes a domingo) viene de la base (`get_closing_range`); los días futuros se muestran como agenda y no suman a los totales.
- Exportación CSV con separador `;` (Excel en español), incluye clases y arriendos.

### Configuración (Módulo 01)
- El PIN se valida **en el servidor** (`verify_admin_pin`). Tras 5 intentos fallidos se bloquea 15 minutos.
- Precios, nómina, horario, tarifas de arriendo y branding solo se pueden guardar a través de la RPC `admin_save_settings`, que exige el PIN. La recepción no puede cambiarlos llamando a la API directamente.
- Las 4 paletas cambian toda la interfaz (variables CSS conectadas en `tailwind.config.js`).

---

## 3. Estructura

```
src/
  context/SurfSchoolContext.jsx   Estado global, modos demo/real, escrituras a Supabase
  lib/mappers.js                  Mapeo único columnas SQL ↔ modelo React
  lib/demoStore.js                Datos y persistencia del modo demo
  lib/supabaseClient.js           Cliente, branding y Storage
  utils/calculations.js           Reglas de negocio puras (con tests)
  utils/dates.js                  Fechas en la zona horaria de la escuela
  components/                     Módulos 01–05, barra ambiental y login
supabase/
  migrations/                     Esquema v2 (tablas, RLS, RPC, triggers)
  functions/tides/                Edge Function de mareas (Stormglass)
  tests/                          Pruebas SQL del esquema
```

---

## 4. Puesta en marcha

```bash
npm install
npm run dev        # desarrollo
npm test           # tests de reglas de negocio (vitest)
npm run build      # producción
npm run deploy     # GitHub Pages
```

### Variables de entorno (`.env`, no se sube al repo)

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

La API key de Stormglass **ya no va en el frontend** (quedaba publicada en GitHub Pages). Se configura como secreto de la Edge Function:

```bash
supabase secrets set STORMGLASS_API_KEY=...        # usa una key NUEVA: la anterior quedó pública
supabase functions deploy tides

supabase secrets set PURGE_CRON_SECRET=...         # valor largo y aleatorio
supabase functions deploy purge-id-photos --no-verify-jwt
```

Luego programa la purga diaria de fotos con `pg_cron` + `pg_net` (instrucciones comentadas en la migración, junto a `rentals_pending_photo_purge`).

### Base de datos

1. Ejecuta `supabase/migrations/20261109000000_surfops_schema_v2.sql` en el SQL Editor (lee la nota final si ya habías corrido el borrador anterior).
2. Crea el usuario de la escuela en Authentication y luego su fila:
   ```sql
   INSERT INTO public.schools (id, slug, display_name, monogram)
   VALUES ('<uuid del usuario>', 'poisson', 'POISSON', 'P');
   INSERT INTO public.school_configs (school_id) VALUES ('<uuid del usuario>');
   INSERT INTO public.instructors (school_id, name, sort_order) VALUES
     ('<uuid>', 'Diego', 1), ('<uuid>', 'Jose', 2), ('<uuid>', 'Vitoco', 3);
   ```
3. Entra a la app, desbloquea el Módulo 01 con `0000` y **cambia el PIN**.
4. Opcional: activa `pg_cron` y programa `purge_expired_instructor_attendance()` (retención de 60 días).

---

## 5. Pendientes conocidos

- **Control de stock por equipo:** descartado por ahora; hoy no se valida cuántas tablas/trajes hay disponibles.
- **Roles separados (admin / recepción):** no se necesitan mientras el dueño esté presente; el PIN protege la configuración.
- **Sincronización en vivo entre equipos:** se opera con un solo equipo. Si se suman más, cada uno ve los cambios del otro al recargar (la base sí impide choques).
- **Datos personales (Ley 21.719):** aviso de privacidad en recepción, cláusula de encargado de tratamiento en el contrato (Supabase en São Paulo = transferencia internacional) y procedimiento para borrar los datos de un alumno que lo pida.
