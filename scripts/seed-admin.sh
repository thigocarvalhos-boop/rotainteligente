#!/bin/bash
echo "Ensuring admin user exists..."
railway run node -e "
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
async function seed() {
  const prisma = new PrismaClient();
  const hash = await bcrypt.hash('admin123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@guiasocial.org' },
    update: {},
    create: {
      email: 'admin@guiasocial.org',
      password: hash,
      name: 'Administrador ROTA',
      role: 'SUPER_ADMIN'
    }
  });
  console.log('✓ Admin user ready:', user.email);
  await prisma.\$disconnect();
}
seed().catch(e => { console.error(e.message); process.exit(1); });
"
