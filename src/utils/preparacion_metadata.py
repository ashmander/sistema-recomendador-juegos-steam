import re
import unicodedata 
import pandas as pd

def _normalizar_token(texto: str) -> str:
    """Quita tildes, pasa a minúsculas, deja solo alfanumérico y guion bajo."""
    if not texto:
        return ''
    # Quitar tildes (NFD descompone, luego filtramos los marcadores combinatorios)
    texto = unicodedata.normalize('NFD', texto)
    texto = ''.join(c for c in texto if unicodedata.category(c) != 'Mn')
    texto = texto.lower()
    # Sustituir espacios por _ para mantener tokens compuestos
    texto = re.sub(r'\s+', '_', texto.strip())
    # Eliminar todo lo que no sea letra/número/guion bajo
    texto = re.sub(r'[^a-z0-9_]', '', texto)
    return texto


def _tokens_de_lista(items, peso: int) -> list:
    """Aplica normalización a cada elemento de una lista y lo repite `peso` veces."""
    if peso <= 0:
        return []
    tokens = [_normalizar_token(x) for x in items]
    tokens = [t for t in tokens if t]
    return tokens * peso


def construir_metadata_combined(row: pd.Series, weights: dict) -> str:
    """Genera la cadena `metadata_combined` para un juego según los pesos definidos."""
    bag = []
    bag += _tokens_de_lista(row['genres'], weights.get('genres', 0))
    bag += _tokens_de_lista(row['tags'], weights.get('tags', 0))
    bag += _tokens_de_lista(row['specs'], weights.get('specs', 0))
    bag += _tokens_de_lista([row['developer']], weights.get('developer', 0))
    bag += _tokens_de_lista([row['publisher']], weights.get('publisher', 0))
    return ' '.join(bag)

def obtener_juego_semilla(user_id: str, df_users: pd.DataFrame, id_to_idx: dict, id_to_nombre: dict) -> dict | None:
    """Devuelve el juego con mayor playtime del usuario que esté en el catálogo modelable.

    Returns:
        dict con {item_id, item_name, playtime_forever} o None si el usuario no
        tiene juegos modelables.
    """
    user_id = str(user_id)
    biblioteca = df_users[df_users['user_id'] == user_id]

    if biblioteca.empty:
        return None

    # Solo juegos que existan en nuestro catálogo modelable
    biblioteca = biblioteca[biblioteca['item_id'].isin(id_to_idx)]
    if biblioteca.empty:
        return None

    # Ordenar por playtime descendente
    semilla = biblioteca.sort_values('playtime_forever', ascending=False).iloc[0]
    return {
        'item_id': semilla['item_id'],
        'item_name': semilla['item_name'] or id_to_nombre.get(semilla['item_id'], ''),
        'playtime_forever': float(semilla['playtime_forever']),
    }