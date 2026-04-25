"""
API FastAPI — Steam Content-Based Recommender (v1 + v2 unificados).

Esta API expone DOS versiones del recomendador en paralelo:

  v1: modelo base (juego semilla = max playtime, sin filtros).
  v2: modelo mejorado (centroide ponderado, filtro anti-DLC, cold-start, etc.).

Mantener ambas permite comparar resultados lado a lado desde Swagger.

Ejecutar:
    uv run uvicorn main:app --reload
Documentación interactiva:
    http://localhost:8000/docs
"""

import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from scipy import sparse
from sklearn.metrics.pairwise import cosine_similarity

# ──── Imports v1 (módulos originales) ────
from src.utils.calculo_similitud import recomendar_por_juego as recomendar_juego_v1
from src.utils.preparacion_metadata import obtener_juego_semilla as obtener_semilla_v1

# ──── Imports v2 (módulos nuevos) ────
from src.utils.cold_start import (
    recomendar_por_intereses_texto,
    recomendar_por_juego_favorito,
    recomendar_por_popularidad,
)
from src.utils.estratificacion import listar_juegos_estratificados
from src.utils.motor_v2 import recomendar_por_usuario_v2
from src.utils.perfil_usuario import construir_indice_bibliotecas


# ════════════════════════════════════════════════════════════════════
# Carga única de artefactos al arrancar la app
# ════════════════════════════════════════════════════════════════════
ARTIFACTS_DIR = Path(__file__).parent / "artifacts"

print("Cargando artefactos...")

# Artefactos compartidos por v1 y v2
matriz_tfidf = sparse.load_npz(ARTIFACTS_DIR / "matriz_tfidf.npz")
df_catalogo = pd.read_parquet(ARTIFACTS_DIR / "catalogo.parquet")
df_usuarios = pd.read_parquet(ARTIFACTS_DIR / "usuarios.parquet")

# Artefactos solo de v2
df_popularidad = pd.read_parquet(ARTIFACTS_DIR / "popularidad.parquet")
with open(ARTIFACTS_DIR / "indice_por_genero.pkl", "rb") as f:
    indice_por_genero = pickle.load(f)
with open(ARTIFACTS_DIR / "vectorizer.pkl", "rb") as f:
    vectorizer = pickle.load(f)

# Asegurar tipos string en ids
df_catalogo["id"] = df_catalogo["id"].astype(str)
df_usuarios["user_id"] = df_usuarios["user_id"].astype(str)
df_usuarios["item_id"] = df_usuarios["item_id"].astype(str)

# Índices de búsqueda rápida
id_to_idx = pd.Series(df_catalogo.index.values, index=df_catalogo["id"]).to_dict()
idx_to_id = {v: k for k, v in id_to_idx.items()}
id_to_nombre = pd.Series(df_catalogo["nombre"].values, index=df_catalogo["id"]).to_dict()

# Pre-indexación de bibliotecas (mejora de rendimiento, usado por v2)
indice_bibliotecas = construir_indice_bibliotecas(df_usuarios)

print(f"  Catálogo: {len(df_catalogo):,} juegos modelables")
print(f"  Usuarios indexados: {len(indice_bibliotecas):,}")
print(f"  Géneros disponibles: {len(indice_por_genero)}")
print("Artefactos cargados. API lista.")


# ════════════════════════════════════════════════════════════════════
# App
# ════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="Steam Content-Based Recommender",
    description=(
        "Sistema de recomendación basado en contenido. Expone dos versiones:\n\n"
        "**v1 (baseline):** un único juego semilla con max playtime, sin filtros.\n\n"
        "**v2 (mejorado):** centroide ponderado de toda la biblioteca, "
        "filtro anti-DLC, estrategias de cold-start y listados estratificados.\n\n"
        "Ambas versiones se pueden consultar lado a lado para comparación."
    ),
    version="2.0.0",
)


@app.get("/", tags=["info"])
def root():
    """Información general de la API y listado de endpoints."""
    return {
        "name": "Steam Content-Based Recommender",
        "version": "2.0.0",
        "juegos_modelables": len(df_catalogo),
        "usuarios": len(indice_bibliotecas),
        "generos": len(indice_por_genero),
        "endpoints_v1": {
            "personalizado": "/v1/recomendacion/usuario/{user_id}",
            "por_juego": "/v1/recomendacion/juego/{item_id}",
        },
        "endpoints_v2": {
            "personalizado": "/v2/recomendacion/usuario/{user_id}",
            "por_juego": "/v2/recomendacion/juego/{item_id}",
            "cold_start_popularidad": "/v2/cold-start/popularidad",
            "cold_start_intereses": "/v2/cold-start/intereses?intereses=...",
            "cold_start_favorito": "/v2/cold-start/favorito/{item_id}",
            "estratificado": "/v2/explorar/estratificado",
        },
    }


