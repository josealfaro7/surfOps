# POISSON SurfOps — ERP de Gestión Operativa y Liquidación para Escuela de Surf

**Demo en vivo:** [https://josealfaro7.github.io/surfOps/](https://josealfaro7.github.io/surfOps/)  
**Repositorio:** [https://github.com/josealfaro7/surfOps](https://github.com/josealfaro7/surfOps)

---

## 1. Descripción General

**POISSON SurfOps** es un sistema de planificación y gestión operativa interna (*Frontend ERP*) diseñado en **React + Tailwind CSS** para resolver la operación diaria en playa de una escuela de surf:

1. **Parametrización dinámica (*White-canvas*)** protegida por PIN administrativo (`0000`).
2. **Control de asistencia por orden de llegada** que construye una **Fila Virtual** automática de instructores.
3. **Registro secuencial de clases** con cálculo automático de cobro, asignación inteligente de instructores sin choque de horario, cálculo silencioso (*background*) de honorarios de staff, ficha de contacto de emergencia y envío directo de comprobante por **WhatsApp (`wa.me`)** al teléfono del alumno.
4. **Cierre diario de caja y nómina** con **Leaderboard de instructores**, gráficos de distribución diaria, evolución semanal en tiempo real y exportación estructurada a **CSV (`caja_diaria_poisson.csv`)**.

---

## 2. Arquitectura de Estado Global en Memoria (`SurfSchoolContext`)

El sistema opera 100% en memoria mediante React Context (`src/context/SurfSchoolContext.jsx`) manteniendo tres entidades maestras sincronizadas en tiempo real e inspeccionables desde el botón **"Inspeccionar Memoria"** en la barra superior:

| Objeto de Estado | Descripción | Propiedades Clave |
| :--- | :--- | :--- |
| **`SchoolConfig`** | Matriz comercial y de nómina configurable por el administrador. | `priceIndividual`, `priceGroupBase`, `priceGroupExtraPax`, `priceCoursePack8`, `payIndividual`, `payGroupBase`, `payGroupExtraPax`, `payCourseSingleClass` |
| **`Instructors`** | Lista de instructores del staff (**Diego, Jose, Vitoco, Caco, Alfred**) y su estado de asistencia. | `id`, `name`, `checkedIn`, `checkInTime`, `checkInTimestamp` |
| **`DailyClasses`** | Registro operativo, financiero y de contacto de todas las clases agendadas en la jornada. | `id`, `date`, `startTime`, `endTime`, `modality`, `pax`, `category`, `subtotal`, `discount`, `paymentMethod`, `finalTotal`, `instructorId`, `wasSuggestedByQueue`, `studentName`, `studentPhone`, `studentEmail`, `emergencyContactName`, `emergencyContactPhone`, `instructorPay` |

---

## 3. Módulos y Funcionalidades del Sistema

### Módulo 01 · Configuración de Precios y Tarifas (`Module1Config.jsx`)
* **Bloqueo de Seguridad por PIN (`0000`):** Al ingresar al módulo, solicita un PIN numérico de 4 dígitos (`0000`) antes de permitir ver o editar las reglas financieras. Incluye botón **"Bloquear"** para volver a proteger la vista manualmente.
* **A. Precios de Venta al Alumno (Ingresos Caja):**
  * Precio Clase Individual (1 pax).
  * Precio Clase Grupal (Base para 2 pax).
  * Adicional por alumno extra en grupo (a partir del 3er integrante).
  * Precio Curso Completo (Pack 8 clases).
* **B. Tarifas de Pago a Instructores (Nómina Staff):**
  * Pago por Clase Individual.
  * Pago por Clase Grupal (Base 2 pax).
  * Bono por cada alumno extra sobre 2 pax.
  * Pago por 1 clase perteneciente a un Curso (Pack 8).
* **Recálculo Sincronizado:** Al guardar cambios en `SchoolConfig`, el sistema actualiza automáticamente las liquidaciones de las clases registradas en la jornada.

---

### Módulo 02 · Control de Asistencia y Fila Virtual (`Module2Attendance.jsx`)
* **Panel de Check-in Rápido:** Bloques rectangulares interactivos para el staff (**Diego, Jose, Vitoco, Caco y Alfred**).
* **Timestamp de Llegada:** Al activar un instructor, el sistema captura su hora exacta de entrada y lo incorpora a la **Fila Virtual (`virtualQueue`)**.
* **Ordenamiento Automático:** La fila se ordena estrictamente desde el instructor que llegó más temprano (`#1 [Prioridad #1]`) hasta el que llegó más tarde, mostrando en tiempo real cuántas clases y qué bloques horarios tiene asignados cada uno.

---

### Módulo 03 · Flujo de Ingreso de Nueva Clase (`Module3NewClass.jsx`)
Diseñado bajo una estructura de **columna vertical única** dividida en 3 pasos secuenciales:

1. **Paso 01 — Naturaleza de la Clase:**
   * Selección de **Modalidad**: `Individual (1 PAX)` o `Grupal (2+ PAX)`. Si se elige Grupal, despliega un selector numérico con botones `−` / `+` para indicar la cantidad de personas (mínimo 2).
   * Selección de **Categoría**: `Clase Única (1 SESIÓN)` o `Curso (PACK 8 CLASES)`.
2. **Paso 02 — Finanzas y Cobro:**
   * **Subtotal Automático:** Calculado en vivo según `SchoolConfig`, modalidad, cantidad de alumnos y categoría.
   * **Descuento Manual:** Campo numérico opcional para aplicar rebajas a grupos o familias.
   * **Selector de Medio de Pago:** Bloques de selección rápida entre `Transferencia`, `Efectivo` y `Tarjeta`.
   * **Total Final (Ingreso a Caja):** `Subtotal Automático − Descuento`.
3. **Paso 03 — Asignación, Ficha del Alumno y Contacto de Emergencia:**
   * **Cálculo Automático de Duración (+1h 15m):** Al ingresar o seleccionar la **Hora de Inicio** (ej. `10:30`), el sistema calcula automáticamente la **Hora de Término sumando 75 minutos (`11:45`)** sin requerir cálculo manual. Incluye botones de bloques rápidos (`09:00–10:15`, `10:30–11:45`, `12:00–13:15`, `15:00–16:15`, `16:30–17:45`).
   * **Asignación Inteligente de Instructor:** El selector sugiere por defecto al **Instructor `#1` de la Fila Virtual que no tenga choque de horario** en ese bloque (`getSuggestedInstructorForSlot`). Si el `#1` está ocupado en ese horario, sugiere automáticamente al `#2` libre e informa el motivo. Permite selección manual para alumnos de curso o agendados, alertando si existe colisión horaria.
   * **Ficha del Alumno y Emergencia:**
     * Nombre Completo del Alumno.
     * Teléfono / WhatsApp del Alumno.
     * Correo Electrónico.
     * Nombre y Teléfono de Contacto de Emergencia.
4. **Cálculo en Segundo Plano (*Background Math*) y Confirmación por WhatsApp:**
   * Al guardar la clase, el sistema calcula internamente cuánto gana el instructor (`instructorPay`) sin mostrarlo en pantalla para proteger la privacidad frente al cliente.
   * Despliega un **Banner de Éxito** en la parte superior con el botón **"Enviar Confirmación por WhatsApp"**, el cual normaliza el número telefónico del alumno y abre `https://wa.me/<telefono_alumno>?text=` con el mensaje precompilado:
     ```text
     🏄‍♂️ *Confirmación de Clase - Poisson Surf School*
     👤 Alumno: [Nombre]
     📅 Horario: [Inicio] - [Fin]
     👨‍🏫 Instructor: [Nombre]
     💰 Total a pagar: $[Total]
     ```
   * También permite reenviar la confirmación en cualquier momento desde la tabla **Registro Operativo del Día**.

---

### Módulo 04 · Cierre Diario, Leaderboard y Reportes (`Module4ClosingDashboard.jsx`)
* **Resumen Ejecutivo del Día:**
  * **Caja Total Escuela:** Suma del `Total Final` de todas las clases impartidas hoy.
  * **Total a Repartir (Staff):** Suma total de honorarios generados por los instructores hoy.
  * **Ganancia Neta Escuela:** `Caja Total Escuela − Total a Repartir (Staff)`.
* **Leaderboard de Instructores (Liquidación Diaria):**
  * Tabla corporativa con *zebra striping* ordenada de mayor a menor rendimiento diario (`#1 Líder Día`, `#2`, `#3`...).
  * Muestra barra de participación, recaudación generada para la escuela, cantidad de clases dictadas, desglose por tipo (ej. `3 Individuales, 1 Grupal [3 pax], 1 de Curso`) y el **Monto Exacto a Pagar Hoy**.
  * Al hacer clic sobre cualquier instructor, despliega el detalle horario clase por clase para auditoría.
* **Gráficos Operativos del Día y de la Semana:**
  * **Distribución por Medio de Pago (Hoy):** Barras comparativas y porcentajes de ingresos en `Transferencia`, `Tarjeta` y `Efectivo`.
  * **Distribución por Tipo de Clase (Hoy):** Comparativa entre `Individual`, `Grupal` y `Curso Pack 8`.
  * **Rendimiento Semanal (Lunes a Domingo):** Gráfico de columnas apiladas que compara facturación diaria, nómina de instructores y ganancia neta, sincronizando la barra del día actual (**HOY**) en vivo con las clases registradas.
* **Exportación Estructurada a CSV (`⬇ Exportar Caja (CSV)`):**
  * Genera y descarga en el navegador el archivo **`caja_diaria_poisson.csv`** (con codificación UTF-8 BOM compatible con Microsoft Excel) incluyendo las 17 columnas operativas y financieras:
    `ID Clase, Fecha, Hora Inicio, Hora Término, Horario Clase, Modalidad, Instructor, Alumno, Teléfono Alumno, Correo Alumno, Contacto Emergencia, Teléfono Emergencia, Medio de Pago, Subtotal, Descuento, Total Caja, Pago Instructor`.

---

## 4. Lógica Matemática (`src/utils/calculations.js`)

### Cobro al Alumno (`calculateStudentSubtotal`)
* **Clase Única Individual (1 pax):** `priceIndividual`
* **Clase Única Grupal ($N \ge 2$ pax):** `priceGroupBase + (N - 2) * priceGroupExtraPax`
* **Curso Completo (Pack 8 clases):** `priceCoursePack8 * N`

### Pago al Instructor en Background (`calculateInstructorPayment`)
* **Clase Individual (1 pax):** `payIndividual`
* **Clase Grupal ($N \ge 2$ pax):** `payGroupBase + (N - 2) * payGroupExtraPax`
* **Clase de Curso (Pack 8):** `payCourseSingleClass` (más bono por alumno extra si es grupal con $N > 2$)

---

## 5. Stack Tecnológico y Ejecución Local

* **Frontend Framework:** React 18 + Vite 6
* **Estilos:** Tailwind CSS 3 (Diseño ERP plano, geometría rectangular `rounded-none` / `rounded-sm`, paleta Azul Marino `blue-950`, Celeste `sky-500` y acento complementario Rosado `pink-600`)
* **Iconografía:** `lucide-react`
* **Despliegue:** `gh-pages`

### Comandos Disponibles

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo local
npm run dev

# 3. Compilar versión de producción
npm run build

# 4. Publicar en GitHub Pages (rama gh-pages)
npm run deploy
```
