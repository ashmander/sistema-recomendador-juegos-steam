import {
  getColdStartIntereses,
  getColdStartPopularidad,
  getEstratificado,
  postColdStartFavoritos,
} from "./api.js";
import {
  collapsiblePanel,
  gameGrid,
  renderNavbar,
  selectableGameCard,
  showError,
  showLoading,
} from "./components.js";

renderNavbar("nuevo-usuario");

// ── Estado ──────────────────────────────────────────────────────
const MAX_SEL = 5;
let selected = new Set();
let allGames = [];
let activeTab = "favoritos";
let popularidadLoaded = false;

// ── Tabs ────────────────────────────────────────────────────────
const TABS = [
  { id: "favoritos", label: "🎮 Elegir Favoritos" },
  { id: "intereses", label: "✨ Describir Gustos" },
  { id: "popularidad", label: "📈 Más Populares" },
];

function tabClasses(id) {
  return id === activeTab
    ? "bg-indigo-600 text-white border-indigo-500"
    : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white";
}

// ── Layout principal ────────────────────────────────────────────
const app = document.getElementById("app");
app.innerHTML = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl font-bold text-white mb-1">Descubre Juegos para Ti</h1>
    <p class="text-gray-400 text-sm mb-6">¿No tienes historial? Elige una de las tres estrategias para recibir recomendaciones.</p>

    ${collapsiblePanel(
      "Nota académica — Estrategias de Cold-Start",
      `
      <p class="mb-2">
        Esta página resuelve el problema de <strong class="text-white">arranque en frío</strong> para usuarios
        nuevos que no tienen historial de juegos en el sistema. Se ofrecen <strong class="text-white">tres estrategias</strong>:
      </p>
      <ul class="list-disc list-inside space-y-1 text-gray-400">
        <li><strong class="text-gray-300">Elegir Favoritos:</strong> El usuario selecciona de 1 a 5 juegos de una
          grilla diversa (cargada por estratificación de género). El sistema calcula el <em>centroide</em>
          (promedio) de sus vectores TF-IDF, creando un perfil compuesto que captura sus gustos.</li>
        <li><strong class="text-gray-300">Describir Gustos:</strong> El usuario escribe palabras clave en texto
          libre (ej: <em>rpg open_world fantasy</em>). Estas palabras se vectorizan con el mismo TF-IDF
          del catálogo y se buscan los juegos más similares al vector resultante.</li>
        <li><strong class="text-gray-300">Más Populares:</strong> Ranking de juegos con más jugadores únicos.
          Es la opción menos personalizada pero más segura — muestra lo que la mayoría disfruta.</li>
      </ul>
    `,
    )}

    <!-- Tabs -->
    <div id="tabs" class="flex gap-2 mb-6"></div>

    <!-- Contenido dinámico por tab -->
    <div id="tab-content"></div>

    <!-- Resultados (compartido) -->
    <div id="results" class="mt-8"></div>
  </div>`;

const tabsContainer = document.getElementById("tabs");
const tabContent = document.getElementById("tab-content");
const results = document.getElementById("results");

// ── Render de tabs ──────────────────────────────────────────────
function renderTabs() {
  tabsContainer.innerHTML = TABS.map(
    (t) =>
      `<button data-tab="${t.id}"
        class="px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tabClasses(t.id)}">
        ${t.label}
      </button>`,
  ).join("");

  tabsContainer.querySelectorAll("button").forEach((btn) =>
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      results.innerHTML = "";
      renderTabs();
      renderActiveTab();
    }),
  );
}

function renderActiveTab() {
  if (activeTab === "favoritos") renderTabFavoritos();
  else if (activeTab === "intereses") renderTabIntereses();
  else if (activeTab === "popularidad") renderTabPopularidad();
}

// ══════════════════════════════════════════════════════════════════
// TAB 1: Elegir Favoritos
// ══════════════════════════════════════════════════════════════════
function renderTabFavoritos() {
  tabContent.innerHTML = `
    <div id="counter" class="mb-4"></div>
    <div id="selection-grid"></div>
    <div class="mt-6 flex gap-3">
      <button id="btn-recomendar" disabled
        class="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium px-6 py-2 rounded-lg transition-colors">
        Obtener Recomendaciones
      </button>
      <button id="btn-reset" class="hidden bg-gray-700 hover:bg-gray-600 text-white font-medium px-6 py-2 rounded-lg transition-colors">
        Volver a Elegir
      </button>
    </div>`;

  const grid = document.getElementById("selection-grid");
  const counter = document.getElementById("counter");
  const btnRec = document.getElementById("btn-recomendar");
  const btnReset = document.getElementById("btn-reset");

  if (allGames.length === 0) {
    showLoading(grid);
    getEstratificado(1)
      .then((data) => {
        const seen = new Set();
        for (const [, juegos] of Object.entries(data.generos)) {
          for (const j of juegos) {
            if (!seen.has(j.item_id)) {
              seen.add(j.item_id);
              allGames.push(j);
            }
          }
        }
        renderGrid();
      })
      .catch((e) => showError(grid, e.message));
  } else {
    renderGrid();
  }

  function renderGrid() {
    grid.innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      ${allGames.map((g) => selectableGameCard(g, selected.has(g.item_id))).join("")}
    </div>`;
    updateCounter();

    grid.querySelectorAll(".selectable-card").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        if (selected.has(id)) selected.delete(id);
        else if (selected.size < MAX_SEL) selected.add(id);
        renderGrid();
      }),
    );
  }

  function updateCounter() {
    counter.innerHTML = `<span class="text-sm ${selected.size > 0 ? "text-indigo-400" : "text-gray-500"}">
      ${selected.size} de ${MAX_SEL} seleccionados
    </span>`;
    btnRec.disabled = selected.size === 0;
  }

  btnRec.addEventListener("click", async () => {
    showLoading(results);
    btnRec.disabled = true;
    try {
      const data = await postColdStartFavoritos([...selected], 10);
      const refs = data.juegos_referencia
        .map(
          (j) =>
            `<span class="bg-indigo-900/50 text-indigo-300 text-xs px-2 py-1 rounded">${j.nombre}</span>`,
        )
        .join(" ");
      results.innerHTML = `
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Basado en tus selecciones</h2>
          <div class="flex flex-wrap gap-2 mb-4">${refs}</div>
        </div>
        ${gameGrid(data.recomendaciones, { linkSimilares: true })}`;
      btnReset.classList.remove("hidden");
    } catch (err) {
      showError(results, err.message);
    }
  });

  btnReset.addEventListener("click", () => {
    selected.clear();
    results.innerHTML = "";
    btnReset.classList.add("hidden");
    renderGrid();
  });
}

