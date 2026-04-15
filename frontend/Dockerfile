# Étape 1: Build de l'application React
FROM node:18-alpine AS build
WORKDIR /app

# --- NEW: Accept build arguments from docker-compose ---
ARG REACT_APP_API_URL
ARG REACT_APP_GOOGLE_CLIENT_ID

# --- NEW: Set them as environment variables for the build process ---
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID

# Copier les fichiers de dépendances
COPY frontend/package.json frontend/package-lock.json* ./

# Installer les dépendances
RUN npm install --legacy-peer-deps

# Copier le reste du code
COPY frontend/ ./

# Compiler l'application (Maintenant, il "voit" les variables)
RUN npm run build

# Étape 2: Servir avec Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]