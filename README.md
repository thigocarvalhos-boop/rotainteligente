<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e42020b4-20c9-44cf-b4b3-a6f872e50e6d

## Run Locally

**Prerequisites:** Node.js ≥ 20

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the example environment file and fill in your values:
   ```bash
   cp .env.example .env
   # Edit .env and set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
   ```
3. Generate the Prisma Client (always use the pinned version):
   ```bash
   npx prisma@6.4.1 generate
   ```
4. Apply database migrations:
   ```bash
   npx prisma@6.4.1 migrate deploy
   ```
5. Run the app:
   ```bash
   npm run dev
   ```

> ⚠️ **Important:** Never run `npx prisma generate` (without a version). That command installs Prisma v7, which is incompatible with this project's schema. Always use `npx prisma@6.4.1 generate`.

## Deploy (Vercel)

The `vercel.json` configures Vercel to run `npm run build` as the build command, which executes:

```bash
npx prisma@6.4.1 generate
npx prisma@6.4.1 migrate deploy
vite build
```

Ensure the following environment variables are set in your Vercel project settings:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret key for JWT signing
- `JWT_REFRESH_SECRET` — Secret key for JWT refresh token signing
