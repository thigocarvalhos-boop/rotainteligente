#!/usr/bin/env node
/**
 * ROTA — Finalização do banco de dados
 * Só precisa rodar UMA VEZ após o deploy.
 * Execute: node finalizar.js
 */
const { execSync } = require("child_process");
const https = require("https");
const fs = require("fs");
const crypto = require("crypto");

const G = "\x1b[32m", R = "\x1b[31m", Y = "\x1b[33m", C = "\x1b[36m", B = "\x1b[1m", X = "\x1b[0m";
const ok  = m => console.log(`${G}  ✓ ${m}${X}`);
const err = m => console.log(`${R}  ✗ ${m}${X}`);
const inf = m => console.log(`${C}  → ${m}${X}`);

function run(cmd, timeout = 180000) {
  try {
    return { ok: true, out: execSync(cmd, { encoding: "utf8", timeout, stdio: "pipe" }).trim() };
  } catch(e) {
    return { ok: false, out: (e.stdout||"").trim(), err: (e.stderr||e.message||"").trim() };
  }
}

function httpPost(host, path, body) {
  return new Promise(resolve => {
    const b = JSON.stringify(body);
    const req = https.request({
      hostname: host, port: 443, path, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(b) }
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on("error", e => resolve({ status: 0, error: e.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, error: "timeout" }); });
    req.write(b); req.end();
  });
}

