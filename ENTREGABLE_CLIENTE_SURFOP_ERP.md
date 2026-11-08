# SurfOp ERP — Dossier de Funcionalidades y Guía Operativa Paso a Paso

**Sistema de Gestión Operativa, Financiera y de Seguridad Marina para Escuelas de Surf**  
*Documento de Presentación para Clientes · Demo en vivo: https://josealfaro7.github.io/surfOps/*

---

## Resumen Ejecutivo: ¿Qué resuelve SurfOp ERP?

**SurfOp ERP** centraliza en una sola pantalla toda la operación diaria de una escuela de surf, eliminando planillas desordenadas, errores de cobro en recepción, discusiones por asignación de turnos entre instructores y cierres de caja manuales al final de la jornada.

| Pilar Operativo | Problema Habitual en Escuelas | Solución en SurfOp ERP |
| :--- | :--- | :--- |
| **Control Tarifario** | Cambios no autorizados de precios o confusión en tarifas grupales. | **Módulo 01 con PIN de Administrador** y motor de cálculo automático. |
| **Equidad en Turnos** | Malos entendidos entre profesores por quién recibe más o menos clases. | **Fila Virtual FIFO (Orden de Llegada)** con bloqueo automático de choques de horario. |
| **Recepción Ágil** | Demora al anotar alumnos, calcular descuentos y avisar por WhatsApp. | **Ingreso en 3 pasos**, contacto de emergencia y **confirmación WhatsApp en 1 clic**. |
| **Cierre Transparente** | Cuadratura lenta de efectivo/transferencias y liquidación de sueldos. | **Dashboard en tiempo real**, Leaderboard de profesores y **exportación a Excel (CSV)**. |
| **Seguridad en el Agua** | Agendar clases sin considerar marea, viento o falta de luz solar. | **Barra Ambiental en vivo (SHOA/Open-Meteo)** y **alerta de límite de ocaso**. |

---

## 1.- Configuración (Parámetros Financieros y Seguridad)

En el módulo de configuración la administración ingresa las tarifas que se cobran al alumno por clase o curso y cuánto se le paga a cada instructor por sesión realizada.

- **Seguridad con PIN de Administrador:** Este módulo permanece protegido con un **PIN de seguridad de 4 dígitos**, para que únicamente el administrador o dueño de la escuela pueda modificar precios o sueldos.
- **A. Precios de Venta al Alumno (`Ingresos Caja`):**
  - **Precio Clase Individual (1 pax):** Tarifa estándar para una sesión personalizada.
  - **Precio Clase Grupal (Base 2 pax):** Tarifa base para un grupo de 2 personas.
  - **Adicional por Alumno Extra en Grupo:** Monto automático que se suma por cada integrante extra sobre 2 personas.
  - **Precio Curso Completo (Pack 8 clases):** Valor comercial del programa formativo completo.
- **B. Tarifas de Pago a Instructores (`Nómina Staff`):**
  - Define el honorario automático del profesor para clases individuales, grupales y sesiones de curso.
- **Controles Administrativos:** Botón para **Restaurar Valores Base** y botón **Bloquear** para cerrar el panel tras realizar ajustes.

---

## 2.- Fila de Asistencia (Control de Personal y Prioridad)

Con este módulo puedes **priorizar y ordenar de forma justa y transparente la asignación de clases a los profesores**, evitando malos entendidos por profesores con más o menos clases asignadas.

- **1. Panel de Check-In (Activar / Desactivar en 1 clic):** Al llegar a la escuela, cada instructor (`Diego`, `Jose`, `Vitoco`, `Caco`, `Alfred`) se activa con un clic registrando su hora exacta de entrada.
- **2. Orden Vigente en Fila Virtual (Prioridad de Sugerencia):**
  - Ordena automáticamente a los profesores en turno (`#1`, `#2`, `#3`) según su hora de llegada.
  - Muestra la **Carga Horaria Hoy** de cada instructor con el detalle de sus bloques horarios ocupados (ej. `4 clases: 09:00-10:15, 10:30-11:45...`).
  - Alimenta directamente el selector inteligente del Módulo 3 para sugerir al profesor que corresponde por turno.

---

## 3.- Ingreso de Clase (Flujo Guiado en 3 Pasos + Registro del Día)

Permite registrar una clase completa en segundos a través de tres bloques estructurados:

- **A. Paso 01 — Naturaleza de la Clase:**
  - Primero identificamos si es clase **Individual** o **Grupal** (y número de alumnos), y si corresponde a **Clase Única** o **Curso**.
  - Con esa selección, el sistema **calcula automáticamente el precio del servicio para el cliente y cuánto se le debe pagar al profesor**.
- **B. Paso 02 — Finanzas y Cobro:**
  - Especificamos el **Medio de Pago** (`Transferencia`, `Efectivo` o `Tarjeta`).
  - Incluye la opción de ingresar un **Descuento Manual** para el cliente en caso de ser necesario, actualizando de inmediato el **Total Final (Ingreso a Caja)**.
