import pandas as pd
import numpy as np
import ast

def _ensure_list(val):
    """Normaliza a lista preservando el tipo de los elementos internos."""
    if val is None:
        return []
    if isinstance(val, float) and np.isnan(val):
        return []
    if isinstance(val, np.ndarray):
        return [x for x in val.tolist() if x is not None]   # sin str()
    if isinstance(val, list):
        return [x for x in val if x is not None]            # sin str()
    if isinstance(val, str):
        return [val]
    return []


def limpiar_catalogo(df: pd.DataFrame) -> pd.DataFrame:
    """Limpieza mínima del catálogo de juegos para el modelo content-based."""
    df = df.copy()

    # 1. Eliminar filas completamente vacías
    df = df.dropna(how='all').reset_index(drop=True)

    # 2. Filtrar juegos sin id (no se pueden referenciar)
    df = df[df['id'].notna()].copy()
    df['id'] = df['id'].astype(str)

    # 3. Normalizar columnas tipo-lista
    list_cols = ['genres', 'tags', 'specs']
    for col in list_cols:
        if col in df.columns:
            df[col] = df[col].apply(_ensure_list)
        else:
            df[col] = [[] for _ in range(len(df))]

    # 4. Normalizar columnas de texto opcionales
    for col in ['developer', 'publisher', 'app_name', 'title']:
        if col in df.columns:
            df[col] = df[col].fillna('').astype(str)
        else:
            df[col] = ''

    # 5. Garantizar nombre del juego (preferimos app_name, fallback a title)
    df['nombre'] = df['app_name'].where(df['app_name'] != '', df['title'])

    # 6. Filtrar juegos sin ningún metadato útil
    sin_contenido = (
        df['genres'].apply(len).eq(0)
        & df['tags'].apply(len).eq(0)
        & df['specs'].apply(len).eq(0)
    )
    print(f'  - Juegos sin metadatos descartados: {sin_contenido.sum()}')
    df = df[~sin_contenido].copy()

    # 7. Quitar duplicados por id (nos quedamos con la primera ocurrencia)
    antes = len(df)
    df = df.drop_duplicates(subset='id', keep='first').reset_index(drop=True)
    print(f'  - Duplicados eliminados: {antes - len(df)}')

    return df

def _parsear_lista_serializada(val):
    """Si el valor es un string que parece una lista, lo parsea. Si ya es lista, lo devuelve."""
    if isinstance(val, str) and val.strip().startswith('['):
        try:
            return ast.literal_eval(val)
        except (ValueError, SyntaxError):
            return [val]
    return val

def _parsear_literal(val):
    """Convierte un string con un literal Python serializado en el objeto real.
    Funciona para listas de strings, listas de dicts, o cualquier literal válido.
    """
    if val is None:
        return []
    if isinstance(val, float) and np.isnan(val):
        return []
    if isinstance(val, (list, np.ndarray)):
        return list(val)
    if isinstance(val, str):
        s = val.strip()
        if s in ('', '[]'):
            return []
        try:
            parsed = ast.literal_eval(s)
            return list(parsed) if isinstance(parsed, (list, tuple)) else []
        except (ValueError, SyntaxError):
            return []
    return []

def explotar_usuarios(df_users: pd.DataFrame) -> pd.DataFrame:
    """Convierte el formato (user, [items]) en long format (user, item, playtime)."""
    df = df_users[['user_id', 'items']].copy()
    df = df[df['items'].notna()].copy()
    df['items'] = df['items'].apply(_ensure_list)
    df = df[df['items'].apply(len) > 0].copy()
    print(df.head(3))
    # explode → una fila por dict de item
    df = df.explode('items', ignore_index=True)
    df = df[df['items'].notna()].reset_index(drop=True)
    print(df.head(3))
    # Extraemos campos del dict; manejamos casos donde algún campo falta
    df['item_id'] = df['items'].apply(
        lambda d: str(d.get('item_id')) if isinstance(d, dict) and d.get('item_id') is not None else None
    )
    print(df.head(3))
    df['item_name'] = df['items'].apply(
        lambda d: d.get('item_name') if isinstance(d, dict) else None
    )
    print(df.head(3))
    df['playtime_forever'] = df['items'].apply(
        lambda d: d.get('playtime_forever', 0) if isinstance(d, dict) else 0
    )
    print(df.head(3))
    df['playtime_forever'] = pd.to_numeric(df['playtime_forever'], errors='coerce').fillna(0)
    print(df.head(3))
    df = df[df['item_id'].notna()].drop(columns='items').reset_index(drop=True)
    df['user_id'] = df['user_id'].astype(str)
    return df