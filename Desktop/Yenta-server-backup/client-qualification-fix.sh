#!/bin/bash

# Update client to use qualification endpoints

echo "🔧 Updating client to use qualification endpoints..."

# First, let's check what the client is actually doing
echo "Current client endpoint configuration:"
grep -n "ai/v1/process" ~/Desktop/Yenta/client/src/components/prospect/EnhancedProspectIntake.tsx

echo -e "\n📝 The client is calling /api/ai/v1/process which doesn't exist."
echo "This is why you're getting unexpected AI responses."
echo -e "\nThe new qualification system uses:"
echo "- POST /api/qualification/start"
echo "- POST /api/qualification/respond"

echo -e "\n🚀 To fix this, the client needs to be updated to use the qualification endpoints."
echo "This requires updating EnhancedProspectIntake.tsx to call the right endpoints."