function httpGet(host, path, token) {
  return new Promise(resolve => {
    const req = https.request({
      hostname: host, port: 443, path,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on("error", e => resolve({ status: 0, error: e.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, error: "timeout" }); });
    req.end();
  });
}

async function main() {
  console.log(`\n${B}${C}`);
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║      ROTA — Finalização do banco de dados            ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(X + "\n");

  // ── Verificar railway CLI ──────────────────────────────────────────────────
  inf("Verificando Railway CLI...");
  const rv = run("railway --version");
  if (!rv.ok) {
    inf("Instalando Railway CLI...");
    execSync("npm install -g @railway/cli", { stdio: "inherit" });
  }
  ok("Railway CLI pronto");

  // ── Verificar autenticação ─────────────────────────────────────────────────
  inf("Verificando login...");
  const who = run("railway whoami");
  if (!who.ok || !who.out || who.out.includes("not logged")) {
    console.log(`\n${Y}${B}`);
    console.log("  ┌────────────────────────────────────────────┐");
    console.log("  │  Abra o browser que vai aparecer,          │");
    console.log("  │  faça login no Railway e volte aqui.       │");
    console.log("  └────────────────────────────────────────────┘");
    console.log(X + "\n");
    execSync("railway login", { stdio: "inherit" });
  }
  const who2 = run("railway whoami");
  ok(`Autenticado: ${who2.out}`);

  // ── Vincular projeto ───────────────────────────────────────────────────────
  inf("Verificando vínculo com o projeto...");
  const st = run("railway status");
  if (!st.ok || !st.out.includes("rotainteligente")) {
    console.log(`\n${Y}${B}`);
    console.log("  ┌────────────────────────────────────────────┐");
    console.log("  │  Selecione: rotainteligente                │");
    console.log("  │  Serviço: rotainteligente (NÃO o Postgres) │");
    console.log("  └────────────────────────────────────────────┘");
    console.log(X + "\n");
    execSync("railway link", { stdio: "inherit" });
  }
  ok("Projeto vinculado");

  // ── DB Push ────────────────────────────────────────────────────────────────
  inf("Criando tabelas no banco (aguarde até 60s)...");
  for (let i = 1; i <= 3; i++) {
    const r = run("railway run npx prisma db push --accept-data-loss", 180000);
    if (r.ok || (r.out + r.err).includes("in sync") || (r.out + r.err).includes("migrations")) {
      ok("Tabelas criadas com sucesso"); break;
    }
    if (i < 3) { inf(`Tentativa ${i} falhou, aguardando 20s...`); await new Promise(r => setTimeout(r, 20000)); }
    else { err("DB push falhou 3x. Verifique se o Postgres está On-line no Railway."); process.exit(1); }
  }

  // ── Seed ───────────────────────────────────────────────────────────────────
  inf("Criando usuário admin...");
  const seed = `
const {PrismaClient}=require('@prisma/client');
const bcrypt=require('bcryptjs');
const p=new PrismaClient();
(async()=>{
  const h=await bcrypt.hash('admin123',12);
  const u=await p.user.upsert({
    where:{email:'admin@guiasocial.org'},
    update:{},
    create:{email:'admin@guiasocial.org',password:h,name:'Administrador ROTA',role:'SUPER_ADMIN'}
  });
  const c=await p.project.count();
  if(c===0){
    const proj=await p.project.create({data:{
      nome:'Guia Digital Teen 2026',edital:'FMCA/COMDICA',
      financiador:'Fundo Municipal da Criança',area:'Digital',valor:320000,
      status:'Inscrito',prazo:new Date('2026-04-15'),responsavelId:u.id,
      probabilidade:72,risco:'Médio',aderencia:5,territorio:'RPA 6 — Pina / Ipsep',
      publico:'Adolescentes 12–18 anos',competitividade:'Alta',
      proximoPasso:'Aguardar resultado do edital',ptScore:8.1,
      observacao:'Alto alinhamento com COMDICA.',ano:2026,
      categoriaEdital:'Fundo Municipal',programaInterno:'Inclusão Digital',
      scoreCompliance:92,scoreRiscoGlosa:8,
      ptCriterios:[{critério:'Aderência',score:9},{critério:'Força Conceitual',score:8}],
      historico:[{data:'12/03/2026',acao:'Submetido',autor:'Viviane Castro'}]
    }});
    await p.alert.create({data:{projectId:proj.id,titulo:'Documento a Vencer',
      mensagem:'CND Municipal Recife vence em 15 dias.',nivel:'N4',
      status:'PENDENTE',tipo:'DOCUMENTO',
      prazo:new Date(Date.now()+15*24*60*60*1000)}});
    console.log('SEED_OK_COM_PROJETO');
  } else { console.log('SEED_OK_SEM_PROJETO'); }
  await p.$disconnect();
})().catch(e=>{console.error('ERRO:'+e.message);process.exit(1);});
`;
  const tmp = require("os").tmpdir() + "/rota_seed_final.js";
  fs.writeFileSync(tmp, seed);
  const sr = run(`railway run node ${tmp}`, 120000);
  fs.unlinkSync(tmp);
  if (sr.out.includes("SEED_OK")) { ok("Usuário admin criado"); }
  else { err("Seed com problema: " + sr.err.substring(0, 120)); }

  // ── Aguardar servidor ──────────────────────────────────────────────────────
  const HOST = "rotainteligente-production.up.railway.app";
  inf("Aguardando servidor responder (pode levar 30s)...");
  let ok_health = false;
  for (let i = 0; i < 8; i++) {
    const h = await httpGet(HOST, "/api/health");
    if (h.status === 200 && h.body && h.body.status === "ok") { ok_health = true; break; }
    process.stdout.write(".");
    await new Promise(r => setTimeout(r, 10000));
  }
  console.log("");
  if (!ok_health) {
    err("Servidor não respondeu ainda. Aguarde 2 minutos e acesse:");
    err(`https://${HOST}`);
  } else {
    ok("Servidor respondendo");
  }

  // ── Testar login ───────────────────────────────────────────────────────────
  inf("Testando login...");
  const login = await httpPost(HOST, "/api/auth/login", {
    email: "admin@guiasocial.org", password: "admin123"
  });
  let token = null;
  if (login.status === 200 && login.body && login.body.accessToken) {
    token = login.body.accessToken;
    ok(`Login OK — ${login.body.user.name}`);
  } else {
    err(`Login falhou: ${login.status} — ${JSON.stringify(login.body).substring(0, 80)}`);
  }

  // ── Trocar senha ───────────────────────────────────────────────────────────
  const base = crypto.randomBytes(14).toString("base64").replace(/[+/=]/g,"").substring(0,14);
  const novaSenha = "Rota@" + base + "26";

  const chg = `
const {PrismaClient}=require('@prisma/client');
const bcrypt=require('bcryptjs');
const p=new PrismaClient();
(async()=>{
  const h=await bcrypt.hash('${novaSenha}',12);
  await p.user.update({where:{email:'admin@guiasocial.org'},data:{password:h}});
  console.log('SENHA_OK');
  await p.$disconnect();
})().catch(e=>{console.error('ERRO:'+e.message);process.exit(1);});
`;
  const tmp2 = require("os").tmpdir() + "/rota_chg.js";
  fs.writeFileSync(tmp2, chg);
  const cr = run(`railway run node ${tmp2}`, 60000);
  fs.unlinkSync(tmp2);
  if (cr.out.includes("SENHA_OK")) { ok("Senha trocada"); }

  // Salvar credenciais
  const creds = [
    "╔══════════════════════════════════════════════════════╗",
    "║         ROTA — CREDENCIAIS DE ACESSO                 ║",
    "╠══════════════════════════════════════════════════════╣",
    `║  URL   : https://${HOST.padEnd(33)}║`,
    "║  Email : admin@guiasocial.org                        ║",
    `║  Senha : ${novaSenha.padEnd(43)}║`,
    "╠══════════════════════════════════════════════════════╣",
    `║  ${new Date().toLocaleString("pt-BR").padEnd(52)}║`,
    "╚══════════════════════════════════════════════════════╝",
  ].join("\n");
  fs.writeFileSync("CREDENCIAIS_ROTA.txt", creds);

  // ── Resultado final ────────────────────────────────────────────────────────
  console.log(`\n${B}${G}`);
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║              ROTA — PRONTO PARA USO                  ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  URL   : https://${HOST.padEnd(33)}║`);
  console.log("║  Email : admin@guiasocial.org                        ║");
  console.log(`║  Senha : ${novaSenha.padEnd(43)}║`);
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║  Arquivo CREDENCIAIS_ROTA.txt salvo nesta pasta      ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(X);
}

main().catch(e => {
  console.error(`\x1b[31m\nErro: ${e.message}\x1b[0m`);
  console.error("Tente novamente: node finalizar.js");
  process.exit(1);
});
