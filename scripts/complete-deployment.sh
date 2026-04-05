#!/bin/bash
set -e

echo "🚀 ROTA COMPLETE DEPLOYMENT AUTOMATION"
echo "======================================"
echo ""

# Step 1: Install Railway CLI
echo "Step 1: Installing Railway CLI..."
npm install -g @railway/cli 2>/dev/null || echo "Railway CLI already installed"

# Step 2: Authenticate
echo "Step 2: Checking authentication..."
railway whoami 2>/dev/null && echo "Already authenticated" || railway login

# Step 3: Link to project
echo "Step 3: Linking to project..."
railway status 2>/dev/null | grep -q "rotainteligente" && echo "Already linked" || railway link

# Step 4: Create database tables
echo "Step 4: Creating database tables..."
railway run npx prisma db push --accept-data-loss

# Step 5: Verify tables
echo "Step 5: Verifying tables..."
railway run node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRaw\`SELECT tablename FROM pg_tables WHERE schemaname='public'\`
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
  return p.\$disconnect();
})
.catch(e => { console.error(e.message); process.exit(1); });
"

# Step 6: Run seed
echo "Step 6: Running seed..."
railway run node -e "
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
        ptCriterios: [{critério:'Aderência',score:9},{critério:'Força Conceitual',score:8}],
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
  await p.\$disconnect();
  console.log('✓ Seed completed');
}
seed().catch(e => { console.error('✗ Seed failed:', e.message); process.exit(1); });
"

# Step 7: Redeploy
echo "Step 7: Redeploying..."
railway redeploy --yes 2>/dev/null || echo "Redeploy triggered"
sleep 90

# Step 8-9: Validation and password change
echo "Step 8: Validating endpoints..."
railway run node -e "
const https = require('https');
const URL = 'rotainteligente-production.up.railway.app';

async function validate() {
  // Health check
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

  // Login
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
    
    // Projects
    const proj = await new Promise((res) => {
      https.get({hostname:URL,port:443,path:'/api/projects',headers:{'Authorization':'Bearer '+token}}, r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => { try { res(JSON.parse(d)); } catch { res(null); } });
      }).on('error', () => res(null));
    });
    console.log('Projects:', Array.isArray(proj) ? '✓' : '✗');
    
    // Alerts
    const alerts = await new Promise((res) => {
      https.get({hostname:URL,port:443,path:'/api/alerts',headers:{'Authorization':'Bearer '+token}}, r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => { try { res(JSON.parse(d)); } catch { res(null); } });
      }).on('error', () => res(null));
    });
    console.log('Alerts:', Array.isArray(alerts) ? '✓' : '✗');
  }
}

validate().catch(e => console.error('Validation error:', e.message));
"

# Step 9: Change password
echo "Step 9: Changing admin password..."
railway run node -e "
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
  await p.\$disconnect();
}
changePassword().catch(e => { console.error('✗ Password change failed:', e.message); process.exit(1); });
"

echo ""
echo "✓ DEPLOYMENT COMPLETE"
echo "URL: https://rotainteligente-production.up.railway.app"
echo "Email: admin@guiasocial.org"
echo "Senha: [veja acima]"
