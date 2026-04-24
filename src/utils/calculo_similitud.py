import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from src.utils.preparacion_metadata import obtener_juego_semilla

def recomendar_por_juego(item_id: str, top_n: int = 5, excluir: set = None, id_to_idx: dict = None,
                         idx_to_id: dict = None, id_to_nombre: dict = None, matriz_tfidf: np.ndarray = None) -> list[dict]:
    """Devuelve los `top_n` juegos más similares a `item_id`.

    Args:
        item_id: id del juego semilla.
        top_n: cantidad de recomendaciones a devolver.
        excluir: set de item_ids a excluir (típicamente la biblioteca del usuario).
        id_to_idx: diccionario de mapeo de IDs a índices.
        idx_to_id: diccionario de mapeo de índices a IDs.
        id_to_nombre: diccionario de mapeo de IDs a nombres.
        matriz_tfidf: matriz TF-IDF con los vectores de los juegos.

    Returns:
        Lista de dicts {item_id, nombre, similitud}.
    """
    item_id = str(item_id)
    if item_id not in id_to_idx:
        raise ValueError(f'item_id {item_id} no está en el catálogo modelable.')

    idx = id_to_idx[item_id]
    excluir = set(excluir) if excluir else set()
    excluir.add(item_id)  # nunca recomendar el propio juego semilla

    # Vector del juego semilla (1 x V)
    vec_semilla = matriz_tfidf[idx]

    # Similitud coseno contra TODO el catálogo (1 x N)
    sims = cosine_similarity(vec_semilla, matriz_tfidf).flatten()

    # argsort descendente; tomamos margen extra para compensar exclusiones
    margen = top_n + len(excluir) + 5
    top_idx = np.argpartition(-sims, min(margen, len(sims) - 1))[:margen]
    top_idx = top_idx[np.argsort(-sims[top_idx])]

    recomendaciones = []
    for i in top_idx:
        cand_id = idx_to_id[i]
        if cand_id in excluir:
            continue
        recomendaciones.append({
            'item_id': cand_id,
            'nombre': id_to_nombre.get(cand_id, ''),
            'similitud': round(float(sims[i]), 4),
        })
        if len(recomendaciones) >= top_n:
            break

    return recomendaciones

def recomendar_por_usuario(user_id: str, top_n: int = 5, df_users: pd.DataFrame = None,
                           id_to_idx: dict = None, id_to_nombre: dict = None, matriz_tfidf: np.ndarray = None,
                           idx_to_id: dict = None) -> dict:
    """Pipeline completo: usuario → juego semilla → top-N recomendaciones.

    Returns:
        dict con {user_id, juego_base, recomendaciones, mensaje}.
    """
    user_id = str(user_id)
    semilla = obtener_juego_semilla(user_id, df_users, id_to_idx, id_to_nombre)

    if semilla is None:
        return {
            'user_id': user_id,
            'juego_base': None,
            'recomendaciones': [],
            'mensaje': 'Usuario sin juegos modelables en el catálogo.',
        }

    # Excluir TODA la biblioteca del usuario, no solo la semilla
    biblioteca_ids = set(
        df_users.loc[df_users['user_id'] == user_id, 'item_id'].tolist()
    )

    recs = recomendar_por_juego(
        item_id=semilla['item_id'],
        top_n=top_n,
        excluir=biblioteca_ids,
        id_to_idx=id_to_idx,
        idx_to_id=idx_to_id,
        id_to_nombre=id_to_nombre,
        matriz_tfidf=matriz_tfidf
    )

    return {
        'user_id': user_id,
        'juego_base': semilla,
        'recomendaciones': recs,
        'mensaje': 'OK',
    }