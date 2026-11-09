# SurfOp ERP — Design System
> Un póster Bauhaus clavado en la recepción de una escuela de surf: papel crema, figuras en colores primarios y tipografía geométrica de gran tamaño.

**Tema:** claro · **Origen:** Style Reference "Earlydog" (Bauhaus), adaptado a la estructura del ERP SurfOp.

La estética (paleta, tipografía, formas, botones pill, superficies planas) se toma de la referencia **sin cambios**. Lo único que se adapta es su **aplicación** a un ERP operativo con 5 módulos, formularios, tablas y KPIs, en lugar de una landing editorial.

> [!IMPORTANT]
> Este sistema es solo visual. Ningún cambio de diseño puede tocar la lógica de negocio (`SurfSchoolContext`, `utils/calculations`), Supabase ni el esquema de base de datos.

---

## 1. Tokens

### Colores
| Nombre | Valor | Clase Tailwind | Rol en SurfOp |
|---|---|---|---|
| Cream Paper | `#fff9f0` | `bg-cream-paper` | Lienzo de la app, tarjetas, inputs y relleno de botones |
| Midnight Ink | `#000609` | `text-midnight-ink`, `border-midnight-ink` | Texto, títulos, bordes de 1px, marco de botones y tablas |
| Signal Blue | `#0a65db` | `text-signal-blue` | **Único acento funcional**: eyebrows, segunda línea de títulos, módulo activo, foco de inputs, iconos |
| Ember Red | `#ee4623` | `ember-red` | Ilustración + **excepción funcional**: estados críticos (arriendo atrasado, errores) |
| Saffron Yellow | `#ffd23f` | `saffron-yellow` | Solo ilustración y series de gráficos |
| Blush Pink | `#f4c6c6` | `blush-pink` | Solo ilustración y series de gráficos |

### Tipografía
| Familia | Fuente real | Sustituto usado | Uso |
|---|---|---|---|
| `font-display` | degular-display 700 | **Space Grotesk 700** | Todos los títulos (h1, h2, h3, KPI grandes) |
| `font-usual` | usual 400/700 | **Inter 400/700** | Cuerpo, navegación, botones, labels, tablas |

| Rol | Tamaño | Line height | Tracking | Clase |
|---|---|---|---|---|
| caption (mínimo absoluto) | 16px | 1.78 | 0 | `text-caption` |
| body | 18px | 1.82 | 0 | `text-body` |
| subheading | 22px | 1.82 | 0 | `text-subheading` |
| heading-xs *(adaptación ERP)* | 32px | 1.2 | +0.3px | `text-heading-xs` |
| heading-sm | 52px | 1.23 | +0.47px | `text-heading-sm` |
| heading | 80px | 1.1 | +1.04px | `text-heading` |
| display | 116px | 1.03 | +2.2px | `text-display` |

- Nunca texto bajo 16px. Nunca tracking negativo en títulos.
- Solo dos pesos: 400 y 700.
- Cifras (montos, horas, teléfonos) con `ed-num` (tabular-nums + 700).

### Espaciado y formas
- Unidad base 4px · densidad amplia.
- Ancho máximo de página: **1200px** (`max-w-page`).
- Separación entre secciones mayores: **96px** desktop / 56px móvil (`ed-stack`).
- Padding de tarjeta: **32px**.
- Radios: tarjetas, inputs, tablas e ilustraciones **0px**; botones y tags **9999px**.
- Elevación: **cero**. Sin sombras, degradados ni brillos.

---

## 2. Clases de componente (`src/index.css`)

