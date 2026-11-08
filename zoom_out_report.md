# Stage 5 — Initial Zoom Out Review Report (`zoom_out_report.md`)

*   **Documento Evaluado:** [design_draft.md](./design_draft.md) (Líneas 1–214)
*   **Estándar Aplicado:** `zoom-out-standard.md` + Principios TRIZ (`egm-inventive-catalyst`)
*   **Revisores (Goldfish):** `egm-zoom-out`, `egm-inventive-catalyst`

---

## Parte 1: Evaluación de Arquitectura y Simplicidad (`egm-zoom-out`)

El documento de diseño cumple con suficiencia de contexto, aborda directamente los tres problemas operativos de raíz (configuración centralizada de tarifas por hora con PIN en Módulo 01, registro con captura comprimida de Carnet de Identidad en Módulo 05 y monitor de devoluciones con detección de atraso) y mantiene alineación con la arquitectura React Context del repositorio. No se detectan bloqueantes (`🔴 Blocker`).

### 1. 🟡 Major — Redundancia en el modelo temporal y reinvención de utilidades de hora
*   **Alcance afectado**: Sección *Modelos de Datos — `surfops_active_rentals`* (líneas 100–103), *Lógica de Cálculo de Devolución y Atraso* (líneas 117–123) y *Detailed Implementation Plan — `./src/utils/calculations.js`* (línea 157).
*   **Racional de Simplicidad (Leverage Existing & YAGNI)**:
    1. El código actual ya cuenta con `timeToMinutes` y `addMinutesToTime` en [`./src/utils/calculations.js`](./src/utils/calculations.js), además de `getBaseTimestamp` en [`./src/context/SurfSchoolContext.jsx`](./src/context/SurfSchoolContext.jsx).
    2. Proponer una nueva función `addHoursToTime(timeStr, hoursToAdd)` que vuelve a parsear manualmente `HH:MM` desde cero duplica la lógica existente.
*   **Recomendación concreta**: Reutilizar `timeToMinutes` y `addMinutesToTime` dentro de `addHoursToTime` para mantener una única fuente de verdad en la aritmética horaria de `./src/utils/calculations.js`.

### 2. 🟢 Nit — Ubicación arquitectónica de `compressImageFileToBase64` en `calculations.js`
*   **Alcance afectado**: Sección *Detailed Implementation Plan — 1. `./src/utils/calculations.js`* (líneas 153–160).
*   **Racional de Simplicidad (Right Placement / Separation of Concerns)**:
    *   Actualmente `./src/utils/calculations.js` contiene exclusivamente funciones puras y síncronas de negocio.
    *   Incluir `compressImageFileToBase64` introduce APIs asíncronas del DOM (`FileReader`, `Image`, `<canvas>`) en un módulo de cálculos numéricos.
*   **Recomendación concreta**: Documentar explícitamente la separación de la sección de utilidades de navegador/DOM respecto de las funciones puras de negocio dentro de `./src/utils/calculations.js`, o encapsular el helper junto al módulo que lo consume.

### 3. 🟢 Nit — Coherencia entre la justificación de la Alternativa B y el Inspector de Estado en `App.jsx`
*   **Alcance afectado**: Sección *Alternatives Considered — Alternativa B* (líneas 133–137) y *Detailed Implementation Plan — 5. `./src/App.jsx`* (líneas 197–203).
*   **Racional de Simplicidad (Minimalist Data Flow & Anti-Patterns)**:
    *   En las líneas 136–137 se rechaza la Alternativa B argumentando que centralizar los arriendos en `SurfSchoolContext` garantiza *"visibilidad completa en el inspector de estado de `App.jsx`"*.
    *   De renderizarse `activeRentals` con `JSON.stringify` directamente en ese panel, las cadenas `idPhotoBase64` (~45–70 KB cada una) contaminarían visualmente el inspector.
*   **Recomendación concreta**: Si se expone `activeRentals` en el inspector de memoria de `./src/App.jsx`, truncar u omitir `idPhotoBase64` al serializar (ej. `"[Base64 JPEG Comprimido]"`).

---

## Parte 2: Evaluación TRIZ de Contradicciones de Sistema (`egm-inventive-catalyst`)

### 4. 🟡 Major — Acoplamiento de Blobs Base64 en el Estado Transaccional vs. Rendimiento de Serialización y Resiliencia de `localStorage`
*   **Alcance afectado**: Líneas 65–73, 88–115, 133–137, 143–144 y 167–171 de [design_draft.md](./design_draft.md).
*   **Contradicción**:
    *   **Parámetro que mejora**: Disponibilidad inmediata de la foto del Carnet de Identidad vinculada al arriendo.
    *   **Parámetro que se degrada**: Costo de re-serialización síncrona (`JSON.stringify`) de todas las fotos en cada cambio de estado y riesgo de pérdida silenciosa si un `try/catch` pasivo ignora `QuotaExceededError`.
*   **Resolución Inventiva Propuesta (TRIZ #2 *Extraction*, #1 *Segmentation*, #4 *Beforehand Cushioning*)**:
    *   Si una escritura en `localStorage` lanza `QuotaExceededError`, aplicar un segundo pase de compresión automática (`maxWidth = 360`, `quality = 0.4`, ~12 KB) o separar los blobs pesados, y truncar el campo `idPhotoBase64` en el Inspector de Memoria de `App.jsx`.

### 5. 🟡 Major — Silo Financiero en Módulo 05 vs. Integridad de Caja en el Cierre Diario (Módulo 04)
*   **Alcance afectado**: Línea 38 (`Open Questions — Pregunta 1`) y líneas 65–73 de [design_draft.md](./design_draft.md).
*   **Contradicción**:
    *   **Parámetro que mejora**: Pureza de las métricas de clases e instructores en `Module4ClosingDashboard.jsx`.
    *   **Parámetro que se degrada**: Visibilidad consolidada del total de ingresos de la escuela en el día.
*   **Resolución Inventiva Propuesta (TRIZ #1 *Segmentation* y #8 *Intermediary*)**:
    *   Exponer en `SurfSchoolContext.jsx` un resumen derivado de arriendos (`rentalsSummary`: ingresos por arriendos activos + completados del día) separado de `dailyClasses`, de modo que las métricas de instructores permanezcan intactas y el Módulo 05 (y opcionalmente el Módulo 04) muestre el desglose sin mezclar colecciones.

### 6. 🟢 Nit — Polling por Intervalo (`setInterval` 30s) y Firma Determinista de `addHoursToTime`
*   **Alcance afectado**: Líneas 117–124, 157 y 185–196 de [design_draft.md](./design_draft.md).
*   **Contradicción**:
    *   Actualizar `nowTimestamp` en la raíz de `Module5Rentals.jsx` cada 30 segundos re-renderiza también el formulario de ingreso (Sección A), y `addHoursToTime(timeStr, hoursToAdd)` sin fecha de referencia depende implícitamente de `new Date()`.
*   **Resolución Inventiva Propuesta (TRIZ #5 *Inversion* y #1 *Segmentation*)**:
    *   Aislar el reloj de monitoreo o parametrizar `addHoursToTime(timeStr, hoursToAdd, referenceDate = new Date())` reutilizando las funciones horarias existentes en `./src/utils/calculations.js`.
