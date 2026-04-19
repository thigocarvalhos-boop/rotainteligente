#!/bin/bash
set -e

echo "🚀 ROTA Deployment - Merging Critical PRs"
echo "=========================================="

# Step 1: Fetch and checkout
echo "📥 Fetching branches..."
git fetch origin
git checkout main

# Step 2: Merge PR #1
echo "📝 Merging PR #1: railway.json..."
git merge origin/railway/code-change-Nt_j3X -m "Merge PR #1: Add railway.json deployment configuration"

# Step 3: Merge PR #2
echo "📝 Merging PR #2: package.json..."
git merge origin/railway/code-change-lodsZu -m "Merge PR #2: Add npm start script and postinstall"

# Step 4: Merge PR #3
echo "📝 Merging PR #3: prisma/schema.prisma..."
git merge origin/railway/code-change-8JlOY2 -m "Merge PR #3: Fix Prisma schema to use PostgreSQL"

# Step 5: Push to main
echo "🚀 Pushing to main..."
git push origin main

echo ""
echo "✅ SUCCESS! All PRs merged."
echo ""
echo "📊 Next Steps:"
echo "1. Wait 2-3 minutes for Railway deployment to complete"
echo "2. Run: railway login && railway link && railway run npx prisma db push"
echo "3. Access: https://rotainteligente-production.up.railway.app"
echo "4. Login: admin@guiasocial.org / admin123"
echo ""
echo "🔗 Monitor deployment: https://railway.com/project/8651d3e3-0291-447a-ac0e-09839d4c5063"
