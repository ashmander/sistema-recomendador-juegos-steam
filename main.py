"""
API FastAPI para servir las recomendaciones del modelo content-based.

Carga los artefactos generados por el notebook (./artifacts/) en memoria
al arrancar y expone endpoints REST.

Ejecutar:
    uvicorn main:app --reload
Documentación interactiva:
    http://localhost:8000/docs
"""

from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from scipy import sparse
from sklearn.metrics.pairwise import cosine_similarity

# ────────────────────────────────────────────────────────────────────
# Carga única de artefactos al arrancar la app
# ────────────────────────────────────────────────────────────────────
ARTIFACTS_DIR = Path(__file__).parent / "artifacts"

matriz_tfidf = sparse.load_npz(ARTIFACTS_DIR / "matriz_tfidf.npz")
df_catalogo = pd.read_parquet(ARTIFACTS_DIR / "catalogo.parquet")
df_usuarios = pd.read_parquet(ARTIFACTS_DIR / "usuarios.parquet")

# Asegurar tipo string en ids
df_catalogo["id"] = df_catalogo["id"].astype(str)
df_usuarios["user_id"] = df_usuarios["user_id"].astype(str)
df_usuarios["item_id"] = df_usuarios["item_id"].astype(str)

# Índices de búsqueda rápida
id_to_idx = pd.Series(df_catalogo.index.values, index=df_catalogo["id"]).to_dict()
idx_to_id = {v: k for k, v in id_to_idx.items()}
id_to_nombre = pd.Series(df_catalogo["nombre"].values, index=df_catalogo["id"]).to_dict()


# ────────────────────────────────────────────────────────────────────
# Lógica del recomendador (replicada del notebook, sin dependencias extras)
# ────────────────────────────────────────────────────────────────────
def obtener_juego_semilla(user_id: str):
    biblioteca = df_usuarios[df_usuarios["user_id"] == user_id]
    if biblioteca.empty:
        return None
    biblioteca = biblioteca[biblioteca["item_id"].isin(id_to_idx)]
    if biblioteca.empty:
        return None
    semilla = biblioteca.sort_values("playtime_forever", ascending=False).iloc[0]
    return {
        "item_id": semilla["item_id"],
        "item_name": semilla["item_name"] or id_to_nombre.get(semilla["item_id"], ""),
        "playtime_forever": float(semilla["playtime_forever"]),
    }


def recomendar_por_juego(item_id: str, top_n: int = 5, excluir: set = None):
    if item_id not in id_to_idx:
        raise ValueError(f"item_id {item_id} no está en el catálogo modelable.")
    idx = id_to_idx[item_id]
    excluir = set(excluir) if excluir else set()
    excluir.add(item_id)

    sims = cosine_similarity(matriz_tfidf[idx], matriz_tfidf).flatten()

    margen = top_n + len(excluir) + 5
    top_idx = np.argpartition(-sims, min(margen, len(sims) - 1))[:margen]
    top_idx = top_idx[np.argsort(-sims[top_idx])]

    out = []
    for i in top_idx:
        cand_id = idx_to_id[i]
        if cand_id in excluir:
            continue
        out.append({
            "item_id": cand_id,
            "nombre": id_to_nombre.get(cand_id, ""),
            "similitud": round(float(sims[i]), 4),
        })
        if len(out) >= top_n:
            break
    return out


# ────────────────────────────────────────────────────────────────────
# Endpoints
# ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Steam Content-Based Recommender",
    description="Recomienda juegos similares al favorito del usuario usando TF-IDF + coseno.",
    version="1.0.0",
)


@app.get("/")
def root():
    return {
        "message": "Steam Content-Based Recommender",
        "juegos_modelables": len(df_catalogo),
        "usuarios": int(df_usuarios["user_id"].nunique()),
        "endpoints": ["/recomendacion/usuario/{user_id}", "/recomendacion/juego/{item_id}"],
    }


@app.get("/recomendacion/usuario/{user_id}")
def recomendar_usuario(user_id: str, top_n: int = 5):
    """Devuelve top-N juegos para un usuario basado en su juego más jugado."""
    semilla = obtener_juego_semilla(user_id)
    if semilla is None:
        raise HTTPException(404, f"Usuario '{user_id}' sin juegos modelables en catálogo.")

    biblioteca_ids = set(
        df_usuarios.loc[df_usuarios["user_id"] == user_id, "item_id"].tolist()
    )
    recs = recomendar_por_juego(semilla["item_id"], top_n=top_n, excluir=biblioteca_ids)
    return {"user_id": user_id, "juego_base": semilla, "recomendaciones": recs}


@app.get("/recomendacion/juego/{item_id}")
def recomendar_juego(item_id: str, top_n: int = 5):
    """Devuelve top-N juegos similares a un juego dado (sin filtrar por usuario)."""
    try:
        recs = recomendar_por_juego(item_id, top_n=top_n)
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {
        "item_id": item_id,
        "nombre": id_to_nombre.get(item_id, ""),
        "recomendaciones": recs,
    }
