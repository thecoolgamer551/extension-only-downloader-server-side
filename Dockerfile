# Use the official Node.js image
FROM node:18-slim

# Install system dependencies (including Python and yt-dlp)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download latest yt-dlp to ensure YouTube compatibility
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set up the app
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

# Start the API
EXPOSE 3000
CMD [ "npm", "start" ]
