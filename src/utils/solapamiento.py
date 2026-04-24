

# Normalizamos ambas columnas a sets de tokens en lowercase para comparación justa
# (la función _normalizar_token todavía no existe en este punto, así que usamos
#  una versión inline más simple: lowercase + strip)

def _to_set_normalizado(items: list) -> set:
    """Convierte una lista de strings a un set normalizado (lowercase, sin espacios extra)."""
    return {str(x).strip().lower() for x in items if x}

def jaccard(a: set, b: set) -> float:
    union = a | b
    return len(a & b) / len(union) if union else 0.0

def mostrar_ejemplos(df_subset, titulo, n=3):
    print(f'\n══════ {titulo} ══════')
    for _, row in df_subset.head(n).iterrows():
        print(f"\n• {row['nombre']} (id={row['id']}, jaccard={row['jaccard']:.2f})")
        print(f"  genres: {sorted(row['set_genres'])}")
        print(f"  tags  : {sorted(row['set_tags'])[:10]}{' ...' if len(row['set_tags']) > 10 else ''}")