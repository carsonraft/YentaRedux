#!/bin/bash

# Yenta Server Deployment Script
# Run this AFTER SSHing into the server
# Usage: ./deploy-from-server.sh

echo "🚀 Starting Yenta deployment on $(hostname)..."

# Configuration
DEPLOY_DIR="/opt/yenta"
GIT_REPO="https://github.com/carsonraft/YentaRedux.git"
BRANCH="main"
PM2_NAME="yenta-server"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Step 1: Navigate to deployment directory
echo "📂 Navigating to deployment directory..."
if [ -d "$DEPLOY_DIR" ]; then
    cd $DEPLOY_DIR
    print_success "In directory: $(pwd)"
else
    print_error "Directory $DEPLOY_DIR not found!"
    echo "Creating directory..."
    mkdir -p $DEPLOY_DIR
    cd $DEPLOY_DIR
fi

# Step 2: Check git status
echo ""
echo "📊 Checking git status..."
if [ -d ".git" ]; then
    echo "Current branch: $(git branch --show-current)"
    echo "Remote URL: $(git remote get-url origin 2>/dev/null || echo 'No origin set')"
    
    # Show any local changes
    if [[ -n $(git status -s) ]]; then
        print_warning "You have local changes:"
        git status -s
        echo ""
        read -p "Do you want to stash these changes? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git stash push -m "Deployment stash $(date +%Y%m%d_%H%M%S)"
            print_success "Changes stashed"
        fi
    fi
    
    # Pull latest changes
    echo ""
    echo "📥 Pulling latest code..."
    git fetch origin $BRANCH
    git checkout $BRANCH
    git pull origin $BRANCH
    print_success "Code updated"
else
    print_warning "No git repository found. Cloning..."
    git clone $GIT_REPO .
    git checkout $BRANCH
    print_success "Repository cloned"
fi

# Step 3: Environment check
echo ""
echo "🔧 Checking environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Created .env from .env.example"
        echo "Please edit .env with your credentials!"
        nano .env
    else
        print_error "No .env file found!"
        exit 1
    fi
else
    print_success ".env file exists"
fi

# Step 4: Install/update dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
print_success "Dependencies installed"

# Step 5: Run any database migrations
echo ""
echo "🗄️  Checking for database updates..."
if [ -f "scripts/createDb.js" ]; then
    read -p "Run database setup? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        node scripts/createDb.js
        print_success "Database setup complete"
    fi
fi

# Step 6: PM2 deployment
echo ""
echo "🔄 Managing PM2 process..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 not found. Installing..."
    npm install -g pm2
fi

# Show current PM2 processes
echo "Current PM2 processes:"
pm2 list

# Restart or start the application
if pm2 list | grep -q "$PM2_NAME"; then
    echo ""
    read -p "Restart existing process? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pm2 restart $PM2_NAME
        print_success "Application restarted"
    fi
else
    echo ""
    echo "Starting new PM2 process..."
    pm2 start index.js --name $PM2_NAME --env production
    pm2 save
    pm2 startup systemd -u root --hp /root
    print_success "Application started"
fi

# Step 7: Health check
echo ""
echo "🏥 Running health check..."
sleep 3

# Check if process is running
if pm2 list | grep -q "$PM2_NAME.*online"; then
    print_success "Process is running"
    
    # Try to hit the API
    echo ""
    echo "Testing API endpoint..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
    
    if [ "$RESPONSE" = "200" ]; then
        print_success "API is responding (HTTP $RESPONSE)"
    elif [ "$RESPONSE" = "404" ]; then
        print_warning "API is running but /api/health not found (HTTP $RESPONSE)"
    else
        print_error "API not responding properly (HTTP $RESPONSE)"
    fi
else
    print_error "Process is not running!"
fi

# Step 8: Show logs
echo ""
echo "📜 Recent logs:"
pm2 logs $PM2_NAME --lines 20 --nostream

# Step 9: Summary
echo ""
echo "════════════════════════════════════════════"
print_success "Deployment complete! 🎉"
echo "════════════════════════════════════════════"
echo ""
echo "Server: $(hostname -I | awk '{print $1}')"
echo "Port: 3001"
echo ""
echo "Useful commands:"
echo "  View logs:        pm2 logs $PM2_NAME"
echo "  Monitor:          pm2 monit"
echo "  Restart:          pm2 restart $PM2_NAME"
echo "  Stop:             pm2 stop $PM2_NAME"
echo "  Status:           pm2 status"
echo ""
echo "Test the API:"
echo "  curl http://localhost:3001/api/prospects/start -H 'Content-Type: application/json' -d '{}'"
echo ""