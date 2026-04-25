"""Filtros de post-procesamiento para refinar las recomendaciones.

Implementa la heurística anti-DLC en dos niveles combinados:
- Nivel 1: descartar candidatos cuyo nombre contenga el nombre de la semilla.
- Nivel 3: descartar candidatos con palabras-DLC explícitas en su nombre.

(Nivel 2 — descartar toda la franquicia — se omite intencionalmente porque
"Fallout 3" sí es buena recomendación para alguien que ama "Fallout 4".)
"""

from __future__ import annotations

import re

# Palabras que típicamente identifican contenido derivado (no juegos en sí)
PALABRAS_DLC = {
    'dlc', 'season', 'pass', 'pack', 'expansion', 'soundtrack', 'ost',
    'bonus', 'bundle', 'edition', 'demo', 'beta', 'sdk', 'tool', 'tools',
    'skin', 'skins', 'costume', 'theme',
}


def _normalizar_nombre(nombre: str) -> str:
    """Normaliza un nombre para comparaciones robustas (lowercase, sin puntuación)."""
    if not nombre:
        return ''
    nombre = nombre.lower()
    nombre = re.sub(r'[^a-z0-9\s]', ' ', nombre)
    nombre = re.sub(r'\s+', ' ', nombre).strip()
    return nombre


def es_dlc_o_derivado(nombre_candidato: str, nombre_semilla: str | None = None) -> bool:
    """Determina si un candidato es un DLC, expansión o contenido derivado.

    Combina dos heurísticas:
      - Nivel 1: el nombre del candidato contiene íntegramente el nombre de la semilla
                 (ej: "Fallout 4 - Far Harbor" contiene "Fallout 4")
      - Nivel 3: el nombre del candidato contiene palabras típicas de DLC

    Args:
        nombre_candidato: nombre del juego candidato a recomendar.
        nombre_semilla: nombre del juego semilla (opcional). Si None, solo aplica Nivel 3.

    Returns:
        True si debe filtrarse del top de recomendaciones.
    """
    cand_norm = _normalizar_nombre(nombre_candidato)
    if not cand_norm:
        return False

    # Nivel 1: el candidato contiene el nombre completo de la semilla
    if nombre_semilla:
        sem_norm = _normalizar_nombre(nombre_semilla)
        if sem_norm and sem_norm != cand_norm and sem_norm in cand_norm:
            return True

    # Nivel 3: palabras-DLC en el candidato
    palabras = set(cand_norm.split())
    if palabras & PALABRAS_DLC:
        return True

    return False


def filtrar_dlcs(
    candidatos: list[dict],
    nombre_semilla: str | None = None,
    top_n: int = 5,
) -> list[dict]:
    """Aplica el filtro anti-DLC sobre una lista ordenada de recomendaciones.

    Args:
        candidatos: lista de dicts con al menos la clave `nombre`, ordenados por similitud descendente.
        nombre_semilla: nombre del juego base de la recomendación.
        top_n: cuántos resultados devolver tras filtrar.

    Returns:
        Lista filtrada con hasta `top_n` elementos.
    """
    out = []
    for c in candidatos:
        if es_dlc_o_derivado(c.get('nombre', ''), nombre_semilla):
            continue
        out.append(c)
        if len(out) >= top_n:
            break
    return out
