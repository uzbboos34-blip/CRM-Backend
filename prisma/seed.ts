import { PrismaClient, UserRole, Status, HomeworkStatus } from '@prisma/client';
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
  console.log('🌱 Seed boshlandi...\n');

  // ─── 1. SuperAdmin yaratish ───────────────────────────────────────────────
  const phone = '+998907012161';
  const password = 'Rahmonbergan04@';
  const passHash = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.user.upsert({
    where: { phone },
    update: { password: passHash, full_name: 'Super Admin', email: 'superadmin@crm.uz', role: UserRole.SUPERADMIN, status: Status.active },
    create: { full_name: 'Super Admin', email: 'superadmin@crm.uz', password: passHash, phone, role: UserRole.SUPERADMIN, status: Status.active },
  });
  console.log(`✅ SuperAdmin: ${superAdmin.full_name} (ID: ${superAdmin.id})`);

  // ─── 2. Homework test ma'lumotlari ───────────────────────────────────────
  await seedHomeworkData();
}

async function seedHomeworkData() {
  console.log('\n📚 Homework test ma\'lumotlari yaratilmoqda...\n');

  // Birinchi aktiv guruhni topamiz
  const group = await prisma.groups.findFirst({
    where: { status: { in: ['active', 'planned'] } },
    orderBy: { id: 'asc' },
  });

  if (!group) {
    console.log('⚠️  Guruh topilmadi. Homework seed o\'tkazib yuborildi.');
    return;
  }

  console.log(`✅ Guruh: "${group.name}" (ID: ${group.id})`);

  // ─── Studentlarni olish (Faqat mavjud studentlardan foydalanamiz) ──────
  const groupStudents = await prisma.studentGroup.findMany({
    where: { group_id: group.id, status: Status.active },
    include: { students: true },
  });

  const students = groupStudents.map(sg => sg.students);
  if (students.length === 0) {
    console.log('⚠️  Guruhda studentlar yo\'q. Homework seed o\'tkazib yuborildi.');
    return;
  }
  
  console.log(`   👥 Guruhdagi mavjud studentlar soni: ${students.length}`);

  // ─── Dars topamiz yoki yaratamiz ─────────────────────────────────────────
  let lesson = await prisma.lesson.findFirst({
    where: { group_id: group.id },
    orderBy: { created_at: 'desc' },
  });

  if (!lesson) {
    lesson = await prisma.lesson.create({
      data: {
        group_id: group.id,
        topic: 'CRM Backend — Homework Checking',
        description: 'Homework tekshirish qismini qilish',
        status: Status.active,
        date: new Date(),
      },
    });
    console.log(`\n   📖 Dars yaratildi: "${lesson.topic}" (ID: ${lesson.id})`);
  } else {
    console.log(`\n   📖 Mavjud dars: "${lesson.topic}" (ID: ${lesson.id})`);
  }

  // ─── Uyga vazifa topamiz yoki yaratamiz ──────────────────────────────────
  let homework = await prisma.homeWork.findFirst({
    where: { group_id: group.id, lesson_id: lesson.id },
    orderBy: { created_at: 'desc' },
  });

  if (!homework) {
    homework = await prisma.homeWork.create({
      data: {
        group_id: group.id,
        lesson_id: lesson.id,
        title: 'CRM backend homework checking',
        description: 'Homework tekshirish qismini qilish backend',
      },
    });
    console.log(`   📝 Uyga vazifa yaratildi: "${homework.title}" (ID: ${homework.id})\n`);
  } else {
    console.log(`   📝 Mavjud vazifa: "${homework.title}" (ID: ${homework.id})\n`);
  }

  // ─── Avvalgi javoblarni tozalaymiz ───────────────────────────────────────
  const existingAnswers = await prisma.homeWorkAnswer.findMany({
    where: { homwork_id: homework.id },
    select: { id: true },
  });

  if (existingAnswers.length > 0) {
    await prisma.homeWorkResult.deleteMany({
      where: { homework_answer_id: { in: existingAnswers.map((a) => a.id) } },
    });
    await prisma.homeWorkAnswer.deleteMany({
      where: { homwork_id: homework.id },
    });
    console.log(`   🗑  Avvalgi ${existingAnswers.length} ta javob tozalandi`);
  }

  // ─── Topshiriqlar yaratish ───────────────────────────────────────────────
  // Scenario: kutilayotgan x2, qabul x2, qaytarilgan x1, bajarmagan x1
  const scenarios: { idx: number; submit: boolean; grade: number | null }[] = [
    { idx: 0, submit: true,  grade: null }, // kutilayotgan
    { idx: 1, submit: true,  grade: 85   }, // qabul qilingan
    { idx: 2, submit: true,  grade: 40   }, // qaytarilgan
    { idx: 3, submit: true,  grade: null }, // kutilayotgan
    { idx: 4, submit: false, grade: null }, // bajarmagan
    { idx: 5, submit: true,  grade: 92   }, // qabul qilingan
  ];

  console.log('📬 Topshiriqlar yaratilmoqda:\n');

  for (const sc of scenarios) {
    const student = students[sc.idx];
    if (!student) continue;

    if (!sc.submit) {
      console.log(`   ⬜ ${student.full_name} — Bajarmagan`);
      continue;
    }

    const submittedAt = new Date();
    submittedAt.setHours(submittedAt.getHours() - Math.floor(Math.random() * 10 + 1));

    let hwStatus = 'PENDING';
    if (sc.grade !== null) {
      hwStatus = sc.grade >= 60 ? 'ACCEPTED' : 'RETURNED';
    }

    const answer = await prisma.homeWorkAnswer.create({
      data: {
        student_id: student.id,
        homwork_id: homework.id,
        title: `Vazifam tayyor! (${student.full_name})`,
        file: JSON.stringify([
          `screenshot_${student.id}_1.png`,
          `screenshot_${student.id}_2.png`,
          `screenshot_${student.id}_3.png`,
        ]),
        homeworkStatus: hwStatus as HomeworkStatus,
        created_at: submittedAt,
        updated_at: submittedAt,
      },
    });

    if (sc.grade !== null) {
      await prisma.homeWorkResult.create({
        data: {
          homework_answer_id: answer.id,
          grade: sc.grade,
          title: sc.grade >= 60 ? 'Yaxshi ish! Qabul qilindi.' : "Qayta ko'rib chiqing.",
        },
      });
      const emoji = sc.grade >= 60 ? '✅' : '⚠️ ';
      const label = sc.grade >= 60 ? 'Qabul qilindi' : 'Qaytarildi';
      console.log(`   ${emoji} ${student.full_name} — ${label} (${sc.grade} ball)`);
    } else {
      console.log(`   🟡 ${student.full_name} — Kutilayotgan`);
    }
  }

  // ─── Yakuniy statistika ──────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seed yakunlandi!\n');

  const finalAnswers = await prisma.homeWorkAnswer.findMany({
    where: { homwork_id: homework.id },
    include: { homeWorkResults: true },
  });
  const totalStudents = await prisma.studentGroup.count({
    where: { group_id: group.id, status: Status.active },
  });

  const submitted = finalAnswers.length;
  const accepted = finalAnswers.filter((a) => a.homeWorkResults[0]?.grade >= 60).length;
  const returned = finalAnswers.filter(
    (a) => a.homeWorkResults.length > 0 && a.homeWorkResults[0].grade < 60,
  ).length;
  const pending  = finalAnswers.filter((a) => a.homeWorkResults.length === 0).length;
  const notDone  = Math.max(0, totalStudents - submitted);

  console.log(`📊 Statistika (Homework ID: ${homework.id}):`);
  console.log(`   👥 Jami studentlar:   ${totalStudents}`);
  console.log(`   🟡 Kutilayotganlar:   ${pending}`);
  console.log(`   ✅ Qabul qilinganlar: ${accepted}`);
  console.log(`   🔴 Qaytarilganlar:    ${returned}`);
  console.log(`   ⬜ Bajarmaganlar:     ${notDone}`);
  console.log('\n🔗 Frontend URL lar:');
  console.log(`   Guruh: http://localhost:5173/group/${group.id}?tab=1`);
  console.log(`   Homework: http://localhost:5173/group/${group.id}/homework/${homework.id}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
