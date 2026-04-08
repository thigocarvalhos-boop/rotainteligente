<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ROTA — Sistema de Gestão

Este repositório contém o sistema ROTA, uma aplicação full-stack com React (Vite) no frontend e Express no backend, usando Prisma 6.4.1 com PostgreSQL.

## Executar Localmente

**Pré-requisitos:** Node.js >= 20.19.0

1. Instalar dependências:
   ```bash
   npm install
   ```
2. Configurar variáveis de ambiente (copie `.env.example` para `.env` e preencha):
   - `DATABASE_URL` — URL de conexão com o banco PostgreSQL
   - `JWT_SECRET` — chave secreta para tokens JWT
   - `JWT_REFRESH_SECRET` — chave secreta para tokens de refresh
3. Gerar o Prisma Client e aplicar migrations:
   ```bash
   npm run prisma:generate
   npm run prisma:deploy
   ```
4. Iniciar em modo desenvolvimento:
   ```bash
   npm run dev
   ```

## Deploy na Vercel

O arquivo [`vercel.json`](./vercel.json) está configurado para garantir que, em cada build/deploy, sejam executados **exatamente**:

```bash
npx prisma@6.4.1 generate && npx prisma@6.4.1 migrate deploy && vite build
```

> **Importante:** Nunca utilizar `npx prisma generate` (sem versão fixada), pois isso pode puxar o Prisma v7, que tem breaking changes incompatíveis com o schema atual. Sempre usar `npx prisma@6.4.1`.

### Variáveis de ambiente obrigatórias na Vercel

Configure as seguintes variáveis em **Settings → Environment Variables** do projeto na Vercel:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL de conexão com o banco PostgreSQL |
| `JWT_SECRET` | Chave secreta para tokens JWT de acesso |
| `JWT_REFRESH_SECRET` | Chave secreta para tokens de refresh |

### Passos para configurar o deploy

1. Conecte o repositório ao projeto na Vercel
2. Configure as variáveis de ambiente acima em todos os ambientes (Production, Preview)
3. O `vercel.json` já define o `buildCommand` correto — nenhuma alteração manual no painel da Vercel é necessária
4. Acione um deploy (push ou Redeploy) e verifique nos logs que as etapas `prisma@6.4.1 generate` e `prisma@6.4.1 migrate deploy` são executadas antes do `vite build`

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia servidor em modo desenvolvimento com hot-reload |
| `npm run build` | Gera Prisma Client, aplica migrations e compila frontend |
| `npm run prisma:generate` | Executa `npx prisma@6.4.1 generate` |
| `npm run prisma:migrate` | Executa `npx prisma@6.4.1 migrate dev` |
| `npm run prisma:deploy` | Executa `npx prisma@6.4.1 migrate deploy` |
| `npm run prisma:seed` | Popula banco com dados iniciais |
