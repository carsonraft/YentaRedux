#!/bin/bash

# Yenta Deployment Script for Ubuntu Server
# Usage: ./deploy-ubuntu.sh

echo "🚀 Starting Yenta deployment..."

# Configuration
DEPLOY_DIR="/opt/yenta"
GIT_REPO="https://github.com/carsonraft/YentaRedux.git"
BRANCH="main"
PM2_NAME="yenta-server"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Pull latest code
echo "📥 Pulling latest code from GitHub..."
cd $DEPLOY_DIR

if [ -d ".git" ]; then
    git fetch origin $BRANCH
    git reset --hard origin/$BRANCH
    print_success "Code updated from repository"
else
    print_error "No git repository found. Cloning fresh..."
    cd /opt
    rm -rf yenta
    git clone $GIT_REPO yenta
    cd $DEPLOY_DIR
    git checkout $BRANCH
    print_success "Repository cloned"
fi

# Step 2: Copy environment files if they don't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_error "Created .env from .env.example - PLEASE EDIT WITH YOUR CREDENTIALS"
        echo "Edit the following file with your credentials: $DEPLOY_DIR/.env"
        exit 1
    else
        print_error "No .env file found. Please create one with your configuration"
        exit 1
    fi
fi

# Step 3: Install dependencies
echo "📦 Installing dependencies..."
npm install --production
print_success "Dependencies installed"

# Step 4: Run database migrations if needed
if [ -f "scripts/createDb.js" ]; then
    echo "🗄️  Running database setup..."
    node scripts/createDb.js
    print_success "Database setup complete"
fi

# Step 5: Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
    print_success "PM2 installed"
fi

# Step 6: Restart application with PM2
echo "🔄 Restarting application..."
pm2 stop $PM2_NAME 2>/dev/null || true
pm2 delete $PM2_NAME 2>/dev/null || true

# Start the application
pm2 start index.js --name $PM2_NAME --env production

# Save PM2 configuration
pm2 save
pm2 startup systemd -u root --hp /root

print_success "Application restarted"

# Step 7: Check application status
echo "📊 Application status:"
pm2 status $PM2_NAME

# Step 8: Show logs
echo "📜 Recent logs:"
pm2 logs $PM2_NAME --lines 20 --nostream

echo ""
print_success "Deployment complete! 🎉"
echo ""
echo "Useful commands:"
echo "  View logs:        pm2 logs $PM2_NAME"
echo "  Monitor:          pm2 monit"
echo "  Restart:          pm2 restart $PM2_NAME"
echo "  Stop:             pm2 stop $PM2_NAME"
echo ""

# Check if the application is running
sleep 3
if pm2 list | grep -q "$PM2_NAME.*online"; then
    print_success "Application is running!"
    echo "API available at: http://$(hostname -I | awk '{print $1}'):3001"
else
    print_error "Application may not be running correctly. Check logs with: pm2 logs $PM2_NAME"
fi