// ══════════════════════════════════════════════════════════════════
// TAB 2: Describir Gustos (intereses textuales)
// ══════════════════════════════════════════════════════════════════
function renderTabIntereses() {
  tabContent.innerHTML = `
    <div class="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-4">
      <p class="text-sm text-gray-400 mb-4">
        Describe qué tipo de juegos te gustan usando palabras clave.
        Los términos deben coincidir con tags de Steam (ej: <em class="text-indigo-300">action</em>,
        <em class="text-indigo-300">rpg</em>, <em class="text-indigo-300">open_world</em>,
        <em class="text-indigo-300">multiplayer</em>, <em class="text-indigo-300">indie</em>,
        <em class="text-indigo-300">horror</em>).
      </p>
      <form id="form-intereses" class="flex flex-col sm:flex-row gap-3">
        <input id="input-intereses" type="text" placeholder="ej: rpg open_world fantasy story_rich" required
          class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500">
        <button type="submit"
          class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2 rounded-lg transition-colors">
          Buscar
        </button>
      </form>
    </div>
    <div class="flex flex-wrap gap-2 mb-4">
      <span class="text-xs text-gray-500">Ejemplos:</span>
      ${[
        "action shooter multiplayer",
        "rpg open_world fantasy",
        "puzzle indie casual",
        "horror atmospheric survival",
        "strategy simulation",
      ]
        .map(
          (e) =>
            `<button class="intereses-chip text-xs bg-gray-800 hover:bg-gray-700 text-indigo-400 border border-gray-700 px-3 py-1 rounded-full transition-colors">${e}</button>`,
        )
        .join("")}
    </div>`;

  const form = document.getElementById("form-intereses");
  const input = document.getElementById("input-intereses");

  // Chips autocompletan el input
  tabContent.querySelectorAll(".intereses-chip").forEach((btn) =>
    btn.addEventListener("click", () => {
      input.value = btn.textContent;
    }),
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const intereses = input.value.trim();
    if (!intereses) return;

    showLoading(results);
    try {
      const data = await getColdStartIntereses(intereses, 10);
      results.innerHTML = `
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Juegos afines a tus intereses</h2>
          <p class="text-sm text-gray-400 mb-4">Palabras clave: <span class="text-indigo-300">${data.intereses}</span></p>
        </div>
        ${gameGrid(data.recomendaciones, { linkSimilares: true })}`;
    } catch (err) {
      showError(results, err.message);
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// TAB 3: Más Populares
// ══════════════════════════════════════════════════════════════════
function popularityCard({ item_id, nombre, score }) {
  return `
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-indigo-500 transition-colors">
      <h3 class="font-semibold text-white text-sm leading-tight mb-1">${nombre || item_id}</h3>
      <span class="text-[11px] text-gray-500 font-mono">ID: ${item_id}</span>
      <div class="mt-2 flex flex-col">
        <span class="text-xs text-indigo-300">${Number(score).toLocaleString()} jugadores</span>
        <a href="/app/juego.html?id=${item_id}" class="text-xs text-indigo-400 hover:text-indigo-200 mt-1 inline-block">Ver similares →</a>
      </div>
    </div>`;
}

function renderTabPopularidad() {
  tabContent.innerHTML = `
    <p class="text-sm text-gray-400 mb-4">
      Ranking de los juegos más populares medido por número de jugadores únicos en el dataset.
    </p>`;

  if (!popularidadLoaded) {
    showLoading(results);
    getColdStartPopularidad(10)
      .then((data) => {
        popularidadLoaded = true;
        results.innerHTML = `
          <h2 class="text-lg font-semibold text-white mb-3">Top 10 — Juegos más populares</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${data.recomendaciones.map((j) => popularityCard(j)).join("")}
          </div>`;
      })
      .catch((e) => showError(results, e.message));
  }
}

// ── Inicialización ──────────────────────────────────────────────
renderTabs();
renderActiveTab();
