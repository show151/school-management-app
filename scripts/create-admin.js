#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcrypt');

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });
async function main() {
  const args = require('minimist')(process.argv.slice(2));
  const email = args.email || process.env.ADMIN_EMAIL;
  const password = args.password || process.env.ADMIN_PASSWORD;
  const name = args.name || 'Administrator';

  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js --email admin@example.com --password secret');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('User already exists. Updating to admin...');
    await prisma.user.update({ where: { email }, data: { isAdmin: true } });
    console.log('Updated existing user to admin.');
    await prisma.$disconnect();
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      isAdmin: true,
      emailVerified: true,
    },
  });

  console.log('Created admin user:', user.email);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
