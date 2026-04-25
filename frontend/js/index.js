import { getStats } from "./api.js";
import { renderNavbar, showError, showLoading } from "./components.js";

renderNavbar("index");

const app = document.getElementById("app");
app.innerHTML = `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <!-- Banner presentación -->
    <a href="/app/presentacion.html"
      class="block mb-8 bg-indigo-900/30 border border-indigo-700/50 rounded-lg p-4 hover:bg-indigo-900/50 transition-colors text-center">
      <span class="text-indigo-300 font-semibold">📚 Ver presentación académica del proyecto →</span>
      <span class="block text-xs text-gray-400 mt-1">Contexto, arquitectura, cold-start, sesgos y demo guiada</span>
    </a>

    <!-- Hero -->
    <div class="text-center mb-10">
      <h1 class="text-4xl font-extrabold text-white mb-3">🎮 Sistema Recomendador de Juegos Steam</h1>
      <p class="text-gray-400 max-w-2xl mx-auto">
        Recomendaciones basadas en contenido usando <strong class="text-indigo-400">TF-IDF</strong> y
        <strong class="text-indigo-400">similitud de coseno</strong> sobre metadatos de juegos (tags, géneros, specs, developer).
      </p>
    </div>

    <!-- Stats -->
    <div id="stats" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"></div>

    <!-- Navegación -->
    <h2 class="text-lg font-semibold text-white mb-4">¿Qué deseas hacer?</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
      <a href="/app/usuario.html"
        class="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 rounded-lg p-5 transition-all">
        <div class="text-2xl mb-2">👤</div>
        <h3 class="font-semibold text-white group-hover:text-indigo-300 transition-colors">Mi Perfil</h3>
        <p class="text-xs text-gray-400 mt-1">Ingresa tu user_id y obtén recomendaciones personalizadas. Compara v1 vs v2 lado a lado.</p>
      </a>
      <a href="/app/nuevo-usuario.html"
        class="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 rounded-lg p-5 transition-all">
        <div class="text-2xl mb-2">🆕</div>
        <h3 class="font-semibold text-white group-hover:text-indigo-300 transition-colors">Nuevo Usuario</h3>
        <p class="text-xs text-gray-400 mt-1">¿No tienes historial? Selecciona juegos que te gusten y recibe sugerencias al instante.</p>
      </a>
      <a href="/app/explorar.html"
        class="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 rounded-lg p-5 transition-all">
        <div class="text-2xl mb-2">🔍</div>
        <h3 class="font-semibold text-white group-hover:text-indigo-300 transition-colors">Explorar por Género</h3>
        <p class="text-xs text-gray-400 mt-1">Descubre juegos populares organizados por género con listados estratificados.</p>
      </a>
      <a href="/app/juego.html"
        class="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 rounded-lg p-5 transition-all">
        <div class="text-2xl mb-2">🎯</div>
        <h3 class="font-semibold text-white group-hover:text-indigo-300 transition-colors">Buscar Juego Similar</h3>
        <p class="text-xs text-gray-400 mt-1">Ingresa un juego y encuentra los más parecidos en el catálogo.</p>
      </a>
    </div>

    <!-- Info técnica -->
    <div class="bg-gray-900 border border-gray-800 rounded-lg p-5 text-sm text-gray-400">
      <h3 class="text-white font-semibold mb-2">Enfoque técnico</h3>
      <ul class="list-disc list-inside space-y-1">
        <li><strong class="text-gray-300">Vectorización:</strong> TF-IDF sobre metadatos combinados (tags ×3, developer ×2, specs ×1).</li>
        <li><strong class="text-gray-300">Similitud:</strong> Coseno entre el vector consulta y la matriz del catálogo.</li>
        <li><strong class="text-gray-300">V1 (baseline):</strong> juego semilla con max playtime, sin filtros.</li>
        <li><strong class="text-gray-300">V2 (mejorado):</strong> centroide ponderado de toda la biblioteca + filtro anti-DLC + cold-start.</li>
        <li><strong class="text-gray-300">Dataset:</strong> Steam Video Game and Bundle Data (Julian McAuley, UCSD).</li>
      </ul>
    </div>
  </div>`;

// Cargar stats
const statsEl = document.getElementById("stats");
showLoading(statsEl);

getStats()
  .then((data) => {
    statsEl.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-5 border border-gray-700 text-center">
        <div class="text-3xl font-bold text-indigo-400">${data.juegos_modelables.toLocaleString()}</div>
        <div class="text-xs text-gray-400 mt-1">Juegos modelables</div>
      </div>
      <div class="bg-gray-800 rounded-lg p-5 border border-gray-700 text-center">
        <div class="text-3xl font-bold text-indigo-400">${data.usuarios.toLocaleString()}</div>
        <div class="text-xs text-gray-400 mt-1">Usuarios indexados</div>
      </div>
      <div class="bg-gray-800 rounded-lg p-5 border border-gray-700 text-center">
        <div class="text-3xl font-bold text-indigo-400">${data.generos}</div>
        <div class="text-xs text-gray-400 mt-1">Géneros disponibles</div>
      </div>`;
  })
  .catch((e) => showError(statsEl, e.message));