| Clase | Componente de referencia | Uso en SurfOp |
|---|---|---|
| `ed-page` | Columna central 1200px | Contenedor de cada vista |
| `ed-stack` | Section gap 96px | Pila vertical de secciones de un módulo |
| `ed-h1` | Section Heading 52px | Título de módulo |
| `ed-display` | Hero Display 80px | Solo pantalla de Login |
| `ed-h2` | Sub-display reducido 32px | Título de bloque (Paso 01, Sección A…) |
| `ed-h3` | Subheading 22px display | Título de tarjeta / subsección |
| `ed-eyebrow` | Ghost link con triángulo | Etiqueta azul sobre títulos |
| `ed-body` / `ed-measure` | Body Paragraph 18px, 480px | Descripciones |
| `ed-caption` / `ed-muted` | Caption 16px | Texto secundario |
| `ed-card` | Card 0px, borde ink, 32px | Contenedores de formularios, tablas y KPIs |
| `ed-card-ink` | Superficie invertida | Solo totales finales (ganancia neta, total a pagar) |
| `ed-btn` | Outlined Pill Button | **Todas** las acciones. Hover = relleno ink |
| `ed-btn-sm` | Pill compacto | Acciones en filas de tabla |
| `ed-btn-active` | Pill relleno ink | Opción seleccionada en toggles |
| `ed-btn-danger` | Pill con borde Ember Red | Acciones destructivas |
| `ed-link` | Ghost Link ▸ | Navegación secundaria, "Salir ▸" |
| `ed-tag`, `ed-tag-blue`, `ed-tag-ink`, `ed-tag-alert` | Pill tag | Estados (En curso, Pagado, Atrasado) |
| `ed-label`, `ed-input`, `ed-help` | — | Formularios (0px radius, borde ink, foco azul) |
| `ed-table` | — | Tablas sin relleno de cabecera, regla ink de 1px |
| `ed-notice`, `ed-notice-blue`, `ed-notice-alert` | — | Mensajes de éxito/aviso/error |
| `ed-bar-track` | — | Pista de barras de gráficos |

### Componentes React (`src/components/ui/`)
- **`BauhausArt`** — Geometric Illustration Block (eye, círculo, tablero 8×8, starburst, semicírculos, triángulos). Variantes: `login`, `config`, `attendance`, `newclass`, `closing`, `rentals`, `mark`.
- **`ModuleHeader`** — Two-Column Feature Section: texto (eyebrow + h1 bicolor + body) a la izquierda e ilustración a la derecha.

---

## 3. Layout de la aplicación

- **Riel izquierdo fijo (desktop):** ícono hamburguesa de dos barras, glifo geométrico y wordmark vertical con el nombre comercial de la escuela (`schoolBranding.displayName`).
- **Barra superior:** navegación de 5 módulos como links usuales 16px bold; el activo va en Signal Blue con subrayado de 2px. A la derecha, acciones secundarias como pills y `Salir ▸` como ghost link.
- **Cabecera de módulo:** `ModuleHeader` (título 52px bicolor: primera parte ink, segunda parte Signal Blue).
- **Cuerpo:** secciones en `ed-card` separadas por 56–96px, sin divisores extra.

---

## 4. Adaptaciones al contexto ERP (no estéticas)

1. **Tarjetas sí, pero planas.** La referencia evita grillas de tarjetas; un ERP las necesita para formularios y tablas. Se usan `ed-card` de 0px, borde ink de 1px y sin sombra.
2. **Escala intermedia de 32px** (`heading-xs`) para títulos de bloque, porque 52px repetido en cada tarjeta satura la pantalla operativa.
3. **Ember Red como estado crítico.** Es la única excepción a "un solo color funcional": se usa en arriendos atrasados y errores de validación, donde la seguridad operativa lo requiere.
4. **Gráficos de datos** pueden usar la paleta completa de ilustración (ink, blue, red, yellow, pink), ya que funcionan como ilustración informativa.
5. **Iconos lucide** se permiten como marcas pequeñas (16–20px, trazo ink o Signal Blue) para la usabilidad de recepción.
6. **Branding por escuela:** el monograma y la paleta de `schoolBranding` siguen existiendo en datos (`--brand-*`). En la interfaz aparecen en el glifo del riel lateral, sin alterar la paleta funcional.

---

## 5. Do's & Don'ts

**Do**
- `font-display` 700 en todos los títulos, con tracking positivo.
- Botones siempre pill outlined (`ed-btn`).
- Paleta de UI restringida a cream, ink y blue.
- Cuerpo 18px/1.82 en descripciones y 16px/1.78 como mínimo en datos.

**Don't**
- Nada de `rounded-*` en tarjetas, inputs ni ilustraciones.
- Nada de botones rellenos de color (excepto el estado activo ink).
- Nada de `shadow-*`, `bg-gradient-*` ni brillos.
- Nada de texto bajo 16px (`text-xs`, `text-sm`, `text-[10px]`…).
- Nada de fotografía ni emojis.
