# Use Node.js 20 base image with Python 3.11+ support
FROM node:20-bookworm

# Install Python, pip, and system dependencies including Chrome for PDF generation
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    build-essential \
    gcc \
    g++ \
    make \
    wget \
    curl \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python command
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files first (for better Docker layer caching)
COPY package*.json ./
COPY requirements.txt ./

# Install Node.js dependencies
RUN npm ci --omit=dev

# Install Playwright browsers
RUN npx playwright install chromium

# Install Python dependencies with explicit upgrade
RUN pip3 install --upgrade pip setuptools wheel --break-system-packages
RUN pip3 install -r requirements.txt --break-system-packages

# Copy application code
COPY . .

# Set Chrome/Chromium executable path for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create non-root user for security and set up home directory
RUN groupadd -r appuser && useradd -r -g appuser -m -d /home/appuser appuser
RUN chown -R appuser:appuser /app /home/appuser
RUN mkdir -p /home/appuser/.npm/_logs && chown -R appuser:appuser /home/appuser/.npm
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start command
CMD ["npm", "start"]