import pkg from '@prisma/client';
const { PrismaClient } = pkg as any;
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me';

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        password: hashed,
        isAdmin: true,
        emailVerified: true,
      },
    });
    console.log('Created admin user:', admin.email);
  } else {
    console.log('Admin already exists:', admin.email);
  }

  const subjects = ['Math', 'English', 'Science', 'History', 'Art'];
  for (const name of subjects) {
    const exists = await prisma.subject.findUnique({ where: { name } });
    if (!exists) {
      await prisma.subject.create({ data: { name } });
      console.log('Created subject:', name);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
