#!/bin/bash

# Yenta Production Deployment Script
# Deploys to yentaconnect.com

set -e  # Exit on any error

echo "🚀 Starting Yenta deployment to yentaconnect.com..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if [ ! -f ".env.production" ]; then
    log_error ".env.production file not found. Please create it with production credentials."
    exit 1
fi

log_success "Prerequisites check passed"

# Backup existing deployment if it exists
if [ "$(docker ps -q -f name=yenta)" ]; then
    log_warning "Existing Yenta containers found. Creating backup..."
    docker-compose down
    log_success "Existing containers stopped"
fi

# Build and deploy
log_info "Building Docker images..."
docker-compose build --no-cache

log_success "Docker images built successfully"

log_info "Starting services..."
docker-compose --env-file .env.production up -d

log_success "Services started successfully"

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
sleep 30

# Check service health
if docker-compose ps | grep -q "Up (healthy)"; then
    log_success "All services are healthy!"
else
    log_warning "Some services may not be fully healthy yet. Check status with: docker-compose ps"
fi

# Run database migrations
log_info "Running database setup..."
docker-compose exec server node scripts/createDb.js || log_warning "Database setup may have failed or already exists"

# Display deployment information
echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://yentaconnect.com"
echo "   API: http://yentaconnect.com/api/health"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Update: ./deploy.sh"
echo ""
echo "🔧 Next steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Set up SSL certificate (Let's Encrypt recommended)"
echo "3. Configure OAuth apps for LinkedIn, Google, Microsoft"
echo "4. Test all functionality"
echo ""
log_success "Yenta is now live on yentaconnect.com! 🚀"