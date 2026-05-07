import { PrismaClient, UserRole, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const phone = '+998907012161';
  const password = 'Rahmonbergan04@';

  const passHash = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.user.upsert({
    where: { phone },
    update: {
      password: passHash,
      full_name: 'Super Admin',
      email: 'superadmin@crm.uz',
      role: UserRole.SUPERADMIN,
      status: Status.active,
    },
    create: {
      full_name: 'Super Admin',
      email: 'superadmin@crm.uz',
      password: passHash,
      phone,
      role: UserRole.SUPERADMIN,
      status: Status.active,
    },
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
