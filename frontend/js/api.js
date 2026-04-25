/**
 * Cliente HTTP para la API del Sistema Recomendador Steam.
 * Todas las funciones devuelven Promises con el JSON de respuesta.
 */

const BASE = window.location.origin;

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.detail || `Error ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

export function getStats() {
  return fetchJSON(`${BASE}/`);
}

export function compararVersiones(userId, topN = 10) {
  return fetchJSON(
    `${BASE}/comparar/usuario/${encodeURIComponent(userId)}?top_n=${topN}`,
  );
}

export function getRecomendacionJuegoV2(itemId, topN = 10) {
  return fetchJSON(
    `${BASE}/v2/recomendacion/juego/${encodeURIComponent(itemId)}?top_n=${topN}`,
  );
}

export function getColdStartPopularidad(topN = 10) {
  return fetchJSON(`${BASE}/v2/cold-start/popularidad?top_n=${topN}`);
}

export function getColdStartIntereses(intereses, topN = 10) {
  return fetchJSON(
    `${BASE}/v2/cold-start/intereses?intereses=${encodeURIComponent(intereses)}&top_n=${topN}`,
  );
}

export function postColdStartFavoritos(itemIds, topN = 10) {
  return fetchJSON(`${BASE}/v2/cold-start/favoritos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_ids: itemIds, top_n: topN }),
  });
}

export function getEstratificado(kPorGenero = 1, generos = null) {
  let url = `${BASE}/v2/explorar/estratificado?k_por_genero=${kPorGenero}`;
  if (generos) url += `&generos=${encodeURIComponent(generos)}`;
  return fetchJSON(url);
}
