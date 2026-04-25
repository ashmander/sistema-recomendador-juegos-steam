import { compararVersiones } from "./api.js";
import {
  collapsiblePanel,
  gameGrid,
  renderNavbar,
  showError,
  showLoading,
} from "./components.js";

renderNavbar("usuario");

const EJEMPLO_IDS = ["76561198084279738", "evcentric", "js41637"];

const app = document.getElementById("app");
app.innerHTML = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl font-bold text-white mb-1">Recomendaciones Personalizadas</h1>
    <p class="text-gray-400 text-sm mb-6">Ingresa un user_id para ver recomendaciones v1 y v2 lado a lado.</p>

    ${collapsiblePanel(
      "Nota académica — V1 vs V2: Perfil de usuario",
      `
      <p class="mb-2">
        Esta página compara las dos versiones del modelo lado a lado para un mismo usuario.
      </p>
      <ul class="list-disc list-inside space-y-1 text-gray-400">
        <li><strong class="text-gray-300">V1 (Baseline):</strong> Usa un único juego semilla — el que el usuario ha jugado más horas.
          Si ese juego resulta ser un FPS, todas las recomendaciones serán FPS, ignorando el resto de la biblioteca.</li>
        <li><strong class="text-gray-300">V2 (Mejorado):</strong> Construye un <em>centroide ponderado</em> de toda la biblioteca del usuario.
          Cada juego contribuye al perfil proporcionalmente a su playtime, pero usando ponderación logarítmica
          para atenuar outliers (10,000 horas no tiene 100× más peso que 100 horas, sino ~2×).</li>
        <li><strong class="text-gray-300">Filtro anti-DLC:</strong> V2 además aplica post-procesamiento para excluir DLCs,
          soundtracks, season passes y contenido derivado de los resultados.</li>
      </ul>
    `,
    )}

    <form id="form" class="flex flex-col sm:flex-row gap-3 mb-4">
      <input id="uid" type="text" placeholder="user_id" required
        class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500">
      <div class="flex items-center gap-2">
        <label for="top-n" class="text-sm text-gray-400 whitespace-nowrap">Juegos:</label>
        <select id="top-n" class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500">
          ${[1, 2, 5, 10, 15].map((n) => `<option value="${n}" ${n === 10 ? "selected" : ""}>${n}</option>`).join("")}
        </select>
      </div>
      <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2 rounded-lg transition-colors">
        Recomendar
      </button>
    </form>

    <div class="flex flex-wrap gap-2 mb-6">
      <span class="text-xs text-gray-500">Ejemplos:</span>
      ${EJEMPLO_IDS.map(
        (id) =>
          `<button class="ejemplo-chip text-xs bg-gray-800 hover:bg-gray-700 text-indigo-400 border border-gray-700 px-3 py-1 rounded-full transition-colors" data-uid="${id}">${id}</button>`,
      ).join("")}
    </div>

    <div id="results"></div>
  </div>`;

// Chips de ejemplo autocompletan el input
document.querySelectorAll(".ejemplo-chip").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.getElementById("uid").value = btn.dataset.uid;
  }),
);

const form = document.getElementById("form");
const results = document.getElementById("results");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userId = document.getElementById("uid").value.trim();
  const topN = parseInt(document.getElementById("top-n").value);
  if (!userId) return;

  showLoading(results);
  try {
    const data = await compararVersiones(userId, topN);
    renderComparacion(data);
  } catch (err) {
    showError(results, err.message);
  }
});

function renderComparacion(data) {
  const v1 = data.v1;
  const v2 = data.v2;

  const v1Semilla = v1.juego_base
    ? `<div class="bg-gray-900 rounded p-3 mb-4 text-sm">
         <span class="text-gray-400">Juego semilla (max playtime):</span>
         <span class="text-white font-medium ml-1">${v1.juego_base.item_name || v1.juego_base.nombre}</span>
         <span class="text-gray-500 text-xs ml-1">(${v1.juego_base.item_id})</span>
       </div>`
    : `<p class="text-gray-500 text-sm mb-4">Cold start — sin juegos modelables.</p>`;

  const v1Recs =
    v1.recomendaciones && v1.recomendaciones.length > 0
      ? gameGrid(v1.recomendaciones)
      : `<p class="text-gray-500 text-sm">Sin recomendaciones.</p>`;

  const v2Meta =
    v2.tipo_perfil === "cold_start"
      ? `<div class="bg-yellow-900/30 border border-yellow-700 rounded p-3 mb-4 text-sm text-yellow-300">
           Usuario sin historial modelable. <a href="/app/nuevo-usuario.html" class="underline">Prueba el flujo de nuevo usuario →</a>
         </div>`
      : `<div class="bg-gray-900 rounded p-3 mb-4 text-sm">
           <span class="text-gray-400">Juego dominante:</span>
           <span class="text-white font-medium ml-1">${v2.juego_dominante?.item_name || v2.juego_dominante?.nombre || "—"}</span>
           <span class="text-gray-500 text-xs ml-2">Juegos en perfil: ${v2.n_juegos_usados_para_perfil || "—"}</span>
         </div>`;

  const v2Recs =
    v2.recomendaciones && v2.recomendaciones.length > 0
      ? gameGrid(v2.recomendaciones)
      : `<p class="text-gray-500 text-sm">Sin recomendaciones.</p>`;

  results.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- V1 -->
      <div>
        <h2 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <span class="bg-gray-700 text-xs px-2 py-0.5 rounded">v1</span> Baseline
        </h2>
        ${v1Semilla}
        ${v1Recs}
      </div>
      <!-- V2 -->
      <div>
        <h2 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <span class="bg-indigo-700 text-xs px-2 py-0.5 rounded">v2</span> Mejorado
        </h2>
        ${v2Meta}
        ${v2Recs}
      </div>
    </div>`;
}
