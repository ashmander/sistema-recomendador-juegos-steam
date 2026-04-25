"""Motor de recomendación v2.

Mejoras sobre v1:
- Acepta un VECTOR (no un item_id) para permitir centroides de usuario.
- Aplica filtro anti-DLC en post-procesamiento.
- Toma un margen extra interno para compensar exclusiones + DLCs filtrados.
"""

from __future__ import annotations

import numpy as np
from scipy import sparse
from sklearn.metrics.pairwise import cosine_similarity

from .filtros import filtrar_dlcs


def recomendar_desde_vector(
    vector_consulta: np.ndarray,
    matriz_tfidf: sparse.csr_matrix,
    idx_to_id: dict,
    id_to_nombre: dict,
    top_n: int = 5,
    excluir: set | None = None,
    nombre_semilla: str | None = None,
    aplicar_filtro_dlc: bool = True,
) -> list[dict]:
    """Recomendación genérica: dado cualquier vector consulta, devuelve top-N similares.

    Es el "ladrillo base" del motor v2. Acepta vectores arbitrarios para soportar:
      - Centroide de usuario (perfil agregado).
      - Vector de un juego semilla (modo v1).
      - Vector construido desde texto libre (cold-start "(b)").

    Args:
        vector_consulta: array 1D denso de tamaño V (vocabulario).
        matriz_tfidf: matriz dispersa N×V del catálogo.
        idx_to_id: mapping fila → item_id.
        id_to_nombre: mapping item_id → nombre.
        top_n: cantidad final de recomendaciones.
        excluir: item_ids a descartar (típicamente la biblioteca del usuario).
        nombre_semilla: nombre del juego base, usado por el filtro anti-DLC.
        aplicar_filtro_dlc: si False, devuelve sin filtrar (útil para debug).

    Returns:
        Lista de dicts {item_id, nombre, similitud}.
    """
    excluir = set(excluir) if excluir else set()

    # Asegurar que el vector tenga la forma correcta para cosine_similarity
    if vector_consulta.ndim == 1:
        vector_consulta = vector_consulta.reshape(1, -1)

    sims = cosine_similarity(vector_consulta, matriz_tfidf).flatten()

    # Tomamos un margen amplio para compensar exclusiones + DLCs descartados
    margen = top_n + len(excluir) + 30
    margen = min(margen, len(sims) - 1)
    top_idx = np.argpartition(-sims, margen)[:margen]
    top_idx = top_idx[np.argsort(-sims[top_idx])]

    candidatos = []
    for i in top_idx:
        cand_id = idx_to_id[i]
        if cand_id in excluir:
            continue
        candidatos.append({
            'item_id': cand_id,
            'nombre': id_to_nombre.get(cand_id, ''),
            'similitud': round(float(sims[i]), 4),
        })

    if aplicar_filtro_dlc:
        return filtrar_dlcs(candidatos, nombre_semilla=nombre_semilla, top_n=top_n)
    return candidatos[:top_n]


def recomendar_por_usuario_v2(
    user_id: str,
    indice_bibliotecas: dict,
    id_to_idx: dict,
    idx_to_id: dict,
    id_to_nombre: dict,
    matriz_tfidf: sparse.csr_matrix,
    top_n: int = 5,
    aplicar_filtro_dlc: bool = True,
) -> dict:
    """Pipeline completo v2: usuario → centroide ponderado → top-N.

    Diferencia clave con v1: no usa un único juego semilla. Construye el vector
    perfil del usuario como promedio ponderado por playtime de TODOS sus juegos.
    """
    from .perfil_usuario import construir_vector_usuario

    user_id = str(user_id)
    vector_perfil, biblioteca = construir_vector_usuario(
        user_id, indice_bibliotecas, id_to_idx, matriz_tfidf
    )

    if vector_perfil is None:
        return {
            'user_id': user_id,
            'tipo_perfil': 'cold_start',
            'recomendaciones': [],
            'mensaje': 'Usuario sin juegos modelables. Usar endpoint de cold-start.',
        }

    # Para el filtro anti-DLC, usamos como referencia el juego MÁS jugado
    # (no para construir el perfil, sino para identificar la franquicia dominante)
    biblioteca_ord = biblioteca.sort_values('playtime_forever', ascending=False)
    juego_dominante = biblioteca_ord.iloc[0]
    nombre_dominante = juego_dominante['item_name'] or id_to_nombre.get(juego_dominante['item_id'], '')

    excluir = set(biblioteca['item_id'].tolist())

    recs = recomendar_desde_vector(
        vector_consulta=vector_perfil,
        matriz_tfidf=matriz_tfidf,
        idx_to_id=idx_to_id,
        id_to_nombre=id_to_nombre,
        top_n=top_n,
        excluir=excluir,
        nombre_semilla=nombre_dominante,
        aplicar_filtro_dlc=aplicar_filtro_dlc,
    )

    return {
        'user_id': user_id,
        'tipo_perfil': 'centroide_ponderado',
        'n_juegos_usados_para_perfil': len(biblioteca),
        'juego_dominante': {
            'item_id': juego_dominante['item_id'],
            'item_name': nombre_dominante,
            'playtime_forever': float(juego_dominante['playtime_forever']),
        },
        'recomendaciones': recs,
        'mensaje': 'OK',
    }