- **C. Paso 03 — Asignación, Ficha del Alumno y Emergencia:**
  - **Horario y Duración Automática (`+1 hr 15 min`):** Seleccionamos la hora de inicio y el sistema calcula automáticamente la hora de término.
  - **Alerta de Seguridad por Última Luz (Ocaso):** Si la clase termina después de la puesta de sol, el campo se marca en rojo alertando al recepcionista.
  - **Instructor Asignado Sin Choques:** Sugiere al profesor con prioridad #1 y bloquea automáticamente a los instructores que ya tienen clase en ese bloque horario.
  - **Ficha del Alumno y Contacto de Emergencia:** Registra Nombre, Teléfono/WhatsApp, Correo y los datos de **Contacto de Emergencia** (nombre y teléfono).
  - **Confirmación por WhatsApp en 1 Clic:** Al guardar la clase, permite enviar el comprobante directo al WhatsApp del alumno con todos los detalles de su reserva.
- **Registro Operativo del Día (Tabla Inferior):** Muestra en vivo todas las clases agendadas durante el día con sus horarios, datos de contacto, emergencia, instructor asignado y monto en caja.

---

## 4.- Cierre Diario (Resumen Financiero, Leaderboard y Métricas)

En el cierre diario visualizamos un resumen ejecutivo de clases, ingresos de la escuela y liquidación de pagos para los profesores. **Esta página es flexible y se puede ajustar según las visuales o métricas específicas que necesite cada escuela.**

- **Resumen Superior de Caja (3 KPIs):**
  - **Caja Total Escuela:** Ingresos brutos del día y total de clases registradas.
  - **Total a Repartir (Staff):** Nómina acumulada a pagar a los instructores hoy.
  - **Ganancia Neta Escuela:** Utilidad limpia del día (`Ingresos Brutos − Nómina de Instructores`).
- **Leaderboard de Instructores (Liquidación Diaria):**
  - Muestra la posición, cantidad de clases, desglose operativo (*Individuales, Grupales, Cursos*) y el **Monto Exacto a Pagar Hoy** a cada profesor. Al hacer clic en un profesor, se despliega el detalle de cada clase realizada.
- **Gráficos de Distribución y Rendimiento Semanal:**
  - **Distribución por Medio de Pago (Hoy):** Cuadratura exacta de Transferencia, Tarjeta y Efectivo.
  - **Distribución por Tipo de Clase (Hoy):** Participación en ingresos de clases Individuales, Grupales y Cursos Pack.
  - **Rendimiento Semanal (Lunes a Domingo):** Comparativa gráfica de ingresos diarios con totales de Facturación Semanal, Nómina Semanal Staff y Ganancia Neta Semanal.
- **Exportación Contable (`⬇ Exportar Caja CSV`):** Descarga inmediata de la planilla del día lista para abrir en Excel o Google Sheets.

---

## 5.- Extras (Barra de Condiciones del Mar en Tiempo Real)

En la barra superior persistente visualizamos en tiempo real las condiciones oceanográficas y solares según la ubicación geográfica de la escuela:

- **🌊 Mareas (Calibradas con SHOA / NRS):** Muestra los 4 hitos del día indicando **Bajamar (`📉`)** y **Pleamar (`🔵`)** con su hora exacta y altura en metros (ej. `02:41 (0.30m)`, `08:44 (1.23m)`, `14:58 (0.21m)`, `21:17 (1.32m)`).
- **🏄‍♂️ Oleaje:** Altura de la ola en metros y periodo en segundos (ej. `1.5m (8s)`).
- **💨 Viento:** Velocidad en nudos y dirección cardinal en español (ej. `6kts Oeste`).
- **☀️ Luz Solar:** Hora exacta de amanecer y ocaso (`06:46 - 20:11 hrs`), vinculada al sistema de alertas de seguridad al agendar clases por la tarde.

---

## 6.- Plan de Pago y Modalidad de Implementación

1. **Etapa 1 — Mes de Prueba en Terreno (Noviembre 2026):**
   - Nuestro plan comienza con pruebas reales de funcionamiento en la escuela durante **noviembre de 2026**.
   - Durante este mes piloto, el servicio solo tiene un costo de **\$25.000 CLP**, correspondiente únicamente a gastos de mantención y servidores.
2. **Etapa 2 — Contrato Beta con Mejoras a Medida (1 Mes):**
   - Posteriormente pasamos a un **Contrato Beta por un mes**, que incluye la **implementación de mejoras y ajustes personalizados** a partir del feedback de los usuarios durante el mes de prueba.
   - Este servicio Beta tiene un valor de **\$100.000 CLP mensuales** (**100% abonables** al contrato anual siguiente), más **\$25.000 CLP** por costos de mantención, atención y servidores.
3. **Etapa 3 — Contrato Anual con Facilidad Post-Temporada:**
   - Finalizado el mes Beta, se pasa al **Contrato Anual**, cuyo valor es de **\$500.000 CLP menos los \$100.000 CLP ya abonados en el mes anterior** (saldo de **\$400.000 CLP**).
   - Este saldo se facilita en **2 cuotas post-temporada**:
     - **\$200.000 CLP en Enero**
     - **\$200.000 CLP en Marzo (post-temporada)**
   - Lo anterior más **\$25.000 CLP mensuales** por concepto de mantención continua y servidores.
