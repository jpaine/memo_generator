# Use a lightweight Node image
FROM node:20-alpine

# App files live here
WORKDIR /app

# 1. Install dependencies first (layer‑cached)
COPY package*.json ./
RUN npm install       # or `npm ci` if you lock with package-lock.json

# 2. Copy the rest of your source
COPY . .

# 3. Build (optional—remove if you have no build script)
RUN npm run build

# 4. Run on port 3002
ENV PORT=3002
EXPOSE 3002
CMD ["npm", "start"]
