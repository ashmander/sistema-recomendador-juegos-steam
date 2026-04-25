import { renderNavbar } from "./components.js";

renderNavbar("presentacion");

const app = document.getElementById("app");

app.innerHTML = `
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- CABECERA — Autores, asignatura, dataset               -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <header class="text-center border-b border-gray-800 pb-10">
      <h1 class="text-3xl sm:text-4xl font-extrabold text-white mb-3">
        🎮 Sistema Recomendador de Videojuegos — Steam
      </h1>
      <p class="text-indigo-400 font-medium mb-4">Filtrado Basado en Contenido con TF-IDF y Similitud de Coseno</p>
      <div class="text-sm text-gray-400 space-y-1">
        <p><strong class="text-gray-300">Autores:</strong> Andres Felipe González · William Suaza · Camilo Camero</p>
        <p><strong class="text-gray-300">Asignatura:</strong> Introducción al Diseño de Sistemas Recomendadores</p>
        <p><strong class="text-gray-300">Dataset:</strong> Steam Video Game and Bundle Data — Julian McAuley, UCSD
          (<a href="https://cseweb.ucsd.edu/~jmcauley/datasets.html#steam_data" target="_blank" rel="noopener"
            class="text-indigo-400 hover:text-indigo-300 underline">fuente</a>)
        </p>
      </div>
    </header>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 1 — Contexto del problema (Act 1.1)           -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <section>
      <h2 class="section-heading text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="text-indigo-400">1.</span> Contexto del Problema
      </h2>
      <div class="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-3 text-sm text-gray-300 leading-relaxed">
        <p>
          <strong class="text-white">Dominio:</strong> Entretenimiento digital — plataforma Steam, la tienda de
          videojuegos para PC más grande del mundo con más de 50,000 títulos en su catálogo.
        </p>
        <p>
          <strong class="text-white">Problema:</strong> La <em>parálisis de elección</em>. Un jugador promedio
          tiene decenas de juegos en su biblioteca y el catálogo crece constantemente. Encontrar el siguiente juego
          que realmente disfrutará requiere navegar manualmente entre miles de opciones, leer reseñas y probar demos
          — un proceso costoso en tiempo y con alta probabilidad de decepción.
        </p>
        <p>
          <strong class="text-white">Solución:</strong> Un sistema recomendador que analiza automáticamente los
          metadatos de cada juego (géneros, tags comunitarios, especificaciones técnicas, desarrollador) y el historial
          del usuario para sugerir títulos afines a sus gustos, sin que el usuario tenga que buscar activamente.
        </p>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 2 — Usuarios e Ítems (Act 1.2)                -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <section>
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="text-indigo-400">2.</span> Usuarios e Ítems
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 class="text-white font-semibold mb-3 flex items-center gap-2">👤 Usuarios</h3>
          <ul class="text-sm text-gray-300 space-y-2 list-disc list-inside">
            <li>Jugadores de Steam con cuentas públicas.</li>
            <li>El dataset contiene <strong class="text-indigo-300">~88,000 usuarios</strong> australianos con
              sus bibliotecas completas.</li>
            <li>Cada interacción registra el <strong>tiempo de juego acumulado</strong> (<code class="text-indigo-300">playtime_forever</code>),
              que usamos como señal implícita de preferencia.</li>
            <li>No hay ratings explícitos — solo el comportamiento de uso.</li>
          </ul>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 class="text-white font-semibold mb-3 flex items-center gap-2">🎮 Ítems (Videojuegos)</h3>
          <ul class="text-sm text-gray-300 space-y-2 list-disc list-inside">
            <li>Catálogo con <strong class="text-indigo-300">~2,000 juegos modelables</strong> después de la limpieza.</li>
            <li>Atributos usados como features:
              <ul class="ml-4 mt-1 space-y-1 list-[circle]">
                <li><strong>Tags</strong> — etiquetas comunitarias (ej: <em>open_world</em>, <em>rpg</em>, <em>story_rich</em>). Peso ×3.</li>
                <li><strong>Developer</strong> — estudio desarrollador (captura estilo). Peso ×2.</li>
                <li><strong>Specs</strong> — info técnica (singleplayer, multiplayer, VR). Peso ×1.</li>
                <li><strong>Genres</strong> — desactivado (98% redundante con tags según análisis de Jaccard).</li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 3 — Estrategia de recomendación (Act 1.3)     -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <section>
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="text-indigo-400">3.</span> Estrategia de Recomendación
      </h2>
      <div class="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4 text-sm text-gray-300 leading-relaxed">
        <p>
          Se eligió <strong class="text-white">Filtrado Basado en Contenido</strong> (<em>Content-Based Filtering</em>)
          como estrategia principal. Los juegos se representan como vectores numéricos construidos con
          <strong class="text-indigo-300">TF-IDF</strong> sobre sus metadatos textuales, y las recomendaciones
          se generan calculando la <strong class="text-indigo-300">similitud de coseno</strong> entre vectores.
        </p>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border border-gray-700 rounded">
            <thead>
              <tr class="bg-gray-800 text-gray-300">
                <th class="px-4 py-2 text-left border-b border-gray-700">Criterio</th>
                <th class="px-4 py-2 text-left border-b border-gray-700">Content-Based ✅</th>
                <th class="px-4 py-2 text-left border-b border-gray-700">Collaborative Filtering</th>
              </tr>
            </thead>
            <tbody class="text-gray-400">
              <tr class="border-b border-gray-800">
                <td class="px-4 py-2 text-gray-300">Datos disponibles</td>
                <td class="px-4 py-2">Metadatos densos para casi todos los juegos</td>
                <td class="px-4 py-2">Requiere matriz usuario-ítem densa (difícil con este dataset)</td>
              </tr>
              <tr class="border-b border-gray-800">
                <td class="px-4 py-2 text-gray-300">Cold-start de ítems</td>
                <td class="px-4 py-2">Funciona — solo necesita metadatos</td>
                <td class="px-4 py-2">Falla — necesita interacciones previas</td>
              </tr>
              <tr class="border-b border-gray-800">
                <td class="px-4 py-2 text-gray-300">Explicabilidad</td>
                <td class="px-4 py-2">Alta — "se parece en estos tags"</td>
                <td class="px-4 py-2">Baja — "usuarios similares lo jugaron"</td>
              </tr>
              <tr>
                <td class="px-4 py-2 text-gray-300">Complejidad</td>
                <td class="px-4 py-2">Baja — viable en entornos limitados</td>
                <td class="px-4 py-2">Media-Alta — factorización de matrices</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="text-gray-400 text-xs">
          <strong>Limitación conocida:</strong> Content-Based tiende a crear "burbujas de filtro" (recomendar siempre
          lo mismo). Se mitiga parcialmente con estratificación por género y se propone MMR como mejora futura.
        </p>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 4 — Arquitectura del sistema (Act 2.2)        -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <section>
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="text-indigo-400">4.</span> Arquitectura del Sistema
      </h2>
      <p class="text-sm text-gray-400 mb-5">Pipeline de procesamiento desde los datos crudos hasta las recomendaciones finales.</p>

      <!-- Diagrama de pipeline -->
      <div class="bg-gray-900 border border-gray-800 rounded-lg p-6 overflow-x-auto">
        <div class="flex flex-col items-center gap-2 min-w-[600px]">

          <!-- Fila 1: Fuentes de datos -->
          <div class="flex items-center gap-6 w-full justify-center">
            <div class="bg-emerald-900/40 border border-emerald-700 rounded-lg px-4 py-3 text-center min-w-[200px]">
              <div class="text-xs text-emerald-400 font-semibold">Fuente de datos</div>
              <div class="text-white text-sm font-medium mt-1">steam_games.parquet</div>
              <div class="text-[11px] text-gray-400">Catálogo con metadatos</div>
            </div>
            <div class="bg-emerald-900/40 border border-emerald-700 rounded-lg px-4 py-3 text-center min-w-[200px]">
              <div class="text-xs text-emerald-400 font-semibold">Fuente de datos</div>
              <div class="text-white text-sm font-medium mt-1">users_items.parquet</div>
              <div class="text-[11px] text-gray-400">Bibliotecas de usuarios</div>
            </div>
          </div>

          <!-- Flecha -->
          <div class="text-gray-600 text-xl">▼</div>

          <!-- Fila 2: Limpieza -->
          <div class="bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-5 py-3 text-center w-full max-w-md">
            <div class="text-xs text-yellow-400 font-semibold">Preprocesamiento</div>
            <div class="text-white text-sm font-medium mt-1">Limpieza + Feature Engineering</div>
            <div class="text-[11px] text-gray-400">Parseo de listas, deduplicación, normalización de tokens, pesos por feature</div>
          </div>

          <div class="text-gray-600 text-xl">▼</div>

          <!-- Fila 3: Vectorización -->
          <div class="bg-indigo-900/40 border border-indigo-700 rounded-lg px-5 py-3 text-center w-full max-w-md">
            <div class="text-xs text-indigo-400 font-semibold">Representación</div>
            <div class="text-white text-sm font-medium mt-1">Vectorización TF-IDF</div>
            <div class="text-[11px] text-gray-400">Cada juego → vector numérico en espacio de vocabulario (~2,000 × V)</div>
          </div>

          <div class="text-gray-600 text-xl">▼</div>

          <!-- Fila 4: Split V1/V2 -->
          <div class="flex items-start gap-4 w-full justify-center">
            <div class="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-center flex-1 max-w-[220px]">
              <div class="text-xs text-gray-400 font-semibold">Perfil V1 — Baseline</div>
              <div class="text-white text-sm font-medium mt-1">Juego semilla</div>
              <div class="text-[11px] text-gray-400">El de mayor playtime</div>
            </div>
            <div class="bg-indigo-900/40 border border-indigo-600 rounded-lg px-4 py-3 text-center flex-1 max-w-[220px]">
              <div class="text-xs text-indigo-400 font-semibold">Perfil V2 — Mejorado</div>
              <div class="text-white text-sm font-medium mt-1">Centroide ponderado</div>
              <div class="text-[11px] text-gray-400">Promedio log-ponderado de toda la biblioteca</div>
            </div>
          </div>

          <div class="text-gray-600 text-xl">▼</div>

          <!-- Fila 5: Motor -->
          <div class="bg-purple-900/40 border border-purple-700 rounded-lg px-5 py-3 text-center w-full max-w-md">
            <div class="text-xs text-purple-400 font-semibold">Motor de Recomendación</div>
            <div class="text-white text-sm font-medium mt-1">Similitud de Coseno on-demand</div>
            <div class="text-[11px] text-gray-400">1 vector consulta vs N juegos del catálogo — O(N·V) en milisegundos</div>
          </div>

          <div class="text-gray-600 text-xl">▼</div>

          <!-- Fila 6: Post-procesamiento -->
          <div class="bg-orange-900/30 border border-orange-700/50 rounded-lg px-5 py-3 text-center w-full max-w-md">
            <div class="text-xs text-orange-400 font-semibold">Post-procesamiento</div>
            <div class="text-white text-sm font-medium mt-1">Filtro anti-DLC + Exclusión de biblioteca</div>
            <div class="text-[11px] text-gray-400">Descarta DLCs, soundtracks, packs y juegos que el usuario ya tiene</div>
          </div>

          <div class="text-gray-600 text-xl">▼</div>

          <!-- Fila 7: Resultado -->
          <div class="bg-indigo-600 rounded-lg px-5 py-3 text-center w-full max-w-md">
            <div class="text-white text-sm font-bold">Top-N Recomendaciones</div>
          </div>

        </div>
      </div>

      <!-- Módulos -->
      <div class="mt-5 bg-gray-900 border border-gray-800 rounded-lg p-5 text-sm text-gray-300">
        <h3 class="text-white font-semibold mb-3">Módulos del sistema (<code class="text-indigo-300">src/utils/</code>)</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
          <div><code class="text-indigo-300">limpieza.py</code> — Parseo y saneamiento de datos crudos</div>
          <div><code class="text-indigo-300">preparacion_metadata.py</code> — Tokenización y pesos de features</div>
          <div><code class="text-indigo-300">calculo_similitud.py</code> — Motor V1 (semilla única + coseno)</div>
          <div><code class="text-indigo-300">motor_v2.py</code> — Motor V2 (centroide + coseno)</div>
          <div><code class="text-indigo-300">perfil_usuario.py</code> — Construcción del perfil ponderado</div>
          <div><code class="text-indigo-300">filtros.py</code> — Detección y filtrado de DLCs</div>
          <div><code class="text-indigo-300">cold_start.py</code> — Estrategias de arranque en frío</div>
          <div><code class="text-indigo-300">estratificacion.py</code> — Listados balanceados por género</div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 5 — Cold-Start (Act 2.1)                      -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <section>
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="text-indigo-400">5.</span> Problema de Arranque en Frío
      </h2>
      <div class="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4 text-sm text-gray-300 leading-relaxed">
        <p>
          El <strong class="text-white">arranque en frío</strong> (<em>cold-start</em>) ocurre cuando el sistema no tiene
          suficiente información para generar recomendaciones. En nuestro caso:
        </p>
        <ul class="list-disc list-inside space-y-1 ml-2">
          <li><strong class="text-white">Usuarios nuevos:</strong> Sí aplica — un usuario sin biblioteca no tiene vector perfil.
            V1 simplemente fallaba con error 404. V2 ofrece 3 estrategias alternativas.</li>
          <li><strong class="text-white">Ítems nuevos:</strong> No aplica significativamente — el modelo se basa en metadatos del juego (tags,
            developer, specs), no en interacciones. Un juego nuevo con metadatos completos ya puede ser recomendado.</li>
        </ul>
      </div>

      <h3 class="text-white font-semibold mt-6 mb-4">Estrategias implementadas</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <div class="text-lg mb-2">📊</div>
          <h4 class="text-white font-semibold text-sm mb-2">1. Popularidad Global</h4>
          <p class="text-xs text-gray-400 leading-relaxed">
            Se muestra un ranking de los juegos con más jugadores únicos. Es la opción más segura
            pero menos personalizada — funciona como "lo que la mayoría disfruta".
          </p>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <div class="text-lg mb-2">✍️</div>
          <h4 class="text-white font-semibold text-sm mb-2">2. Intereses Textuales</h4>
          <p class="text-xs text-gray-400 leading-relaxed">
            El usuario describe qué le gusta en texto libre (ej: "rpg open_world fantasy"). Estas palabras
            se vectorizan con el mismo TF-IDF del catálogo y se buscan los juegos más similares.
          </p>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <div class="text-lg mb-2">⭐</div>
          <h4 class="text-white font-semibold text-sm mb-2">3. Juego(s) Favorito(s)</h4>
          <p class="text-xs text-gray-400 leading-relaxed">
            El usuario señala 1 a 5 juegos que le gustan. Se calcula el centroide de esos vectores y se
            recomienda a partir de ese perfil compuesto. Es la estrategia más personalizada de cold-start.
          </p>
        </div>
      </div>
      <div class="mt-4">
        <a href="/app/nuevo-usuario.html"
          class="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          Probar → Nuevo Usuario (3 estrategias de cold-start)
        </a>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 6 — Mejoras V1 → V2                           -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <section>
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="text-indigo-400">6.</span> Evolución del Modelo: V1 → V2
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm border border-gray-700 rounded">
          <thead>
            <tr class="bg-gray-800 text-gray-300">
              <th class="px-4 py-2 text-left border-b border-gray-700">Aspecto</th>
              <th class="px-4 py-2 text-left border-b border-gray-700">V1 — Baseline</th>
              <th class="px-4 py-2 text-left border-b border-gray-700">V2 — Mejorado</th>
            </tr>
          </thead>
          <tbody class="text-gray-400">
            <tr class="border-b border-gray-800">
              <td class="px-4 py-2 text-gray-300 font-medium">Perfil de usuario</td>
              <td class="px-4 py-2">1 juego (el de mayor playtime)</td>
              <td class="px-4 py-2 text-indigo-300">Centroide ponderado de toda la biblioteca con pesos logarítmicos</td>
            </tr>
            <tr class="border-b border-gray-800">
              <td class="px-4 py-2 text-gray-300 font-medium">Diversidad del Top-N</td>
              <td class="px-4 py-2">Saturado de DLCs y expansiones</td>
              <td class="px-4 py-2 text-indigo-300">Filtro anti-DLC en post-procesamiento</td>
            </tr>
            <tr class="border-b border-gray-800">
              <td class="px-4 py-2 text-gray-300 font-medium">Usuarios sin historial</td>
              <td class="px-4 py-2">Error HTTP 404</td>
              <td class="px-4 py-2 text-indigo-300">3 estrategias de cold-start</td>
            </tr>
            <tr class="border-b border-gray-800">
              <td class="px-4 py-2 text-gray-300 font-medium">Exploración general</td>
              <td class="px-4 py-2">No existe</td>
              <td class="px-4 py-2 text-indigo-300">Listado estratificado por género</td>
            </tr>
            <tr>
              <td class="px-4 py-2 text-gray-300 font-medium">Performance API</td>
              <td class="px-4 py-2">O(N) por request (filtrado lineal)</td>
              <td class="px-4 py-2 text-indigo-300">O(1) con pre-indexación de bibliotecas</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4">
        <a href="/app/usuario.html"
          class="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          Probar → Mi Perfil (comparación V1 vs V2 lado a lado)
        </a>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 7 — Análisis de Sesgos (Act 3.1 + 3.2)       -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <section>
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="text-indigo-400">7.</span> Análisis de Sesgos
      </h2>

      <h3 class="text-white font-semibold mb-3">Sesgos identificados</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
          <h4 class="text-red-300 font-semibold text-sm mb-1">Sesgo de popularidad</h4>
          <p class="text-xs text-gray-400 leading-relaxed">
            Los juegos populares acumulan más tags comunitarios, lo que infla su vector TF-IDF. Esto provoca
            que aparezcan con mayor similitud frente a casi cualquier consulta, desplazando títulos nicho de alta calidad.
          </p>
        </div>
        <div class="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
          <h4 class="text-red-300 font-semibold text-sm mb-1">Burbuja de filtro</h4>
          <p class="text-xs text-gray-400 leading-relaxed">
            El filtrado basado en contenido recomienda juegos similares a lo que el usuario ya conoce. Con el tiempo,
            las recomendaciones se estrechan y el usuario nunca descubre géneros o estilos diferentes.
          </p>
        </div>
        <div class="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
          <h4 class="text-red-300 font-semibold text-sm mb-1">Sesgo de selección del dataset</h4>
          <p class="text-xs text-gray-400 leading-relaxed">
            El dataset contiene exclusivamente usuarios australianos. Las preferencias culturales de esta
            población no necesariamente representan al mercado global de Steam, lo que limita la generalización.
          </p>
        </div>
        <div class="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
          <h4 class="text-red-300 font-semibold text-sm mb-1">Sesgo de exposición</h4>
          <p class="text-xs text-gray-400 leading-relaxed">
            Los juegos con mayor visibilidad en Steam (portada, ofertas, bundles) acumulan más playtime
            simplemente por exposición, no por calidad intrínseca. El modelo interpreta ese playtime como preferencia real.
          </p>
        </div>
      </div>

      <h3 class="text-white font-semibold mb-3">Mitigaciones</h3>
      <div class="space-y-3">
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex gap-4 items-start">
          <span class="text-green-400 font-bold text-sm mt-0.5">✓</span>
          <div>
            <h4 class="text-white font-medium text-sm">Estratificación por género</h4>
            <p class="text-xs text-gray-400">Contrarresta el sesgo de popularidad en la exploración mostrando K juegos
              por cada género en vez del top-N global (que sería casi todo Action).</p>
          </div>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex gap-4 items-start">
          <span class="text-green-400 font-bold text-sm mt-0.5">✓</span>
          <div>
            <h4 class="text-white font-medium text-sm">Ponderación logarítmica del playtime</h4>
            <p class="text-xs text-gray-400">Atenúa outliers extremos: 10,000 horas en un juego no tiene 100× más peso
              que 100 horas, sino ~2× más. Reduce el impacto del sesgo de exposición en el perfil del usuario.</p>
          </div>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex gap-4 items-start">
          <span class="text-green-400 font-bold text-sm mt-0.5">✓</span>
          <div>
            <h4 class="text-white font-medium text-sm">Filtro anti-DLC</h4>
            <p class="text-xs text-gray-400">Evita que los resultados se saturen de contenido derivado (DLCs, soundtracks,
              season passes), mejorando la diversidad efectiva del top-N.</p>
          </div>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex gap-4 items-start">
          <span class="text-gray-500 font-bold text-sm mt-0.5">○</span>
          <div>
            <h4 class="text-gray-400 font-medium text-sm">Re-ranking con MMR <span class="text-[11px]">(propuesto, no implementado)</span></h4>
            <p class="text-xs text-gray-500">Maximal Marginal Relevance: al construir el top-N, penalizar candidatos
              demasiado similares entre sí para garantizar diversidad intra-lista.</p>
          </div>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex gap-4 items-start">
          <span class="text-gray-500 font-bold text-sm mt-0.5">○</span>
          <div>
            <h4 class="text-gray-400 font-medium text-sm">Modelo híbrido <span class="text-[11px]">(propuesto, no implementado)</span></h4>
            <p class="text-xs text-gray-500">Combinar content-based con collaborative filtering (co-ocurrencia o ALS)
              para romper la burbuja de filtro y capturar patrones no explícitos en los metadatos.</p>
          </div>
        </div>
      </div>
      <div class="mt-4">
        <a href="/app/explorar.html"
          class="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          Probar → Explorar por Género (estratificación como mitigación de sesgo)
        </a>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 8 — Demo interactiva                          -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <section>
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="text-indigo-400">8.</span> Demo Interactiva
      </h2>
      <p class="text-sm text-gray-400 mb-5">Cada página demuestra una capacidad distinta del sistema. Haz clic para probarla en vivo.</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <a href="/app/usuario.html"
          class="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 rounded-lg p-5 transition-all">
          <div class="text-2xl mb-2">👤</div>
          <h3 class="font-semibold text-white group-hover:text-indigo-300 transition-colors">Mi Perfil</h3>
          <p class="text-xs text-gray-400 mt-1">Comparación V1 vs V2 para un usuario existente.</p>
        </a>
        <a href="/app/nuevo-usuario.html"
          class="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 rounded-lg p-5 transition-all">
          <div class="text-2xl mb-2">🆕</div>
          <h3 class="font-semibold text-white group-hover:text-indigo-300 transition-colors">Nuevo Usuario</h3>
          <p class="text-xs text-gray-400 mt-1">Cold-start: popularidad, intereses textuales o selección de favoritos.</p>
        </a>
        <a href="/app/explorar.html"
          class="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 rounded-lg p-5 transition-all">
          <div class="text-2xl mb-2">🔍</div>
          <h3 class="font-semibold text-white group-hover:text-indigo-300 transition-colors">Explorar por Género</h3>
          <p class="text-xs text-gray-400 mt-1">Estratificación — mitigación del sesgo de popularidad.</p>
        </a>
        <a href="/app/juego.html"
          class="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 rounded-lg p-5 transition-all">
          <div class="text-2xl mb-2">🎯</div>
          <h3 class="font-semibold text-white group-hover:text-indigo-300 transition-colors">Buscar Juego Similar</h3>
          <p class="text-xs text-gray-400 mt-1">Similitud de coseno + filtro anti-DLC en acción.</p>
        </a>
      </div>
    </section>

  </div>`;
