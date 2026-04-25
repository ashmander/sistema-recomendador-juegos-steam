#!/usr/bin/env bash
# deploy_to_hf.sh — Despliega la aplicación en Hugging Face Spaces
#
# Uso:
#   ./deploy/deploy_to_hf.sh <usuario_hf> [nombre_space]
#
# Ejemplo:
#   ./deploy/deploy_to_hf.sh mi-usuario sistema-recomendador-juegos-steam
#
# Prerrequisitos:
#   1. Tener cuenta en huggingface.co
#   2. Tener git y git-lfs instalados (sudo apt install git-lfs)
#   3. Haber creado el Space en https://huggingface.co/new-space
#      - SDK: Docker
#      - Visibilidad: Public
#      - Hardware: Free (2 vCPU, 16 GB RAM)
#   4. Tener un token de acceso (write) de HF:
#      https://huggingface.co/settings/tokens

set -euo pipefail

# --- Argumentos ---
HF_USER="${1:?Error: Debes proporcionar tu nombre de usuario de Hugging Face como primer argumento}"
SPACE_NAME="${2:-sistema-recomendador-juegos-steam}"

# --- Rutas ---
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
TEMP_DIR=$(mktemp -d)

echo "=============================================="
echo "  Despliegue a Hugging Face Spaces"
echo "=============================================="
echo ""
echo "  Usuario HF:   $HF_USER"
echo "  Space:         $SPACE_NAME"
echo "  URL final:     https://${HF_USER}-${SPACE_NAME}.hf.space"
echo "  Directorio temporal: $TEMP_DIR"
echo ""

# --- Paso 1: Clonar el repo vacío del Space ---
echo "[1/5] Clonando el repositorio del Space..."
cd "$TEMP_DIR"
git clone "https://huggingface.co/spaces/${HF_USER}/${SPACE_NAME}" space_repo
cd space_repo

# --- Paso 2: Configurar Git LFS (HF requiere LFS para archivos >10 MB) ---
echo "[2/5] Configurando Git LFS..."
git lfs install
git lfs track "*.parquet" "*.npz" "*.pkl"
git add .gitattributes

# --- Paso 3: Copiar solo los archivos necesarios ---
echo "[3/5] Copiando archivos necesarios (~31 MB)..."

# Archivos raíz
cp "$PROJECT_ROOT/Dockerfile" .
cp "$PROJECT_ROOT/pyproject.toml" .
cp "$PROJECT_ROOT/uv.lock" . 2>/dev/null || echo "  (uv.lock no encontrado, se omite)"
cp "$PROJECT_ROOT/main.py" .

# README y .dockerignore especiales para HF
cp "$DEPLOY_DIR/README.md" .
cp "$DEPLOY_DIR/.dockerignore" .

# Código fuente (excluyendo __pycache__)
rsync -a --exclude='__pycache__' "$PROJECT_ROOT/src" .

# Artefactos pre-computados (~31 MB)
cp -r "$PROJECT_ROOT/artifacts" .

# Frontend
cp -r "$PROJECT_ROOT/frontend" .

echo "  Archivos copiados:"
du -sh . --exclude=.git
echo ""

# --- Paso 4: Commit ---
echo "[4/5] Creando commit..."
git add .
git commit -m "Deploy: sistema recomendador de juegos Steam"

# --- Paso 5: Push ---
echo "[5/5] Subiendo al Space (puede pedir credenciales)..."
echo ""
echo "  Si te pide credenciales:"
echo "    - Username: $HF_USER"
echo "    - Password: tu token de acceso (write) de https://huggingface.co/settings/tokens"
echo ""
git push

echo ""
echo "=============================================="
echo "  ¡Despliegue completado!"
echo "=============================================="
echo ""
echo "  El Space está construyendo la imagen Docker."
echo "  Puedes monitorear el progreso en:"
echo "    https://huggingface.co/spaces/${HF_USER}/${SPACE_NAME}"
echo ""
echo "  Una vez listo (~3-5 minutos), accede a:"
echo "    Frontend:  https://${HF_USER}-${SPACE_NAME}.hf.space/app/"
echo "    API docs:  https://${HF_USER}-${SPACE_NAME}.hf.space/docs"
echo "    API root:  https://${HF_USER}-${SPACE_NAME}.hf.space/"
echo ""

# Limpiar directorio temporal
rm -rf "$TEMP_DIR"
