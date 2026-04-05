# Database Initialization — ROTA Production

After the initial deploy, the database tables must be created manually using the Railway CLI. The server will be running but no tables exist until these steps are completed.

## Prerequisites

- **Railway CLI** installed: `npm install -g @railway/cli`
- Authenticated with Railway: `railway login`
- Project linked: `railway link`

## Steps

### 1. Authenticate with Railway

```bash
railway login
```

### 2. Link to the project

```bash
railway link
```

When prompted:
- Select project: **rotainteligente**
- Select service: **rotainteligente**

### 3. Create database tables

```bash
railway run npx prisma db push --accept-data-loss
```

This pushes the Prisma schema to the PostgreSQL database and creates all required tables.

### 4. Verify tables were created

```bash
railway run npx prisma db execute --stdin < /dev/null
```

### 5. Redeploy to run seed

```bash
railway redeploy
```

This triggers a fresh deploy which will run any seed scripts and ensure the application starts with a fully initialized database.

---

After completing these steps, the application will be fully operational.

> **Note:** The `--accept-data-loss` flag is required for `db push` on a fresh database. It is safe to use here since there is no existing data to lose.
