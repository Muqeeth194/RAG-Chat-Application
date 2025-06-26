# Backend Dockerfile
FROM node:22.13.1-alpine

# Install curl and other dependencies
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create uploads directory for file storage
RUN mkdir -p uploads

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]