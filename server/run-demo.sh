#!/bin/bash

# Yenta Demo Runner Script
# This script manages the Yenta platform demo

echo "🤖 Yenta Platform Demo Manager"
echo "=============================="

# Function to check if demo is running
check_demo() {
    if curl -s http://localhost:3003 > /dev/null 2>&1; then
        echo "✅ Demo is running at http://localhost:3003"
        return 0
    else
        echo "❌ Demo is not running"
        return 1
    fi
}

# Function to start the demo
start_demo() {
    echo "Starting Yenta demo..."
    
    # Kill any existing demo on port 3003
    lsof -ti:3003 | xargs kill -9 2>/dev/null
    
    # Start the demo
    node demo/full-platform-demo.js > /tmp/yenta-demo.log 2>&1 &
    echo "Demo starting on PID $!"
    
    # Wait for it to start
    sleep 2
    
    if check_demo; then
        echo ""
        echo "🎉 Demo is ready!"
        echo "📍 Open your browser to: http://localhost:3003"
        echo ""
        echo "Features you can try:"
        echo "1. Click 'Demo Conversation' to see AI intake"
        echo "2. Navigate through the 5 workflow tabs"
        echo "3. Watch matches generate automatically"
        echo "4. Approve matches in the Admin Dashboard"
        echo "5. View MDF budget tracking"
        echo ""
        echo "To stop the demo, run: ./run-demo.sh stop"
    else
        echo "Failed to start demo. Check /tmp/yenta-demo.log for errors"
    fi
}

# Function to stop the demo
stop_demo() {
    echo "Stopping Yenta demo..."
    lsof -ti:3003 | xargs kill -9 2>/dev/null
    echo "✅ Demo stopped"
}

# Function to view logs
view_logs() {
    if [ -f /tmp/yenta-demo.log ]; then
        tail -f /tmp/yenta-demo.log
    else
        echo "No log file found. Demo may not have been started yet."
    fi
}

# Main script logic
case "$1" in
    start)
        start_demo
        ;;
    stop)
        stop_demo
        ;;
    status)
        check_demo
        ;;
    logs)
        view_logs
        ;;
    restart)
        stop_demo
        sleep 1
        start_demo
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the Yenta demo"
        echo "  stop    - Stop the demo"
        echo "  status  - Check if demo is running"
        echo "  restart - Restart the demo"
        echo "  logs    - View demo logs"
        echo ""
        echo "Current status:"
        check_demo
        ;;
esac