#!/bin/bash
set -e

echo "🚀 Starting merge of critical PRs for Railway deployment..."

git fetch origin
git checkout main

echo "📝 Merging PR #1: railway.json..."
git merge origin/railway/code-change-Nt_j3X -m "Merge PR #1: Add railway.json deployment configuration"

echo "📝 Merging PR #2: package.json..."
git merge origin/railway/code-change-lodsZu -m "Merge PR #2: Add npm start script and postinstall"

echo "📝 Merging PR #3: prisma/schema.prisma..."
git merge origin/railway/code-change-8JlOY2 -m "Merge PR #3: Fix Prisma schema to use PostgreSQL"

echo "🚀 Pushing to origin main..."
git push origin main

echo "✅ All PRs merged successfully! Railway deployment will start automatically."
