import { getRecomendacionJuegoV2 } from "./api.js";
import {
  collapsiblePanel,
  gameGrid,
  renderNavbar,
  showError,
  showLoading,
} from "./components.js";

renderNavbar("juego");

const app = document.getElementById("app");
app.innerHTML = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl font-bold text-white mb-1">Buscar Juegos Similares</h1>
    <p class="text-gray-400 text-sm mb-6">Ingresa el ID de un juego para encontrar los más parecidos en el catálogo.</p>

    ${collapsiblePanel(
      "Nota académica — Similitud de Coseno y Filtro Anti-DLC",
      `
      <p class="mb-2">
        Esta página muestra el <strong class="text-white">núcleo del sistema de recomendación</strong>:
        similitud de coseno entre vectores TF-IDF.
      </p>
      <ul class="list-disc list-inside space-y-1 text-gray-400">
        <li><strong class="text-gray-300">Cálculo on-demand:</strong> No se precalcula la matriz completa N×N
          de similitudes (serían ~7 GB en RAM). En su lugar, se compara el vector del juego consultado
          contra los ~2,000 juegos del catálogo en milisegundos.</li>
        <li><strong class="text-gray-300">TF-IDF:</strong> Los tokens frecuentes (como <em>indie</em> o <em>singleplayer</em>)
          reciben menor peso, mientras que tokens distintivos (como <em>roguelike</em> o <em>cyberpunk</em>)
          reciben mayor peso. Esto hace que las similitudes sean más significativas.</li>
        <li><strong class="text-gray-300">Filtro anti-DLC:</strong> Los resultados pasan por un filtro que descarta
          expansiones, soundtracks y packs usando heurísticas de nombre (contención de nombre
          + palabras clave como <em>dlc</em>, <em>season pass</em>, <em>soundtrack</em>).</li>
      </ul>
    `,
    )}

    <form id="form" class="flex flex-col sm:flex-row gap-3 mb-6">
      <input id="item-id" type="text" placeholder="item_id (ej: 10, 400, 730)" required
        class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500">
      <div class="flex items-center gap-2">
        <label for="top-n" class="text-sm text-gray-400 whitespace-nowrap">Juegos:</label>
        <select id="top-n" class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500">
          ${[1, 2, 5, 10, 15].map((n) => `<option value="${n}" ${n === 10 ? "selected" : ""}>${n}</option>`).join("")}
        </select>
      </div>
      <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2 rounded-lg transition-colors">
        Buscar Similares
      </button>
    </form>

    <div class="flex flex-wrap gap-2 mb-6">
      <span class="text-xs text-gray-500">Ejemplos:</span>
      ${[
        ["10", "Counter-Strike"],
        ["400", "Portal"],
        ["730", "CS:GO"],
        ["4000", "Garry's Mod"],
        ["105600", "Terraria"],
      ]
        .map(
          ([id, name]) =>
            `<button class="ejemplo-chip text-xs bg-gray-800 hover:bg-gray-700 text-indigo-400 border border-gray-700 px-3 py-1 rounded-full transition-colors" data-item-id="${id}">${name} (${id})</button>`,
        )
        .join("")}
    </div>

    <div id="results"></div>
  </div>`;

const form = document.getElementById("form");
const input = document.getElementById("item-id");
const results = document.getElementById("results");

// Chips de ejemplo autocompletan el input
document.querySelectorAll(".ejemplo-chip").forEach((btn) =>
  btn.addEventListener("click", () => {
    input.value = btn.dataset.itemId;
  }),
);

// Soportar query param ?id=XXXX
const params = new URLSearchParams(window.location.search);
const idParam = params.get("id");
if (idParam) {
  input.value = idParam;
  buscar(idParam);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = input.value.trim();
  const topN = parseInt(document.getElementById("top-n").value);
  if (id) buscar(id, topN);
});

async function buscar(itemId, topN = 10) {
  showLoading(results);
  try {
    const data = await getRecomendacionJuegoV2(itemId, topN);
    results.innerHTML = `
      <div class="bg-gray-900 rounded-lg p-4 mb-6 border border-gray-800">
        <span class="text-gray-400 text-sm">Juego base:</span>
        <span class="text-white font-semibold ml-1">${data.nombre || itemId}</span>
        <span class="text-gray-500 text-xs ml-2">ID: ${data.item_id}</span>
      </div>
      <h2 class="text-lg font-semibold text-white mb-3">Juegos similares</h2>
      ${gameGrid(data.recomendaciones, { linkSimilares: true })}`;
  } catch (err) {
    showError(results, err.message);
  }
}
