# Changelog

Sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
[Semantic Versioning](https://semver.org/lang/es/spec/v2.0.0.html).

---

## [v2.0.0] — 2026-05-04

Major bump desde **v1.3.2**. Refinamiento end-to-end: paridad visual con
`naowee-test-sidebar-shell`, fixes de feedback del cliente y nuevas
variables del censo SUID.

### Added — UI / Estilos
- **Sidebar refinado** con easing Apple-style, fade escalonado de labels,
  hover/active 40×40 vía `::before` en estado colapsado, active-bar con
  animación de entrada.
- **Glow elevation** naranja global en todos los `.naowee-btn--loud`
  (sin oscurecer fill, lift sutil + sombra accent).
- **Modal Registrar sede** con paridad `.sd-modal` del sidebar-shell:
  width 680px, body padding 20×24, gap 16, footer flex con btns flex:1,
  map tile filter `saturate(.6) brightness(1.06)`.
- **Tabla de escenarios**: headers UPPERCASE 11px con letter-spacing,
  IDs en monospace 13px secondary, fila 80px más densa.
- **Mapa**: filter toolbar integrado en el `.map-canvas`, searchbox pill,
  dropdowns con border-radius del DS, menu width = `max-content`.
- **Tooltips** flotantes para items del sidebar colapsado.

### Added — UX / Experiencia
- **Persistencia del sidebar** (`sessionStorage.naoweeSidebarCollapsed`):
  el estado colapsado/expandido sobrevive la navegación entre páginas
  sin flicker (sync init en `<head>` antes del primer paint).
- **Page fade in/out** entre páginas del shell: fade-in 220ms al cargar
  + fade-out 160ms al hacer click en un item de navegación.
- **Variables del censo SUID** (correos 15-Abr y 21-Abr 2026):
  - Tipo de infraestructura: `Recreativa` / `Alta competencia` (segment).
  - Tipo de infraestructura general: `Deportiva` / `Recreativa` / `Mixto`.
  - Estado del escenario: escala oficial 4 niveles
    `Óptimo` / `Bueno` / `Regular` / `Malo`.
  - Sección "Programas y uso" con descripción, multi-select de
    Programas del Ministerio (8 catálogo), programa actual,
    población mensual atendida y otros usos no deportivos.
- **Detalle del revisor (`escenario-12`) dinámico**: antes mostraba
  siempre el mismo escenario hardcodeado; ahora carga desde el store
  según el `?idx`.
- **Seed enriquecida**: los 4 records del demo ahora tienen datos
  completos (lat/lon, dirección, zona, entidad, propietario, tenencia,
  teléfono, correo, ficha común, sub-espacios y disciplinas).
- **Dataset oficial DANE de municipios** (`shared/colombia-municipios.js`):
  33 deptos con sus municipios completos. Cesar pasa de 5 a 25,
  Antioquia de 8 a 125.

### Fixed
- **Mapa — ranking por región**: cuando se filtra por región muestra
  TODOS los deptos de esa región (cap = ∞). Antes el `slice(0, 10)`
  cortaba Quindío en posición #11 al filtrar Andina.
- **Mapa — coherencia entre rank y pins**: los city pins ahora
  distribuyen el agregado del depto por `weight` de cada ciudad
  (último city absorbe el residuo). Garantiza que
  `sum(cityPins) == valueFor(depto)` (antes 119 vs 1 con Piscina+Valle).
- **Mapa — CAR + Estado consistente**: `synthesizeEscenarios` ya no
  incluye `state.estados` en su seed. El filtro de estado se aplica
  POST-síntesis. Mismo escenario aparece en CAR-only y CAR+Regular.
- **Modal — dropdowns out of place**: la animación de entrada del modal
  usaba `transform:scale + translateY` que creaba un nuevo containing
  block para `position:fixed`, rompiendo los menus flotantes
  (Departamento, Municipio, Zona, Tipo, etc). Ahora la animación es
  sólo `opacity`.
- **Segment — pill clipping**: `overflow:visible` en los segments del
  modal para que el pill (border-radius 8px) no se recorte contra los
  corners del segment (border-radius 12px).
- **Form — correcciones**:
  - Zona: `Centro` → `Centro poblado`.
  - Superficies: `Grass natural/sintético` → `Césped natural/sintético`.
  - Cubierta duplicada removida de `fichaEspecífica` de Cancha múltiple
    y Estadio (queda en ficha común con opciones unificadas).
  - Parqueadero: stepper +/- → input numérico digitable con miles.
  - Graderías: removido sub-campo `capacidadTribuna` redundante con
    `Capacidad de espectadores` en ficha común.
- **Tildes y copy**:
  - "Hernandez" → **"Hernández"** (8 instancias).
  - "Foto panoramica" → **"Foto panorámica"**.
  - "Plano de localizacion" → **"Plano de localización"**.
  - "Resolucion de creacion" → **"Resolución de creación"**.
  - "CAR Si" → **"CAR Sí"**.
- **Multi-select Programas del Ministerio**: corregido `floatMenu()` con
  `position:fixed` + coords desde `getBoundingClientRect`.
- **Sliding pill** en segment de presets de horario: usa
  `offsetLeft`/`offsetWidth` (no afectados por scale del padre) +
  `ResizeObserver` para detectar cuando el segment se hace visible.

### Changed
- **Escala de estado** del escenario: 3 niveles
  (`Excelente`/`Bueno`/`Regular`) → **4 niveles**
  (`Óptimo`/`Bueno`/`Regular`/`Malo`) según el censo oficial.

### Files
**Nuevos**:
- `shared/colombia-municipios.js`
- `shared/sidebar-state.js`
- `shared/sidebar-tooltips.js`
- `shared/page-transitions.js`
- `AJUSTES-SESION.md`
- `CHANGELOG.md`

**Modificados**:
- `shared/shell.css`, `shared/escenarios-store.js`
- `escenario-04-registrar-prevalidacion.html`
- `escenario-08-dashboard.html`
- `escenario-09-detalle-revision.html`
- `escenario-10-perfil-activo.html`
- `escenario-11-revisor-dashboard.html`
- `escenario-12-revisor-detalle.html`
- `escenario-13-mapa.html`

---

## [v1.3.2] — Pre-sesión

Última release antes de la sesión de refinamiento del 4-May-2026.
Corresponde al commit `f44d95f` (`fix(esc-12): rechazo doc sin motivo stale +
handlers zoom/descarga operativos`).

### Pantallas incluidas en la baseline
- `index.html` — landing con accesos por rol.
- `escenario-03-registrar-escenario.html` — wizard paso 1.
- `escenario-04-registrar-prevalidacion.html` — wizard paso 2 (datos básicos).
- `escenario-05-registrar-georreferenciacion.html` — wizard paso 3 (mapa).
- `escenario-06-registrar-propiedad.html` — wizard paso 4 (datos de propiedad).
- `escenario-07-registrar-exito.html` — confirmación de envío.
- `escenario-08-dashboard.html` — dashboard del Gestor de escenarios.
- `escenario-09-detalle-revision.html` — detalle de un registro en revisión.
- `escenario-10-perfil-activo.html` — perfil de un escenario activo.
- `escenario-11-revisor-dashboard.html` — dashboard del Revisor.
- `escenario-12-revisor-detalle.html` — detalle de un registro para el Revisor.
- `escenario-13-mapa.html` — mapa de escenarios por departamento.

### Componentes y librerías base
- Shell común (`shared/shell.css`) con sidebar, header y footer.
- Store de escenarios (`shared/escenarios-store.js`) con seed de 4 records
  básicos (nombre, depto, municipio, status, documentación, historial).
- Wizard transitions y tabs animados.
- Logos: Ministerio del Deporte, SUID, Naowee.

### Limitaciones conocidas (resueltas en v2.0.0)
- Detalle del revisor con datos hardcodeados (no leía del store).
- Múltiples tildes faltantes en copy.
- Dataset de municipios incompleto (3-9 por depto).
- Modal Registrar con animación de entrada que rompía menus flotantes.
- Segment del horario sin sliding pill.
- Filtros del mapa con discrepancias entre rank y pins.
- Sin persistencia del estado del sidebar entre páginas.

---

## [v1.0.0..v1.3.1] — Histórico previo

Releases anteriores del demo. Ver tags y commits en GitHub para el detalle.