# ════════════════════════════════════════════════════════════════════
# V1 — Modelo baseline (sin filtros, juego semilla único)
# ════════════════════════════════════════════════════════════════════
@app.get("/v1/recomendacion/usuario/{user_id}", tags=["v1 — baseline"])
def v1_recomendar_usuario(user_id: str, top_n: int = Query(5, ge=1, le=50)):
    """[v1] Top-N juegos para un usuario, basado en su juego con MAX playtime.

    Sin filtro anti-DLC: si el juego semilla es Fallout 4, las recomendaciones
    incluirán DLCs y season passes del mismo juego.
    """
    semilla = obtener_semilla_v1(user_id, df_usuarios, id_to_idx, id_to_nombre)
    if semilla is None:
        raise HTTPException(404, f"Usuario '{user_id}' sin juegos modelables en catálogo.")

    biblioteca_ids = set(
        df_usuarios.loc[df_usuarios["user_id"] == user_id, "item_id"].tolist()
    )
    recs = recomendar_juego_v1(
        item_id=semilla["item_id"],
        top_n=top_n,
        excluir=biblioteca_ids,
        id_to_idx=id_to_idx,
        idx_to_id=idx_to_id,
        id_to_nombre=id_to_nombre,
        matriz_tfidf=matriz_tfidf,
    )
    return {
        "version": "v1",
        "user_id": user_id,
        "juego_base": semilla,
        "recomendaciones": recs,
    }


