<<<<<<< HEAD
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY frontend/ ./

# Build the app (creates 'build' folder for react-scripts)
RUN npm run build

# Serve stage
FROM nginx:alpine

# Copy the built files from build stage (change 'dist' to 'build')
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

=======
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
>>>>>>> b73e6ba7dde6de6d15f8f3743fa6cd795efb87fd
CMD ["nginx", "-g", "daemon off;"]