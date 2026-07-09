require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: { email: true, passwordHash: true, role: true }
  });

  console.log('\n===== PASSWORD HASH CHECK =====\n');
  users.forEach(u => {
    console.log('Email     : ' + u.email);
    console.log('Role      : ' + u.role);
    console.log('Stored DB : ' + u.passwordHash);
    console.log('Is Hashed : ' + (u.passwordHash.startsWith('$2') ? 'YES - bcrypt hash ✅' : 'NO - plain text ❌'));
    console.log('');
  });
  console.log('================================\n');
  await prisma.$disconnect();
}

check().catch(e => { console.error(e.message); process.exit(1); });
