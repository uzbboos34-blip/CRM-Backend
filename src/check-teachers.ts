import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    return;
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // List all teachers with their phone numbers
  const teachers = await prisma.teachers.findMany({
    select: {
      id: true,
      full_name: true,
      phone: true,
      email: true,
      status: true,
      teachersGroups: {
        select: {
          group: {
            select: { id: true, name: true }
          }
        }
      }
    },
    orderBy: { id: 'asc' }
  });

  console.log(`\n=== Teachers in database (${teachers.length} total) ===\n`);
  teachers.forEach(t => {
    const groups = t.teachersGroups.map(tg => `${tg.group.id}:${tg.group.name}`).join(', ');
    console.log(`ID: ${t.id} | Name: ${t.full_name} | Phone: ${t.phone} | Status: ${t.status}`);
    console.log(`  Groups: ${groups || '(none)'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(e => console.error(e));
