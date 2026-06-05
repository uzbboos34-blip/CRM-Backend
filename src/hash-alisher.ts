import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    return;
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Hash the password '123456'
  const hashedPassword = await bcrypt.hash('123456', 10);
  console.log('Generated hash for "123456":', hashedPassword);

  // Update Alisher (ID: 2)
  const updatedTeacher = await prisma.teachers.update({
    where: { id: 2 },
    data: { password: hashedPassword },
    select: {
      id: true,
      full_name: true,
      phone: true,
      email: true
    }
  });

  console.log('Successfully updated Alisher password hash in database:');
  console.log(JSON.stringify(updatedTeacher, null, 2));

  await prisma.$disconnect();
}

main().catch(e => console.error(e));
