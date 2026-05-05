# Ajustes aplicados — Sesión de refinamiento

Lista exhaustiva de cambios realizados sobre `naowee-test-escenarios`, separada por categoría.

---

## 1. Ajustes de UI / Estilos

### Sidebar (paridad con `naowee-test-sidebar-shell`)
- **Easing Apple-style** `cubic-bezier(.32,.72,0,1)` en width / max-width / opacity de los items.
- **Fade escalonado** de labels: opacity primero, después max-width al expandir; al revés al colapsar.
- **Hover/active cuadrado 40×40 vía `::before`** en estado colapsado (cream `#fff3e6` activo, gris `#f5f6fa` hover).
- **Active-bar** con animación de entrada (`activeBarIn` 420ms con scaleY).
- **Tooltip pill** negro flotante para items del sidebar colapsado (nuevo `shared/sidebar-tooltips.js`).
- Sidebar `shell.css` reescrito con la versión refinada del sidebar-shell (635 → 240 líneas portadas 1:1).

### Botón primario (global, `shared/shell.css`)
- **Glow elevation naranja al hover** sin oscurecer el fill: `box-shadow: 0 8px 22px rgba(215,64,9,.32), 0 2px 6px rgba(215,64,9,.18)` + `translateY(-1px)`.
- Aplicado a TODOS los `.naowee-btn--loud` en todas las páginas del shell.
- Override del DS: `:hover` mantiene `background: var(--accent)` (#d74009) en lugar del darker default.

### Tabla de escenarios (`escenario-08-dashboard.html`)
- Headers: 64px/16px regular → **44px/11px UPPERCASE** + letter-spacing.
- IDs: regular 16px primary → **monospace `SF Mono` 13px secondary**.
- Densidad: fila 88px → 80px, gaps internos compactados.

### Modal "Registrar sede o escenario"
- **Width** 576px → **680px** (paridad `.sd-modal` del sidebar-shell).
- **Body**: padding 24px → 20px 24px, gap 24px → 16px.
- **Footer**: padding 16px 24px 24px → 16px 24px, `display:flex; gap:12px`, btns `flex:1`.
- **Map tile filter**: `saturate(.6) brightness(1.06) contrast(.95)` para look blanco/limpio.
- **Map actions**: gap 4px → 12px (paridad `.sd-map-actions`).
- **Section title** (`.reg-section__title`): 12px/600/letter-spacing .2px/#9c9ebf → 11px/700/letter-spacing .4px/#9ca0b8.
- **Animación de entrada**: cambiada de `transform: scale(.92) translateY(24px) → scale(1) translateY(0)` a sólo `opacity` (cualquier transform creaba un nuevo containing block que rompía `position:fixed` de los menus flotantes).

### Pantalla "Mapa de escenarios" (`escenario-13-mapa.html`)
- **Título sin container**: eliminado `padding`, `background`, `border` del `.page-head` — ahora el título sale directo sobre el fondo.
- **Filter toolbar integrado** dentro del `.map-canvas` (mismo card que el mapa), separado por un `border-bottom` sutil.
- **Searchbox**: pill rounded `border-radius: 9999px`.
- **Dropdowns** Región/Tipo/Estado:
  - `border-radius: var(--naowee-border-radius-actions-inputs-default, 12px)` (default DS, no pill).
  - Width fit-content (sin `min-width:200px`), `display:inline-flex`.
  - Menu width = `max-content` de la opción más larga (independiente del trigger).

### Listado completo de municipios
- Nuevo `shared/colombia-municipios.js` — lista oficial DANE con 33 departamentos.
- Cesar 5 → **25 municipios**, Antioquia 8 → **125**, etc.
- Reemplaza dos datasets duplicados (esc-04 y esc-08).

---

## 2. Ajustes de UX / Experiencia

### Persistencia y transiciones cross-page
- **Sidebar persist** (`shared/sidebar-state.js`):
  - Sync init en `<head>` lee `sessionStorage.naoweeSidebarCollapsed` antes del primer paint y aplica `html.naowee-sidebar-collapsed-init`.
  - CSS aplica width 72px sin transición → cero flicker al navegar.
  - Burger persiste el toggle en `sessionStorage`.
- **Page fade in/out** (`shared/page-transitions.js`):
  - Fade-in `.page-fade-enter` al cargar (220ms).
  - Intercept en capture-phase: clicks en `.nav-row` con `onclick="window.location.href='...'"` (no la activa) → fade-out 160ms y luego navega.
  - Soporta `[data-page-nav="url"]`.
  - Respeta `prefers-reduced-motion: reduce`.

### Revisor (esc-12) — detalle dinámico
- Antes: TODA la info hardcodeada (siempre Prado, sin importar `idx`). Ahora: render dinámico desde `EscStore.get(idx)`.
- Cada `ro-field__value` con id (`fNombre`, `fDepartamento`, `fMunicipio`, …) y `setText('id', record.field)`.
- Ficha técnica común, sub-espacios y disciplinas renderizados dinámicamente según `record.fichaComun` / `record.subEspacios` / `record.disciplinas`.
- **Seed enriquecida** en `shared/escenarios-store.js`: 4 records con datos completos (lat/lon, dirección, zona, entidad, propietario, tenencia, teléfono, correo, tipoEscenario, fichaComún, subEspacios con campos específicos por tipo, disciplinas).

### Mapa de escenarios — correcciones de lógica
- **Andina filter**: cuando hay región seleccionada, el ranking muestra TODOS los deptos de la región (cap = Infinity). Antes el `slice(0, 10)` cortaba Quindío en posición #11.
- **Map ranking total = sum pin counts**: city pins ahora muestran un conteo distribuido por `weight` desde el agregado del depto, con el último city absorbiendo el residuo. Antes la muestra de 200 escenarios producía discrepancias (rank 119 vs map 1).
- **CAR + Estado=Regular consistente**: `synthesizeEscenarios` ya no incluye `state.estados` en su seed. Genera siempre el set base por (depto|city|tipo|carOnly), y el filtro de estado se aplica POST-síntesis. Mismo escenario aparece en CAR-only y CAR+Regular.

### Form de registro (esc-08, paso 3 — Datos deportivos)
- **Tipo de infraestructura** (correo SUID 15-Abr-2026): segment con sliding pill — `Recreativa` / `Alta competencia`.
- **Tipo de infraestructura general** (mismo correo): dropdown — `Deportiva` / `Recreativa` / `Mixto`.
- **Estado del escenario** (correo SUID 21-Abr-2026): escala oficial 4 niveles — `Óptimo` / `Bueno` / `Regular` / `Malo` (antes era `Excelente / Bueno / Regular`).
- **Sección PROGRAMAS Y USO** (mismo correo censo):
  - Descripción del escenario (textarea).
  - Programas del Ministerio (multi-select con 8 programas precargados: Supérate-Intercolegiados, CIFD, Hábitos y Estilos de Vida Saludable, Deporte Social Comunitario, Talento Deportivo, Deporte para Todos, Juegos Comunales, Recreación).
  - Programa que se desarrolla actualmente (text).
  - Población mensual atendida (numeric con separador de miles).
  - Otros usos no deportivos (textarea).

### Form de registro — correcciones puntuales
- **Zona**: `Centro` → `Centro poblado`.
- **Superficies**: `Grass natural / Grass sintético` → `Césped natural / Césped sintético` (eliminado anglicismo).
- **Cubierta duplicada removida**: estaba como pregunta global en ficha común Y como ficha específica en Cancha múltiple y Estadio. Se quedó sólo la ficha común.
- **Parqueadero**: stepper +/- → input numérico digitable con separador de miles (para >200 plazas no hace falta clicar 200 veces).
- **Graderías**: removido el sub-campo redundante `capacidadTribuna`. La capacidad total ya viene de "Capacidad de espectadores" en ficha común — además resuelve el caso de "estadio con varias graderías" que antes no se podía representar con un solo campo.

### Sliding pill en segment de presets de horario
- Markup: agregado `<span class="naowee-segment__pill">` y atributos `role="tab"` + `aria-selected`.
- Helper `positionHorarioPresetPill()` calcula posición vía `offsetLeft` / `offsetWidth` (no afectados por scale del padre).
- ResizeObserver sobre el segment dispara reposición en cualquier cambio de ancho (apertura del modal, layout settling).
- First-paint sin animación (detecta `pill.offsetWidth <= 4`) para que no aparezca deslizándose desde la izquierda.
- Override `overflow: visible` en los segments del modal para evitar que el pill (border-radius 8px) sea recortado contra los corners del segment (border-radius 12px).

### Tildes y copy
- **"Hernandez" → "Hernández"** (8 instancias en esc-08/10/12/13 + `escenarios-store.js`).
- **"Foto panoramica" → "Foto panorámica"** (esc-09, esc-10).
- **"Plano de localizacion" → "Plano de localización"** (esc-09, esc-10).
- **"Resolucion de creacion" → "Resolución de creación"** (esc-09, esc-10).
- **"CAR Si" → "CAR Sí"** (esc-09, esc-10, esc-11).

### Modal Registrar sede — sliding pill del segment de presets de horario
- Persistencia + retry con setTimeout (RAF no fire-able cuando el padre está display:none).
- MutationObserver detecta apertura del modal 2 y reposiciona el pill.

---

## Archivos creados / modificados

### Nuevos
- `shared/colombia-municipios.js` — dataset DANE
- `shared/sidebar-tooltips.js` — tooltips para sidebar colapsado
- `shared/sidebar-state.js` — persistencia + sync init sin flicker
- `shared/page-transitions.js` — fade in/out cross-page

### Modificados
- `shared/shell.css` — sidebar refinado + glow global
- `shared/escenarios-store.js` — seed enriquecida
- `escenario-08-dashboard.html` — modal width, dropdowns, table, segment, programas
- `escenario-09-detalle-revision.html` — tildes
- `escenario-10-perfil-activo.html` — tildes, glow
- `escenario-11-revisor-dashboard.html` — sí
- `escenario-12-revisor-detalle.html` — render dinámico desde store
- `escenario-13-mapa.html` — filter toolbar integrado, dropdowns DS, ranking Andina, map agg distribution
