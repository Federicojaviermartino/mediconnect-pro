# Ultra-simple Dockerfile for Railway demo
FROM node:20-alpine

WORKDIR /app

# Copy only what we need
COPY package.json ./
COPY server.js ./
COPY healthcheck.js ./

# Install only express
RUN npm install express --no-save

# Expose port
EXPOSE 3000

# Start the application directly
CMD ["node", "server.js"]
