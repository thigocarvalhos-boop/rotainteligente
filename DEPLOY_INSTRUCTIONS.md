# 🚀 ROTA Deployment Instructions

## Step 1: Merge Critical PRs

Copy and paste this command in your terminal:

```bash
git fetch origin && \
git checkout main && \
git merge origin/railway/code-change-Nt_j3X -m "Merge PR #1: railway.json" && \
git merge origin/railway/code-change-lodsZu -m "Merge PR #2: package.json" && \
git merge origin/railway/code-change-8JlOY2 -m "Merge PR #3: prisma/schema.prisma" && \
git push origin main
```

This will:
- ✅ Merge railway.json (deployment config)
- ✅ Merge package.json (start script + postinstall)
- ✅ Merge prisma/schema.prisma (sqlite → postgresql)
- ✅ Push to main (triggers Railway deployment)

## Step 2: Wait for Railway Deployment

The deployment will start automatically. Monitor at:
https://railway.com/project/8651d3e3-0291-447a-ac0e-09839d4c5063

Expected time: 2-3 minutes

## Step 3: Create Database Tables

Once deployment succeeds, run:

```bash
railway login
railway link
railway run npx prisma db push
```

## Step 4: Access the Application

URL: https://rotainteligente-production.up.railway.app

Login credentials:
- Email: admin@guiasocial.org
- Password: admin123

## Step 5: Change Default Password

After login, change the admin password immediately.

## Troubleshooting

If deployment fails:
1. Check Railway logs: https://railway.com/project/8651d3e3-0291-447a-ac0e-09839d4c5063
2. Verify DATABASE_URL is set in Variables
3. Ensure all 3 PRs were merged successfully
