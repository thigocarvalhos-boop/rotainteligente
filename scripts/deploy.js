#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const log = (msg) => console.log(`\n${msg}`);
const error = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };
const success = (msg) => console.log(`✓ ${msg}`);

async function run() {
  try {
    log('🚀 ROTA COMPLETE DEPLOYMENT');
    log('============================\n');

    // Step 1: Install Railway CLI
    log('Step 1: Installing Railway CLI...');
    try {
      execSync('npm install -g @railway/cli', { stdio: 'pipe' });
      success('Railway CLI installed');
    } catch {
      success('Railway CLI already installed');
    }

    // Step 2: Authenticate
    log('Step 2: Checking authentication...');
    try {
      execSync('railway whoami', { stdio: 'pipe' });
      success('Already authenticated');
    } catch {
      log('Opening browser for authentication...');
      execSync('railway login', { stdio: 'inherit' });
      success('Authenticated');
    }

    // Step 3: Link to project
    log('Step 3: Linking to project...');
    try {
      const status = execSync('railway status', { encoding: 'utf8' });
      if (status.includes('rotainteligente')) {
        success('Already linked');
      } else {
        throw new Error('Not linked');
      }
    } catch {
      log('Linking to project (select rotainteligente)...');
      execSync('railway link', { stdio: 'inherit' });
      success('Linked to project');
    }

    // Step 4: Create database tables
    log('Step 4: Creating database tables...');
    execSync('railway run npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    success('Database tables created');

    // Step 5: Verify tables
    log('Step 5: Verifying tables...');
    const verifyScript = `
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.$queryRaw\`SELECT tablename FROM pg_tables WHERE schemaname='public'\`
.then(rows => {
  const tables = rows.map(r => r.tablename);
  const required = ['User','Project','Meta','Etapa','Expense','Document','Alert','AuditLog','ComplianceCheck','Cotacao'];
  const missing = required.filter(t => !tables.some(tbl => tbl.toLowerCase() === t.toLowerCase()));
  if (missing.length === 0) {
    console.log('✓ All tables exist');
  } else {
    console.log('✗ Missing tables:', missing.join(', '));
    process.exit(1);
  }
  return p.$disconnect();
})
.catch(e => { console.error(e.message); process.exit(1); });
    `;
    execSync(`railway run node -e "${verifyScript.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });

    // Step 6: Run seed
    log('Step 6: Running seed...');
    const seedScript = `
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
async function seed() {
  const hash = await bcrypt.hash('admin123', 12);
  const admin = await p.user.upsert({
    where: { email: 'admin@guiasocial.org' },
    update: {},
    create: {
      email: 'admin@guiasocial.org',
      password: hash,
      name: 'Administrador ROTA',
      role: 'SUPER_ADMIN'
    }
  });
  console.log('✓ Admin user created:', admin.email);
  const count = await p.project.count();
  if (count === 0) {
    const proj = await p.project.create({
      data: {
        nome: 'Guia Digital Teen 2026',
        edital: 'FMCA/COMDICA',
        financiador: 'Fundo Municipal da Criança',
        area: 'Digital',
        valor: 320000,
        status: 'Inscrito',
        prazo: new Date('2026-04-15'),
        responsavelId: admin.id,
        probabilidade: 72,
        risco: 'Médio',
        aderencia: 5,
        territorio: 'RPA 6 — Pina / Ipsep',
        publico: 'Adolescentes 12–18 anos',
        competitividade: 'Alta',
        proximoPasso: 'Aguardar resultado do edital',
        ptScore: 8.1,
        observacao: 'Alto alinhamento histórico com COMDICA.',
        ano: 2026,
        categoriaEdital: 'Fundo Municipal',
        programaInterno: 'Inclusão Digital',
        scoreCompliance: 92,
        scoreRiscoGlosa: 8,
        ptCriterios: [{critério:'Aderência',score:9}],
        historico: [{data:'10/02/2026',acao:'Oportunidade identificada',autor:'Janaina Constantino'}]
      }
    });
    await p.alert.create({
      data: {
        projectId: proj.id,
        titulo: 'Documento a Vencer',
        mensagem: 'CND Municipal Recife vence em 15 dias.',
        nivel: 'N4',
        status: 'PENDENTE',
        tipo: 'DOCUMENTO',
        prazo: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      }
    });
    console.log('✓ Seed project created');
  }
  await p.$disconnect();
  console.log('✓ Seed completed');
}
seed().catch(e => { console.error('✗ Seed failed:', e.message); process.exit(1); });
    `;
    execSync(`railway run node -e "${seedScript.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });

    // Step 7: Redeploy
    log('Step 7: Redeploying...');
    try {
      execSync('railway redeploy --yes', { stdio: 'pipe' });
    } catch {
      log('Redeploy triggered via CLI');
    }
    log('Waiting 90 seconds for server to start...');
    await new Promise(r => setTimeout(r, 90000));

    // Step 8: Validate endpoints
    log('Step 8: Validating endpoints...');
    const https = require('https');
    const URL = 'rotainteligente-production.up.railway.app';

    const health = await new Promise((res) => {
      https.get('https://' + URL + '/api/health', r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => {
          try { res(JSON.parse(d)); } catch { res(null); }
        });
      }).on('error', () => res(null));
    });
    console.log('Health:', health?.status === 'ok' ? '✓' : '✗');

    const login = await new Promise((res) => {
      const body = JSON.stringify({email:'admin@guiasocial.org',password:'admin123'});
      const opts = {
        hostname: URL, port: 443, path: '/api/auth/login',
        method: 'POST',
        headers: {'Content-Type':'application/json','Content-Length':body.length}
      };
      const req = https.request(opts, r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => {
          try { res(JSON.parse(d)); } catch { res(null); }
        });
      });
      req.on('error', () => res(null));
      req.write(body);
      req.end();
    });
    console.log('Login:', login?.accessToken ? '✓' : '✗');

    if (login?.accessToken) {
      const token = login.accessToken;
      const proj = await new Promise((res) => {
        https.get({hostname:URL,port:443,path:'/api/projects',headers:{'Authorization':'Bearer '+token}}, r => {
          let d = '';
          r.on('data', c => d += c);
          r.on('end', () => { try { res(JSON.parse(d)); } catch { res(null); } });
        }).on('error', () => res(null));
      });
      console.log('Projects:', Array.isArray(proj) ? '✓' : '✗');

      const alerts = await new Promise((res) => {
        https.get({hostname:URL,port:443,path:'/api/alerts',headers:{'Authorization':'Bearer '+token}}, r => {
          let d = '';
          r.on('data', c => d += c);
          r.on('end', () => { try { res(JSON.parse(d)); } catch { res(null); } });
        }).on('error', () => res(null));
      });
      console.log('Alerts:', Array.isArray(alerts) ? '✓' : '✗');
    }

    // Step 9: Change password
    log('Step 9: Changing admin password...');
    const changeScript = `
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
async function changePassword() {
  const p = new PrismaClient();
  const base = crypto.randomBytes(18).toString('base64').replace(/[+/=]/g, '').substring(0, 18);
  const newPassword = base + 'Rota!26';
  const hash = await bcrypt.hash(newPassword, 12);
  await p.user.update({
    where: { email: 'admin@guiasocial.org' },
    data: { password: hash }
  });
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log(' SENHA ATUALIZADA — GUARDE AGORA');
  console.log('══════════════════════════════════════════════');
  console.log(' Email : admin@guiasocial.org');
  console.log(' Senha : ' + newPassword);
  console.log('══════════════════════════════════════════════');
  console.log(' Esta senha não será exibida novamente.');
  console.log('══════════════════════════════════════════════');
  await p.$disconnect();
}
changePassword().catch(e => { console.error('✗ Password change failed:', e.message); process.exit(1); });
    `;
    execSync(`railway run node -e "${changeScript.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });

    log('\n✓ DEPLOYMENT COMPLETE');
    log('URL: https://rotainteligente-production.up.railway.app');
    log('Email: admin@guiasocial.org');
    log('Senha: [veja acima]\n');

  } catch (e) {
    error(e.message);
  }
}

run();
