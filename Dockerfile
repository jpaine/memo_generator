# Use a lightweight Node image
FROM node:20-alpine

# App files live here
WORKDIR /app

# Install Python for market analysis script
RUN apk add --no-cache python3 py3-pip

# 1. Install dependencies first (layer‑cached)
COPY package*.json ./
COPY requirements.txt ./
RUN npm install && pip3 install -r requirements.txt

# 2. Copy the rest of your source
COPY . .

# 3. Build the frontend
RUN npm run build

# Create temp directories
RUN mkdir -p /tmp/uploads temp

# 4. Run on port 3000 (match your Express server)
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
