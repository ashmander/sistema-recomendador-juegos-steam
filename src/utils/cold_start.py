"""Estrategias de cold-start para usuarios nuevos.

Cuando un usuario no existe en el catálogo modelable (o no tiene juegos en su
biblioteca), no podemos construir un perfil. Este módulo provee dos vías:

1. recomendar_por_popularidad: ranking global, sin personalización.
2. recomendar_por_intereses_texto: el usuario describe gustos en texto libre,
   vectorizamos con el mismo TfidfVectorizer y ese vector actúa como semilla.
3. recomendar_por_juego_favorito: el usuario nombra un juego del catálogo que
   le gusta y se trata como semilla (equivale a v1 pero pensado para nuevos).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer

from .motor_v2 import recomendar_desde_vector


def calcular_popularidad(
    df_users: pd.DataFrame,
    df_catalogo: pd.DataFrame,
    metodo: str = 'jugadores',
) -> pd.DataFrame:
    """Calcula un ranking de popularidad global por juego.

    Args:
        df_users: DataFrame long-format con (user_id, item_id, playtime_forever).
        df_catalogo: DataFrame con (id, nombre).
        metodo: criterio de ranking.
            - 'jugadores': nº de usuarios distintos con el juego (más justo, evita sesgo de outliers).
            - 'playtime_total': suma total de horas jugadas (favorece juegos longevos).
            - 'playtime_mediano': mediana de playtime entre los jugadores (calidad percibida).

    Returns:
        DataFrame ordenado descendentemente con columnas (item_id, nombre, score).
    """
    df_users = df_users.copy()
    df_users['item_id'] = df_users['item_id'].astype(str)

    if metodo == 'jugadores':
        rank = df_users.groupby('item_id')['user_id'].nunique()
    elif metodo == 'playtime_total':
        rank = df_users.groupby('item_id')['playtime_forever'].sum()
    elif metodo == 'playtime_mediano':
        # Solo consideramos usuarios que efectivamente jugaron (>0 minutos)
        df_jugado = df_users[df_users['playtime_forever'] > 0]
        rank = df_jugado.groupby('item_id')['playtime_forever'].median()
    else:
        raise ValueError(f"método '{metodo}' no soportado")

    rank = rank.reset_index(name='score').rename(columns={'item_id': 'id'})
    rank['id'] = rank['id'].astype(str)

    # Cruzamos con el catálogo para traer el nombre y filtrar a juegos modelables
    df_cat = df_catalogo[['id', 'nombre']].copy()
    df_cat['id'] = df_cat['id'].astype(str)
    rank = rank.merge(df_cat, on='id', how='inner')

    return rank.sort_values('score', ascending=False).reset_index(drop=True)


def recomendar_por_popularidad(
    df_popularidad: pd.DataFrame,
    top_n: int = 5,
    excluir: set | None = None,
) -> list[dict]:
    """Devuelve los top-N juegos más populares (con opción de excluir conocidos).

    Args:
        df_popularidad: ranking precomputado por `calcular_popularidad`.
        top_n: cuántos devolver.
        excluir: item_ids a omitir.

    Returns:
        Lista de dicts {item_id, nombre, score}.
    """
    excluir = set(excluir) if excluir else set()
    df = df_popularidad[~df_popularidad['id'].isin(excluir)].head(top_n)
    return [
        {'item_id': r['id'], 'nombre': r['nombre'], 'score': float(r['score'])}
        for _, r in df.iterrows()
    ]


def recomendar_por_intereses_texto(
    intereses: str,
    vectorizer: TfidfVectorizer,
    matriz_tfidf: sparse.csr_matrix,
    idx_to_id: dict,
    id_to_nombre: dict,
    top_n: int = 5,
    excluir: set | None = None,
) -> list[dict]:
    """Cold-start textual: el usuario describe sus gustos y vectorizamos.

    Ejemplos de input:
      - "action shooter multiplayer"
      - "rpg fantasy story_rich"
      - "puzzle indie casual"

    Importante: las palabras deben coincidir con tokens del vocabulario del
    vectorizer (en general son tags de Steam normalizados). Si el usuario
    escribe palabras que no están en el vocabulario, el vector será 0 y la
    similitud no funcionará.

    Args:
        intereses: cadena con palabras clave separadas por espacios.
        vectorizer: el TfidfVectorizer entrenado con el catálogo.
        matriz_tfidf: matriz N×V del catálogo.
        idx_to_id, id_to_nombre: mappings.
        top_n: cantidad de recomendaciones.
        excluir: item_ids a omitir.

    Returns:
        Lista de recomendaciones (vacía si los intereses no matchean nada).
    """
    if not intereses or not intereses.strip():
        return []

    vector = vectorizer.transform([intereses.lower().strip()])

    # Si el vector es completamente 0, no hay match con el vocabulario
    if vector.nnz == 0:
        return []

    return recomendar_desde_vector(
        vector_consulta=np.asarray(vector.todense()).flatten(),
        matriz_tfidf=matriz_tfidf,
        idx_to_id=idx_to_id,
        id_to_nombre=id_to_nombre,
        top_n=top_n,
        excluir=excluir,
        nombre_semilla=None,  # no hay semilla, no aplicamos filtro de franquicia
        aplicar_filtro_dlc=True,  # pero sí filtramos palabras-DLC explícitas
    )


def recomendar_por_juego_favorito(
    item_id_favorito: str,
    matriz_tfidf: sparse.csr_matrix,
    id_to_idx: dict,
    idx_to_id: dict,
    id_to_nombre: dict,
    top_n: int = 5,
) -> list[dict]:
    """Cold-start por juego favorito: usuario nombra un juego del catálogo que le gusta.

    Útil para usuarios que aún no tienen biblioteca propia pero pueden señalar
    un juego de referencia. Equivale a recomendar similares a ese juego.
    """
    item_id_favorito = str(item_id_favorito)
    if item_id_favorito not in id_to_idx:
        raise ValueError(f"item_id {item_id_favorito} no está en el catálogo modelable.")

    idx = id_to_idx[item_id_favorito]
    vector = np.asarray(matriz_tfidf[idx].todense()).flatten()
    nombre_fav = id_to_nombre.get(item_id_favorito, '')

    return recomendar_desde_vector(
        vector_consulta=vector,
        matriz_tfidf=matriz_tfidf,
        idx_to_id=idx_to_id,
        id_to_nombre=id_to_nombre,
        top_n=top_n,
        excluir={item_id_favorito},
        nombre_semilla=nombre_fav,
        aplicar_filtro_dlc=True,
    )
