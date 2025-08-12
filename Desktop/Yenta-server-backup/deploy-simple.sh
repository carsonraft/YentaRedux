#!/bin/bash

echo "🚀 Deploying qualification updates..."

# Copy files
scp ~/Desktop/Yenta/server/services/structuredQualification.js root@161.35.58.4:/opt/yenta/server/services/
scp ~/Desktop/Yenta/server/routes/qualification.js root@161.35.58.4:/opt/yenta/server/routes/

# Restart server
ssh root@161.35.58.4 "cd /opt/yenta && docker-compose restart server"

echo "✅ Done! Server restarting..."