@app.get("/v1/recomendacion/juego/{item_id}", tags=["v1 — baseline"])
def v1_recomendar_juego(item_id: str, top_n: int = Query(5, ge=1, le=50)):
    """[v1] Top-N juegos similares a uno dado (sin filtro anti-DLC)."""
    try:
        recs = recomendar_juego_v1(
            item_id=item_id,
            top_n=top_n,
            excluir=None,
            id_to_idx=id_to_idx,
            idx_to_id=idx_to_id,
            id_to_nombre=id_to_nombre,
            matriz_tfidf=matriz_tfidf,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {
        "version": "v1",
        "item_id": item_id,
        "nombre": id_to_nombre.get(item_id, ""),
        "recomendaciones": recs,
    }


# ════════════════════════════════════════════════════════════════════
# V2 — Modelo mejorado (centroide + filtros + cold-start + estratificación)
# ════════════════════════════════════════════════════════════════════
@app.get("/v2/recomendacion/usuario/{user_id}", tags=["v2 — mejorado"])
def v2_recomendar_usuario(user_id: str, top_n: int = Query(5, ge=1, le=50)):
    """[v2] Top-N juegos para un usuario usando centroide ponderado de toda su biblioteca.

    Aplica filtro anti-DLC en post-procesamiento. Si el usuario no tiene juegos
    modelables, devuelve `tipo_perfil='cold_start'` con sugerencia de endpoints
    alternativos (sin lanzar 404).
    """
    resultado = recomendar_por_usuario_v2(
        user_id=user_id,
        indice_bibliotecas=indice_bibliotecas,
        id_to_idx=id_to_idx,
        idx_to_id=idx_to_id,
        id_to_nombre=id_to_nombre,
        matriz_tfidf=matriz_tfidf,
        top_n=top_n,
    )
    if resultado["tipo_perfil"] == "cold_start":
        return {
            **resultado,
            "version": "v2",
            "sugerencia": (
                "Use /v2/cold-start/popularidad, /v2/cold-start/intereses "
                "o /v2/cold-start/favorito/{item_id}"
            ),
        }
    return {**resultado, "version": "v2"}


@app.get("/v2/recomendacion/juego/{item_id}", tags=["v2 — mejorado"])
def v2_recomendar_juego(item_id: str, top_n: int = Query(5, ge=1, le=50)):
    """[v2] Top-N juegos similares a uno dado, con filtro anti-DLC."""
    try:
        recs = recomendar_por_juego_favorito(
            item_id_favorito=item_id,
            matriz_tfidf=matriz_tfidf,
            id_to_idx=id_to_idx,
            idx_to_id=idx_to_id,
            id_to_nombre=id_to_nombre,
            top_n=top_n,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {
        "version": "v2",
        "item_id": item_id,
        "nombre": id_to_nombre.get(item_id, ""),
        "recomendaciones": recs,
    }


@app.get("/v2/cold-start/popularidad", tags=["v2 — cold start"])
def v2_cold_start_popularidad(top_n: int = Query(10, ge=1, le=50)):
    """[v2 cold-start] Top-N juegos más populares (medido por nº de jugadores únicos)."""
    recs = recomendar_por_popularidad(df_popularidad, top_n=top_n)
    return {"version": "v2", "estrategia": "popularidad_global", "recomendaciones": recs}


@app.get("/v2/cold-start/intereses", tags=["v2 — cold start"])
def v2_cold_start_intereses(
    intereses: str = Query(
        ...,
        description="Palabras clave separadas por espacios. Ej: 'action shooter multiplayer'",
    ),
    top_n: int = Query(5, ge=1, le=50),
):
    """[v2 cold-start] Recomendación a partir de intereses descritos en texto.

    El usuario describe qué tipo de juegos le gustan usando palabras clave
    (deberían coincidir con tags del ecosistema Steam).
    """
    recs = recomendar_por_intereses_texto(
        intereses=intereses,
        vectorizer=vectorizer,
        matriz_tfidf=matriz_tfidf,
        idx_to_id=idx_to_id,
        id_to_nombre=id_to_nombre,
        top_n=top_n,
    )
    if not recs:
        raise HTTPException(
            404,
            "Las palabras ingresadas no coinciden con ningún token del vocabulario. "
            "Prueba con tags conocidos como 'action', 'rpg', 'indie', etc.",
        )
    return {
        "version": "v2",
        "estrategia": "intereses_texto",
        "intereses": intereses,
        "recomendaciones": recs,
    }


@app.get("/v2/cold-start/favorito/{item_id}", tags=["v2 — cold start"])
def v2_cold_start_favorito(item_id: str, top_n: int = Query(5, ge=1, le=50)):
    """[v2 cold-start] Recomendación a partir de un juego que al usuario le guste.

    Útil cuando el usuario es nuevo pero puede señalar al menos un juego de
    referencia. Internamente usa ese juego como semilla con filtro anti-DLC.
    """
    try:
        recs = recomendar_por_juego_favorito(
            item_id_favorito=item_id,
            matriz_tfidf=matriz_tfidf,
            id_to_idx=id_to_idx,
            idx_to_id=idx_to_id,
            id_to_nombre=id_to_nombre,
            top_n=top_n,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {
        "version": "v2",
        "estrategia": "juego_favorito",
        "juego_referencia": {"item_id": item_id, "nombre": id_to_nombre.get(item_id, "")},
        "recomendaciones": recs,
    }


@app.get("/v2/explorar/estratificado", tags=["v2 — exploración"])
def v2_explorar_estratificado(
    k_por_genero: int = Query(3, ge=1, le=20),
    generos: str | None = Query(
        None,
        description="Lista CSV de géneros a incluir. Si vacío, todos los disponibles.",
    ),
):
    """[v2] Listado de juegos balanceado por género para descubrimiento variado.

    En lugar de devolver los N juegos más populares (que tienden a ser todos
    del mismo género dominante), devuelve K juegos de CADA género solicitado.
    """
    lista_generos = None
    if generos:
        lista_generos = [g.strip() for g in generos.split(",") if g.strip()]

    return {
        "version": "v2",
        **listar_juegos_estratificados(
            indice_por_genero=indice_por_genero,
            df_popularidad=df_popularidad,
            id_to_nombre=id_to_nombre,
            k_por_genero=k_por_genero,
            generos=lista_generos,
        ),
    }


# ════════════════════════════════════════════════════════════════════
# Endpoint comparativo (bonus)
# ════════════════════════════════════════════════════════════════════
@app.get("/comparar/usuario/{user_id}", tags=["comparativo"])
def comparar_versiones(user_id: str, top_n: int = Query(5, ge=1, le=20)):
    """Devuelve las recomendaciones de v1 y v2 lado a lado para un mismo usuario.

    Útil para evaluación cualitativa: ver de un vistazo cómo cambian las
    recomendaciones entre el modelo baseline y el mejorado.
    """
    # v1
    semilla_v1 = obtener_semilla_v1(user_id, df_usuarios, id_to_idx, id_to_nombre)
    if semilla_v1 is None:
        v1_resp = {"juego_base": None, "recomendaciones": [], "mensaje": "cold start"}
    else:
        biblioteca_ids = set(
            df_usuarios.loc[df_usuarios["user_id"] == user_id, "item_id"].tolist()
        )
        v1_recs = recomendar_juego_v1(
            item_id=semilla_v1["item_id"],
            top_n=top_n,
            excluir=biblioteca_ids,
            id_to_idx=id_to_idx,
            idx_to_id=idx_to_id,
            id_to_nombre=id_to_nombre,
            matriz_tfidf=matriz_tfidf,
        )
        v1_resp = {"juego_base": semilla_v1, "recomendaciones": v1_recs}

    # v2
    v2_resp = recomendar_por_usuario_v2(
        user_id=user_id,
        indice_bibliotecas=indice_bibliotecas,
        id_to_idx=id_to_idx,
        idx_to_id=idx_to_id,
        id_to_nombre=id_to_nombre,
        matriz_tfidf=matriz_tfidf,
        top_n=top_n,
    )

    return {"user_id": user_id, "v1": v1_resp, "v2": v2_resp}
