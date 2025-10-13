# Simplified Dockerfile for Railway deployment
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Expose port (Railway will set PORT environment variable)
EXPOSE 3000

# Start command
CMD ["npm", "run", "start:prod"]
