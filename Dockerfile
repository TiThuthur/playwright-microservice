# Base image avec Node et Playwright
FROM mcr.microsoft.com/playwright:v1.44.0-focal

WORKDIR /app

# Copier package.json et installer les dépendances
COPY package*.json ./
RUN npm install

# Copier le code
COPY . .

# Exposer le port pour l’API
EXPOSE 3000

# Lancer l’API
CMD ["node", "index.js"]
