# ------------------------------
# ÉTAPE 1 : Build du Frontend (React)
# ------------------------------
FROM node:18-alpine as frontend-builder

WORKDIR /app-frontend

COPY frontend/package*.json ./

# Installation (legacy-peer-deps pour React 19)
RUN npm install --legacy-peer-deps

COPY frontend/ .

# --- OPTIMISATIONS ANTI-CRASH MÉMOIRE ---
ENV GENERATE_SOURCEMAP=false
# On limite la mémoire de Node à 4Go pour éviter qu'il ne fasse sauter le conteneur
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

# ------------------------------
# ÉTAPE 2 : Backend & Image Finale
# ------------------------------
FROM python:3.10-slim

# Création utilisateur
RUN adduser --disabled-password appuser

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Installation dépendances
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- COPIE SÉCURISÉE (Correctif Windows) ---
COPY --chown=appuser:appuser backend/ .
COPY --chown=appuser:appuser --from=frontend-builder /app-frontend/build ./static

USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]