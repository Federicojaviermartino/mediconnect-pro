#!/bin/bash
# Railway startup script for Docker Compose deployment

echo "🚂 Starting MediConnect Pro on Railway..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found, trying docker compose"
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Use simplified compose file for Railway
echo "📦 Using docker-compose.railway.yml"
export COMPOSE_FILE=docker-compose.railway.yml

# Start services
echo "🚀 Starting services..."
$DOCKER_COMPOSE up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if API Gateway is responding
echo "🔍 Checking API Gateway health..."
for i in {1..10}; do
    if curl -f http://localhost:3000/health &> /dev/null; then
        echo "✅ API Gateway is healthy!"
        break
    fi
    echo "⏳ Attempt $i/10: Waiting for API Gateway..."
    sleep 5
done

# Show logs
echo "📋 Service logs:"
$DOCKER_COMPOSE logs --tail=50

echo "✅ MediConnect Pro is running!"
echo "🌐 Access the application at your Railway domain"
