---
title: Sistema Recomendador de Juegos Steam
emoji: 🎮
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# 🎮 Sistema Recomendador de Videojuegos — Steam

Sistema de recomendación de videojuegos sobre la plataforma Steam, basado en
filtrado por contenido (TF-IDF + similitud de coseno) con dos versiones del
modelo expuestas en paralelo a través de una API REST construida con FastAPI.

## Recursos

| Recurso            | URL                     |
| ------------------ | ----------------------- |
| **Aplicación Web** | `/app/`                 |
| **Swagger UI**     | `/docs`                 |
| **API REST**       | `/` (stats del sistema) |

## Tecnologías

- **Backend:** FastAPI + Uvicorn
- **Motor:** TF-IDF (scikit-learn) + similitud de coseno (scipy)
- **Frontend:** HTML + JavaScript vanilla + Tailwind CSS
- **Datos:** ~2K juegos modelables, ~70K usuarios

## Características

- Recomendación por usuario (perfil centroide ponderado por horas jugadas)
- Recomendación por juego (similitud de coseno)
- Cold-start: popularidad, intereses textuales, juegos favoritos
- Exploración estratificada por género
- Comparación lado a lado entre modelo v1 (baseline) y v2 (mejorado)
- Filtro anti-DLC para evitar recomendar contenido descargable
