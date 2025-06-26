# Simple Frontend Dockerfile for Vite React App
FROM node:22.13.1-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port (Vite dev server default is 5173, but we'll use 3000)
EXPOSE 5173

# Start the Vite dev server with host 0.0.0.0 to accept external connections
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]