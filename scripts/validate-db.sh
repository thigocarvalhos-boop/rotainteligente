#!/bin/bash
echo "Validating database tables..."
railway run node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRaw\`SELECT tablename FROM pg_tables WHERE schemaname='public'\`
.then(rows => {
  const tables = rows.map(r => r.tablename);
  const required = ['User','Project','Meta','Etapa','Expense','Document','Alert','AuditLog','ComplianceCheck','Cotacao'];
  const missing = required.filter(t => !tables.some(tbl => tbl.toLowerCase() === t.toLowerCase()));
  if (missing.length === 0) {
    console.log('✓ All', required.length, 'tables exist');
    process.exit(0);
  } else {
    console.log('✗ Missing tables:', missing.join(', '));
    process.exit(1);
  }
  return p.\$disconnect();
})
.catch(e => { console.error(e.message); process.exit(1); });
"
