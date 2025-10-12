#!/bin/bash

# MediConnect Pro - Quick Setup Script
# This script automates the setup process for development

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           MediConnect Pro - Setup Script                 ║
║           Enterprise Telemedicine Platform               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

print_info "Starting MediConnect Pro setup..."

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker Desktop first."
    echo "Visit: https://www.docker.com/products/docker-desktop"
    exit 1
fi
print_success "Docker is installed"

if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed."
    exit 1
fi
print_success "Docker Compose is installed"

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi
print_success "Docker daemon is running"

# Check Docker version
DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
print_info "Docker version: $DOCKER_VERSION"

# Setup environment file
print_info "Setting up environment variables..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Created .env file from .env.example"
        print_warning "Please review .env file and update values if needed"
    else
        print_error ".env.example file not found"
        exit 1
    fi
else
    print_warning ".env file already exists, skipping..."
fi

# Create required directories
print_info "Creating required directories..."
mkdir -p config/ssl
mkdir -p logs
print_success "Directories created"

# Pull Docker images (optional, speeds up first run)
read -p "$(echo -e ${YELLOW}Do you want to pull Docker images now? This will speed up the first run. [y/N]:${NC} )" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Pulling Docker images... (this may take a few minutes)"
    docker-compose pull
    print_success "Docker images pulled"
fi

# Ask if user wants to start services
echo
read -p "$(echo -e ${YELLOW}Do you want to start all services now? [Y/n]:${NC} )" -n 1 -r
echo

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    print_info "Starting all services..."
    docker-compose up -d

    print_info "Waiting for services to initialize... (this may take 2-3 minutes)"
    sleep 10

    # Check service health
    print_info "Checking service status..."
    docker-compose ps

    echo
    print_success "Setup complete! 🎉"
    echo
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Access Points:${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo -e "  🌐 Web Application:      ${BLUE}http://localhost${NC}"
    echo -e "  🌐 Web (direct):         ${BLUE}http://localhost:3100${NC}"
    echo -e "  🔌 API Gateway:          ${BLUE}http://localhost:3000${NC}"
    echo -e "  📚 API Documentation:    ${BLUE}http://localhost:3000/api-docs${NC}"
    echo
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Service Endpoints:${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo -e "  🔐 Auth Service:         ${BLUE}http://localhost:3001${NC}"
    echo -e "  👤 Patient Service:      ${BLUE}http://localhost:3002${NC}"
    echo -e "  💓 Vitals Service:       ${BLUE}http://localhost:3003${NC}"
    echo -e "  🎥 Consultation Service: ${BLUE}http://localhost:3004${NC}"
    echo -e "  🤖 ML Service:           ${BLUE}http://localhost:8000${NC}"
    echo
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo -e "  View logs:           ${BLUE}docker-compose logs -f${NC}"
    echo -e "  Stop services:       ${BLUE}docker-compose down${NC}"
    echo -e "  Restart services:    ${BLUE}docker-compose restart${NC}"
    echo -e "  View service status: ${BLUE}docker-compose ps${NC}"
    echo
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "  1. Wait 1-2 minutes for all services to fully initialize"
    echo -e "  2. Visit ${BLUE}http://localhost${NC} in your browser"
    echo -e "  3. Read ${BLUE}QUICKSTART.md${NC} for API testing examples"
    echo -e "  4. Check ${BLUE}README.md${NC} for complete documentation"
    echo

    # Health check
    print_info "Performing health check in 30 seconds..."
    sleep 30

    echo
    print_info "Testing service endpoints..."

    # Test endpoints
    services=(
        "http://localhost:3000/health:API Gateway"
        "http://localhost:3001/health:Auth Service"
        "http://localhost:3002/health:Patient Service"
        "http://localhost:3003/health:Vitals Service"
        "http://localhost:3004/health:Consultation Service"
        "http://localhost:8000/health:ML Service"
    )

    for service in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service"
        if curl -s -f -o /dev/null "$url" 2>/dev/null; then
            print_success "$name is responding"
        else
            print_warning "$name is not responding yet (may still be starting)"
        fi
    done

else
    print_info "Setup complete! Services not started."
    echo
    echo -e "${YELLOW}To start services manually, run:${NC}"
    echo -e "  ${BLUE}docker-compose up -d${NC}"
fi

echo
print_info "For troubleshooting, check QUICKSTART.md"
echo
