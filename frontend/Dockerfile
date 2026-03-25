# Étape 1: Build de l'application React
FROM node:18-alpine as build

WORKDIR /app

# Copier les fichiers de dépendances
COPY frontend/package.json frontend/package-lock.json* ./

# Installer les dépendances avec legacy-peer-deps pour éviter les conflits React
RUN npm install --legacy-peer-deps

# Copier le code source
COPY frontend/public/ ./public/
COPY frontend/src/ ./src/

# Compiler l'application
RUN npm run build

# Étape 2: Servir avec Nginx
FROM nginx:alpine

# Copier les fichiers compilés
COPY --from=build /app/build /usr/share/nginx/html

# Copier la configuration Nginx
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]