/**
 * Componentes de UI reutilizables.
 */

const NAV_ITEMS = [
  { href: "/app/presentacion.html", label: "Presentación", id: "presentacion" },
  { href: "/app/", label: "Inicio", id: "index" },
  { href: "/app/usuario.html", label: "Mi Perfil", id: "usuario" },
  {
    href: "/app/nuevo-usuario.html",
    label: "Nuevo Usuario",
    id: "nuevo-usuario",
  },
  { href: "/app/explorar.html", label: "Explorar", id: "explorar" },
  { href: "/app/juego.html", label: "Buscar Juego", id: "juego" },
];

/**
 * Inserta el navbar en el elemento #navbar.
 * @param {string} paginaActiva - id de la página actual
 */
export function renderNavbar(paginaActiva) {
  const el = document.getElementById("navbar");
  if (!el) return;
  const links = NAV_ITEMS.map(
    (n) =>
      `<a href="${n.href}" class="px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        n.id === paginaActiva
          ? "bg-indigo-700 text-white"
          : "text-gray-300 hover:bg-gray-700 hover:text-white"
      }">${n.label}</a>`,
  ).join("");
  el.innerHTML = `
    <nav class="bg-gray-900 border-b border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-14">
          <a href="/app/" class="flex items-center gap-2 text-white font-bold text-lg">
            <span>🎮</span> Steam Recommender
          </a>
          <div class="flex gap-1">${links}</div>
        </div>
      </div>
    </nav>`;
}

/**
 * Tarjeta de juego estándar (resultado de recomendación).
 */
export function gameCard(
  { item_id, nombre, similitud },
  { linkSimilares = false } = {},
) {
  const score =
    similitud != null
      ? `<span class="text-xs text-indigo-300">Similitud: ${(similitud * 100).toFixed(1)}%</span>`
      : "";
  const link = linkSimilares
    ? `<a href="/app/juego.html?id=${item_id}" class="text-xs text-indigo-400 hover:text-indigo-200 mt-1 inline-block">Ver similares →</a>`
    : "";
  return `
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-indigo-500 transition-colors">
      <h3 class="font-semibold text-white text-sm leading-tight mb-1">${nombre || item_id}</h3>
      <span class="text-[11px] text-gray-500 font-mono">ID: ${item_id}</span>
      <div class="mt-2 flex flex-col">${score}${link}</div>
    </div>`;
}

/**
 * Tarjeta seleccionable para el onboarding de cold-start.
 */
export function selectableGameCard({ item_id, nombre }, selected) {
  return `
    <button data-id="${item_id}"
      class="selectable-card text-left bg-gray-800 rounded-lg p-4 border-2 transition-all cursor-pointer
        ${selected ? "border-indigo-500 ring-2 ring-indigo-500/40" : "border-gray-700 hover:border-gray-500"}">
      <h3 class="font-semibold text-white text-sm leading-tight mb-1">${nombre || item_id}</h3>
      <span class="text-[11px] text-gray-500 font-mono">ID: ${item_id}</span>
    </button>`;
}

/**
 * Grid de tarjetas de juego.
 */
export function gameGrid(juegos, opts = {}) {
  if (!juegos || juegos.length === 0)
    return `<p class="text-gray-400">Sin resultados.</p>`;
  return `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    ${juegos.map((j) => gameCard(j, opts)).join("")}
  </div>`;
}

/** Spinner de carga */
export function showLoading(container) {
  container.innerHTML = `
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></div>
    </div>`;
}

/** Mensaje de error */
export function showError(container, mensaje) {
  container.innerHTML = `
    <div class="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-4 text-sm">
      ${mensaje}
    </div>`;
}

/** Wrapper de página estándar */
export function pageShell(titulo, subtitulo = "") {
  return `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-2xl font-bold text-white mb-1">${titulo}</h1>
      ${subtitulo ? `<p class="text-gray-400 text-sm mb-6">${subtitulo}</p>` : '<div class="mb-6"></div>'}
      <div id="content"></div>
    </div>`;
}

/**
 * Panel colapsable para notas académicas.
 * @param {string} titulo - Título visible del panel
 * @param {string} contenidoHTML - HTML del contenido colapsable
 * @param {object} opts
 * @param {boolean} opts.abierto - Si el panel inicia abierto
 */
export function collapsiblePanel(
  titulo,
  contenidoHTML,
  { abierto = false } = {},
) {
  return `
    <details class="group bg-gray-800/50 border border-gray-700 rounded-lg mb-6" ${abierto ? "open" : ""}>
      <summary class="flex items-center justify-between cursor-pointer px-5 py-3 select-none">
        <span class="flex items-center gap-2 text-sm font-semibold text-indigo-300">
          <span>📘</span> ${titulo}
        </span>
        <svg class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </summary>
      <div class="px-5 pb-4 text-sm text-gray-300 leading-relaxed">
        ${contenidoHTML}
      </div>
    </details>`;
}
