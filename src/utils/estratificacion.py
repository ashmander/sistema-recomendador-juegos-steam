"""Estratificación de juegos por género para listados variados.

Resuelve el problema de "no quiero ver 50 juegos de acción seguidos".
Toma K juegos de cada género distinto, garantizando diversidad en el output.
"""

from __future__ import annotations

import pandas as pd


def construir_indice_por_genero(df_catalogo: pd.DataFrame) -> dict[str, list[str]]:
    """Pre-indexa los juegos del catálogo por género para acceso O(1).

    Cada juego puede pertenecer a múltiples géneros, así que aparecerá en
    todas las listas correspondientes.

    Args:
        df_catalogo: debe tener columnas 'id' y 'genres' (lista de strings).

    Returns:
        dict {genero_normalizado: [item_id1, item_id2, ...]}
    """
    indice: dict[str, list[str]] = {}
    for _, row in df_catalogo[['id', 'genres']].iterrows():
        item_id = str(row['id'])
        genres = row['genres'] if isinstance(row['genres'], list) else []
        for g in genres:
            if not g:
                continue
            clave = str(g).strip().lower()
            indice.setdefault(clave, []).append(item_id)
    return indice


def listar_juegos_estratificados(
    indice_por_genero: dict[str, list[str]],
    df_popularidad: pd.DataFrame,
    id_to_nombre: dict,
    k_por_genero: int = 3,
    generos: list[str] | None = None,
    excluir: set | None = None,
) -> dict:
    """Devuelve un listado de juegos balanceado por género.

    Para cada género, toma los K juegos más populares dentro de ese género.
    El resultado es un dict {genero: [juegos]} para que el cliente pueda
    renderizar secciones distintas en su UI.

    Args:
        indice_por_genero: salida de `construir_indice_por_genero`.
        df_popularidad: DataFrame con columnas (id, score) precalculado.
        id_to_nombre: mapping para resolver nombres.
        k_por_genero: cuántos juegos tomar de cada género.
        generos: si se especifica, filtra a solo esos géneros (en lowercase).
            Si es None, usa todos los géneros disponibles.
        excluir: item_ids a omitir (típicamente la biblioteca del usuario).

    Returns:
        dict con estructura:
        {
          'k_por_genero': int,
          'generos': {
              'action': [{'item_id', 'nombre', 'score'}, ...],
              'rpg': [...],
              ...
          }
        }
    """
    excluir = set(excluir) if excluir else set()
    pop_dict = dict(zip(df_popularidad['id'].astype(str), df_popularidad['score']))

    if generos is None:
        generos_a_usar = list(indice_por_genero.keys())
    else:
        generos_a_usar = [g.lower() for g in generos]

    salida = {}
    for genero in generos_a_usar:
        ids_del_genero = indice_por_genero.get(genero, [])
        if not ids_del_genero:
            continue

        # Ordenar los juegos del género por popularidad (los que no están en pop_dict
        # quedan al final con score 0)
        candidatos = [
            (gid, pop_dict.get(gid, 0.0))
            for gid in ids_del_genero
            if gid not in excluir
        ]
        candidatos.sort(key=lambda x: x[1], reverse=True)

        top = candidatos[:k_por_genero]
        salida[genero] = [
            {
                'item_id': gid,
                'nombre': id_to_nombre.get(gid, ''),
                'score': float(score),
            }
            for gid, score in top
        ]

    return {
        'k_por_genero': k_por_genero,
        'generos': salida,
    }
