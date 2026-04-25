"""Construcción del perfil del usuario para el modelo v2.

A diferencia de v1 (que usaba un único juego semilla con max playtime),
v2 construye un VECTOR PERFIL como centroide ponderado de todos los juegos
del usuario, ponderados por horas jugadas.

Esto captura el "gusto agregado" del usuario en lugar de un solo punto.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import sparse


def construir_indice_bibliotecas(df_users: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """Pre-indexa la biblioteca de cada usuario para evitar filtros lineales en cada request.

    Mejora de rendimiento crítica para la API: convierte un O(N) por request
    en un O(1) de lookup. Para ~30k usuarios el dict ocupa pocos MB.

    Returns:
        dict {user_id: DataFrame con columnas item_id, item_name, playtime_forever}
    """
    df = df_users.copy()
    df['user_id'] = df['user_id'].astype(str)
    df['item_id'] = df['item_id'].astype(str)
    return {
        uid: grupo[['item_id', 'item_name', 'playtime_forever']].reset_index(drop=True)
        for uid, grupo in df.groupby('user_id', sort=False)
    }


def construir_vector_usuario(
    user_id: str,
    indice_bibliotecas: dict,
    id_to_idx: dict,
    matriz_tfidf: sparse.csr_matrix,
    log_playtime: bool = True,
) -> tuple[np.ndarray | None, pd.DataFrame | None]:
    """Calcula el centroide ponderado del usuario en el espacio TF-IDF.

    El vector resultante representa el "gusto agregado" del usuario:
    promedio ponderado por playtime de los vectores de todos sus juegos
    presentes en el catálogo modelable.

    Args:
        user_id: identificador del usuario.
        indice_bibliotecas: dict precomputado por `construir_indice_bibliotecas`.
        id_to_idx: mapping item_id → índice en la matriz TF-IDF.
        matriz_tfidf: matriz dispersa de juegos × vocabulario.
        log_playtime: si True, aplica log(1 + playtime) para suavizar el peso de
            juegos extremadamente jugados (10000h vs 100h no debería ser 100×
            más importante, sino ~2× más).

    Returns:
        (vector_perfil, df_juegos_usados) o (None, None) si el usuario no
        tiene juegos modelables.
    """
    user_id = str(user_id)
    biblioteca = indice_bibliotecas.get(user_id)
    if biblioteca is None or biblioteca.empty:
        return None, None

    # Filtrar a juegos que existen en el catálogo modelable
    biblioteca = biblioteca[biblioteca['item_id'].isin(id_to_idx)].copy()
    if biblioteca.empty:
        return None, None

    # Pesos: playtime (con suavizado log para no dominar por outliers)
    playtimes = biblioteca['playtime_forever'].astype(float).clip(lower=0).values
    if log_playtime:
        pesos = np.log1p(playtimes)
    else:
        pesos = playtimes

    # Si todos los pesos son 0 (usuario nunca jugó nada), usar peso uniforme
    if pesos.sum() == 0:
        pesos = np.ones_like(pesos)

    pesos = pesos / pesos.sum()  # normalizar a 1

    # Recuperar las filas correspondientes de la matriz TF-IDF
    indices = biblioteca['item_id'].map(id_to_idx).values
    sub_matriz = matriz_tfidf[indices]  # (n_juegos_usuario, V) dispersa

    # Centroide ponderado: sum_i (peso_i * vector_i)
    # Como matriz dispersa.multiply(vector_columna) hace broadcasting por fila:
    pesos_columna = sparse.csr_matrix(pesos.reshape(-1, 1))
    vector_perfil = sub_matriz.multiply(pesos_columna).sum(axis=0)
    vector_perfil = np.asarray(vector_perfil).flatten()

    biblioteca['peso_normalizado'] = pesos
    return vector_perfil, biblioteca
