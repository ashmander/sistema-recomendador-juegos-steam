import { getEstratificado } from "./api.js";
import {
  collapsiblePanel,
  gameGrid,
  renderNavbar,
  showError,
  showLoading,
} from "./components.js";

renderNavbar("explorar");

let generosDisponibles = [];
let generosSeleccionados = new Set();

const app = document.getElementById("app");
app.innerHTML = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl font-bold text-white mb-1">Explorar por Género</h1>
    <p class="text-gray-400 text-sm mb-6">Selecciona géneros y cantidad de juegos por género para descubrir títulos variados.</p>

    ${collapsiblePanel(
      "Nota académica — Estratificación y Sesgo de Popularidad",
      `
      <p class="mb-2">
        La exploración estratificada es una <strong class="text-white">mitigación del sesgo de popularidad</strong>.
      </p>
      <ul class="list-disc list-inside space-y-1 text-gray-400">
        <li><strong class="text-gray-300">El problema:</strong> Un ranking global (top-N más populares) está
          dominado por juegos del género más popular (Action). Los juegos de géneros minoritarios como
          Simulation o Racing quedan invisibilizados.</li>
        <li><strong class="text-gray-300">La solución:</strong> En lugar del top-N global, se muestran los K juegos
          más populares de <em>cada</em> género. Esto garantiza representación equitativa y permite
          al usuario descubrir títulos en géneros que quizá no habría explorado.</li>
        <li><strong class="text-gray-300">Relación con sesgos:</strong> Esta técnica es un ejemplo concreto
          de <em>diversificación de resultados</em> como estrategia de mitigación de sesgos
          (Actividad 3.2 del taller).</li>
      </ul>
    `,
    )}

    <div id="genero-chips" class="mb-4"></div>

    <div class="flex items-center gap-4 mb-6">
      <label class="text-sm text-gray-400">Juegos por género:</label>
      <select id="k-select" class="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500">
        ${[1, 2, 3, 5, 10].map((n) => `<option value="${n}" ${n === 3 ? "selected" : ""}>${n}</option>`).join("")}
      </select>
      <button id="btn-explorar" class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-1.5 rounded-lg transition-colors text-sm">
        Explorar
      </button>
    </div>

    <div id="results"></div>
  </div>`;

const chipsContainer = document.getElementById("genero-chips");
const results = document.getElementById("results");
const btnExplorar = document.getElementById("btn-explorar");
const kSelect = document.getElementById("k-select");

// Cargar géneros disponibles (hacemos una petición con k=1 para obtener la lista de claves)
showLoading(chipsContainer);
getEstratificado(1)
  .then((data) => {
    generosDisponibles = Object.keys(data.generos).sort();
    renderChips();
  })
  .catch((e) => showError(chipsContainer, e.message));

function renderChips() {
  chipsContainer.innerHTML = `<div class="flex flex-wrap gap-2">
    ${generosDisponibles
      .map(
        (g) =>
          `<button data-genero="${g}" class="genero-chip text-xs px-3 py-1.5 rounded-full border transition-colors ${
            generosSeleccionados.has(g)
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
          }">${g}</button>`,
      )
      .join("")}
  </div>`;

  chipsContainer.querySelectorAll(".genero-chip").forEach((btn) =>
    btn.addEventListener("click", () => {
      const g = btn.dataset.genero;
      if (generosSeleccionados.has(g)) {
        generosSeleccionados.delete(g);
      } else {
        generosSeleccionados.add(g);
      }
      renderChips();
    }),
  );
}

btnExplorar.addEventListener("click", async () => {
  const k = parseInt(kSelect.value);
  const generos =
    generosSeleccionados.size > 0 ? [...generosSeleccionados].join(",") : null;

  showLoading(results);
  try {
    const data = await getEstratificado(k, generos);
    renderResultados(data);
  } catch (e) {
    showError(results, e.message);
  }
});

function renderResultados(data) {
  const entries = Object.entries(data.generos);
  if (entries.length === 0) {
    results.innerHTML = `<p class="text-gray-500">Sin resultados para los géneros seleccionados.</p>`;
    return;
  }

  results.innerHTML = entries
    .map(
      ([genero, juegos]) => `
      <div class="mb-8">
        <h2 class="text-lg font-semibold text-white mb-3 capitalize">${genero}
          <span class="text-xs text-gray-500 font-normal ml-2">${juegos.length} juegos</span>
        </h2>
        ${gameGrid(juegos, { linkSimilares: true })}
      </div>`,
    )
    .join("");
}

// Auto-explorar al cargar
btnExplorar.click();
