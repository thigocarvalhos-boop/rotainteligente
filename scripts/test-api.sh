#!/bin/bash
URL="https://rotainteligente-production.up.railway.app"
echo "Testing API endpoints..."
echo ""
echo "1. Health check:"
curl -s "$URL/api/health" | jq .
echo ""
echo "2. Login test:"
curl -s -X POST "$URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guiasocial.org","password":"admin123"}' | jq .
