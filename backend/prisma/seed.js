// CommonJS seed script — used in production Docker container
// Run: node prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@quantumcode.dev';
  const password = process.env.ADMIN_PASSWORD || 'Admin2026!';
  const name = process.env.ADMIN_NAME || 'Admin Quantum Code';

  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  ADMIN_PASSWORD not set in env, using default password.');
  }

  const exists = await prisma.user.findUnique({ where: { email } });

  if (!exists) {
    const hash = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
      data: { email, password: hash, name, role: 'SUPER_ADMIN' },
    });
    console.log('✅ Admin created:', admin.email);
  } else {
    console.log('ℹ️  Admin already exists:', email);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
