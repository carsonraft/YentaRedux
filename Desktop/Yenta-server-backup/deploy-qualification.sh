#!/bin/bash

# Deploy qualification system updates to DigitalOcean

echo "🚀 Deploying qualification system updates to YentaConnect.com..."

# Copy all updated files
echo "📦 Copying updated files..."
scp ~/Desktop/Yenta/server/services/structuredQualification.js root@161.35.58.4:/opt/yenta/server/services/
scp ~/Desktop/Yenta/server/services/vettingOrchestrator.js root@161.35.58.4:/opt/yenta/server/services/
scp ~/Desktop/Yenta/server/routes/qualification.js root@161.35.58.4:/opt/yenta/server/routes/
scp ~/Desktop/Yenta/server/db/qualification_schema.sql root@161.35.58.4:/opt/yenta/server/db/

# Deploy database schema and restart server
ssh root@161.35.58.4 << 'ENDSSH'
echo "🗄️ Applying database schema..."
cd /opt/yenta

# Run psql inside the database container
docker-compose exec -T db psql -U postgres yenta_db -f /opt/yenta/server/db/qualification_schema.sql || echo "Schema already exists"

echo "🐳 Restarting Docker containers..."
docker-compose restart server

echo "✅ Deployment complete! Waiting for server to start..."
sleep 10

# Test the deployment
echo "🧪 Testing qualification endpoint..."
curl -X POST https://yentaconnect.com/api/qualification/start \
  -H "Content-Type: application/json" \
  -d '{"prospectId": 1, "companyName": "Production Test"}' \
  -w "\nHTTP Status: %{http_code}\n" || echo "❌ Test failed"
ENDSSH

echo "✅ Deployment complete!"