# SurfOp ERP — Dossier de Funcionalidades y Guía Operativa Paso a Paso

**Sistema Multitenant de Gestión Operativa, Financiera, Arriendos y Seguridad Marina para Escuelas de Surf**  
*Documento de Presentación para Clientes · Demo en vivo: [josealfaro7.github.io/surfOps](https://josealfaro7.github.io/surfOps/)*

---

## Resumen Ejecutivo: ¿Qué resuelve SurfOp ERP?

**SurfOp ERP** centraliza en una sola plataforma toda la operación diaria de una escuela de surf —clases, fila de instructores, arriendo de equipamiento con garantía digital y cierre contable—, eliminando planillas desordenadas, errores de cobro en recepción, discusiones por asignación de turnos y cuadraturas manuales al final de la jornada.

| Pilar Operativo | Problema Habitual en Escuelas | Solución en SurfOp ERP |
| :--- | :--- | :--- |
| **Identidad y Tema Visual** | Sistemas genéricos que no reflejan la marca de cada escuela. | **Personalización White-Label (Módulo 01)** con nombre, monograma y **4 paletas corporativas instantáneas**. |
| **Control Tarifario** | Cambios no autorizados de precios o confusión en tarifas grupales y arriendos. | **Módulo 01 protegido con PIN (`0000`)** para tarifas de clases, honorarios de staff y arriendo por hora. |
| **Equidad en Turnos** | Malos entendidos entre profesores por quién recibe más o menos clases. | **Fila Virtual FIFO (Orden de Llegada)** con bloqueo automático de choques de horario. |
| **Recepción Ágil de Clases** | Demora al anotar alumnos, calcular descuentos y avisar por WhatsApp. | **Ingreso en 3 pasos**, contacto de emergencia y **confirmación WhatsApp en 1 clic**. |
| **Control de Arriendos** | Pérdida de trajes/tablas, atrasos en devolución y carnets físicos extraviados. | **Módulo 05 de Arriendos** con **foto de carnet en garantía** y **semáforo de atrasos en vivo**. |
| **Cierre Transparente** | Cuadratura lenta mezclando ingresos de clases con arriendos y pagos a profesores. | **Dashboard con Silo Financiero (4 KPIs)**, Leaderboard de staff, métricas de arriendos y **exportación CSV**. |
| **Seguridad y Nube Multitenant** | Agendar clases sin luz solar o perder datos al cambiar de computador. | **Barra Ambiental en vivo (SHOA/Open-Meteo)**, alerta de ocaso y **Supabase Auth + PostgreSQL (RLS)**. |

---

## 0.- Acceso Multitenant e Identidad Corporativa (`Login` + `Supabase Auth`)

Cada escuela accede con sus propias credenciales (`Email` y `Contraseña`) mediante **Supabase Auth**, garantizando aislamiento total de datos a nivel de base de datos (**Row Level Security** donde `school_id = auth.uid()`).

- **Carga Automática de Identidad (`loadSchoolBranding`):** Al iniciar sesión, el sistema recupera desde `public.schools` el nombre oficial de la escuela, su monograma y su paleta de colores preferida, inyectándola automáticamente en la barra superior sin parpadeos (*Zero-FOUC*).
- **Modo Demo Incorporado:** Incluye acceso directo con datos semilla pre-cargados para demostraciones comerciales en terreno o evaluación inmediata en GitHub Pages.

---

## 1.- Módulo 01: Configuración, Identidad de la Escuela y Tarifas

En este módulo la administración define tanto la **identidad visual de la escuela** como las **reglas económicas de clases y arriendos**.

- **Seguridad de Acceso (PIN de Administrador `0000`):** Bloqueo mediante PIN de 4 dígitos para proteger tarifas e identidad.
- **Identidad de la Escuela y Tema Visual (`public.schools`):**
  - **School ID (UUID de solo lectura):** Identificador único de la escuela en la base de datos.
  - **Nombre de la Escuela (`displayName`) y Monograma (`monogram`):** Actualiza en tiempo real el banner corporativo superior.
  - **Selector de 4 Paletas Corporativas (`SCHOOL_THEME_PRESETS`):**
    1. **Poisson Predeterminado:** Azul Marino (`#172554`), Azul Cielo (`#0284c7`) y Rosado (`#db2777`).
    2. **Pacífico Esmeralda:** Verde Bosque (`#064e3b`), Turquesa (`#0d9488`) y Ámbar (`#f59e0b`).
    3. **Océano Profundo:** Pizarra Oscuro (`#0f172a`), Azul Cielo (`#0284c7`) y Cian (`#06b6d4`).
    4. **Costa Coral:** Índigo (`#1e1b4b`), Azul Rey (`#2563eb`) y Coral (`#f97316`).
- **A. Precios de Venta al Alumno (`Ingresos Caja`):** Precio Clase Individual (`1 pax`), Clase Grupal (`Base 2 pax`), Adicional por Alumno Extra en Grupo y Curso Completo (`Pack 8 clases`).
- **B. Tarifas de Pago a Instructores (`Nómina Staff`):** Honorario exacto por Clase Individual, Grupal, Bono por alumno extra y Sesión de Curso, respetando la inmutabilidad financiera de clases ya cerradas.
- **C. Tarifas de Arriendo de Equipamiento (`rental_rates`):** Precio por hora y habilitación para **Tabla de Surf**, **Traje de Surf**, **Bodyboard** y **Aletas**.

---

## 2.- Módulo 02: Fila de Asistencia (Control de Personal y Prioridad FIFO)

1. **Panel de Check-In (1 clic):** Registro de llegada de instructores (`Diego`, `Jose`, `Vitoco`, `Caco`, `Alfred`).
2. **Ordenamiento Automático por Hora de Llegada:** Posición en la fila (`#1`, `#2`, `#3`) según minuto exacto de ingreso.
3. **Visualización de Carga Horaria del Día:** Muestra prioridad, hora de llegada, clases asignadas hoy y estado (`EN TURNO` vs `AUSENTE`).
4. **Retención Histórica de 60 Días:** En `public.instructor_attendance`, el historial se conserva por 2 meses y luego se depura automáticamente.

---

## 3.- Módulo 03: Ingreso de Clase (Registro Operativo en 3 Pasos)

- **Paso 01 — Naturaleza de la Clase:** Selección de modalidad (**Individual** o **Grupal**) y categoría (**Clase Única** o **Curso**).
- **Paso 02 — Finanzas y Cobro:** Subtotal automático, descuento manual opcional y medio de pago (**Transferencia**, **Efectivo** o **Tarjeta**).
- **Paso 03 — Asignación, Ficha del Alumno y Seguridad:**
  - Horario inteligente (`+1 hr 15 min`), sugerencia automática del instructor `#1` libre en fila y validación anti-choque de horarios.
  - **Alerta de Seguridad por Última Luz del Día (Ocaso)** y **Confirmación por WhatsApp en 1 clic**.

---

## 4.- Módulo 04: Cierre Diario Consolidado (Clases + Arriendos)

Mantiene un **Silo Financiero estricto** donde el 100% de los arriendos ingresa a la utilidad neta de la escuela sin alterar la nómina de instructores:

1. **4 Indicadores Financieros Principales (KPIs):**
   - **Caja Clases (Hoy)** · **Caja Arriendos (Hoy)** · **Total a Repartir (Staff)** · **Ganancia Neta Total**.
2. **Leaderboard de Instructores (Liquidación Diaria):** Tabla auditable con monto exacto a transferir a cada profesor.
3. **Distribución por Medio de Pago y por Tipo de Clase.**
4. **Sección 3B — Métricas y Distribución de Arriendos de Equipamiento:** Total arriendos hoy, equipos entregados, horas totales arrendadas, ticket promedio y barras horizontales por tipo de equipo (`Tabla de Surf`, `Traje de Surf`, `Bodyboard`, `Aletas`).
5. **Rendimiento Semanal y Exportación Contable a Excel (`⬇ Exportar Caja CSV`).**

---

## 5.- Módulo 05: Gestión de Arriendos de Equipamiento y Control de Devoluciones

1. **A. Formulario de Nuevo Arriendo y Garantía Digital:** Selección de equipo, unidades, horas, cálculo de hora estimada de retorno y **captura comprimida de fotografía de Cédula de Identidad** (resguardada en bucket privado `id-cards` de Supabase Storage).
2. **B. Monitor de Arriendos Activos en Tiempo Real:** Reloj independiente con semáforo de estado (**EN TIEMPO** vs **ATRASADO**), modal de inspección de carnet con URL firmada temporal y botón **"Devolución Recibida"**.

---

## 6.- Barra de Condiciones del Mar y Clima en Tiempo Real (`EnvironmentBar`)

- **🌊 Mareas del Día (Calibradas a Datum NRS / SHOA):** Las 4 mareas diarias con **Pleamar (`🔵`)** y **Bajamar (`📉`)**.
- **🏄‍♂️ Oleaje (Swell):** Altura en metros y periodo en segundos (`s`).
- **💨 Viento:** Velocidad en nudos (`kts`) y dirección cardinal.
- **☀️ Luz Solar (Amanecer y Ocaso):** Conectado con el validador de seguridad del Módulo 03.

---

## 7.- Plan de Implementación y Propuesta Comercial

| Etapa | Periodo / Modalidad | Qué Incluye | Inversión |
| :--- | :--- | :--- | :--- |
| **Etapa 1: Piloto en Terreno** | **Noviembre 2026** *(1 mes de prueba)* | Uso completo del sistema (5 módulos + barra ambiental) en la operación real de la escuela. | **$25.000 CLP** *(solo costo de mantención y servidores)* |
| **Etapa 2: Contrato Beta + Mejoras a Medida** | **Mes siguiente al piloto** *(1 mes)* | Implementación de **ajustes y mejoras personalizadas** según el feedback real tras el mes de prueba + soporte prioritario. | **$100.000 CLP** *(100% abonables al contrato anual)* + **$25.000 CLP** *(mantención y servidores)* |
| **Etapa 3: Contrato Anual Definitivo** | **Licencia Anual** *(Facilidad Post-Temporada)* | Licencia anual completa con base de datos multitenant aislada. Saldo de **$400.000** pagadero en **2 cuotas post-temporada** (Enero y Marzo). | **$400.000 CLP** *(en 2 cuotas: Ene / Mar)* + **$25.000 CLP/mes** *(mantención y servidores)* |
