import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const groups = await prisma.groups.findMany({
    include: { studentGroups: true, teachersGroups: true }
  });

  for (const group of groups) {
    // Agar guruhda o'quvchilar bo'lmasa, imtihon qo'shmaymiz
    if (group.studentGroups.length === 0) continue;

    const teacher_id = group.teachersGroups[0]?.teacher_id || null;

    const exam = await prisma.exam.create({
      data: {
        title: "Backend Asoslari (Sinov)",
        description: "Ushbu imtihon orqali API yaratishni sinab ko'ramiz.",
        group_id: group.id,
        teacher_id,
        start_date: new Date(),
        end_date: new Date(new Date().getTime() + 86400000), // +1 kun
        is_published: false, // O'quvchilarga ko'rinmaydi
      }
    });

    console.log(`Created Exam for Group: ${group.name}`);

    // Har bir o'quvchi uchun javob qo'shamiz
    for (let i = 0; i < group.studentGroups.length; i++) {
      const sg = group.studentGroups[i];
      // Har xil statuslar
      const status: any = i % 3 === 0 ? "RETURNED" : (i % 2 === 0 ? "PENDING" : "ACCEPTED");
      const score = status === "ACCEPTED" ? 95 : (status === "RETURNED" ? 45 : 0);
      
      await prisma.examAnswer.create({
        data: {
          student_id: sg.student_id,
          exam_id: exam.id,
          title: "Mening yechimlarim shular.",
          file: "mock_student_file.zip",
          examStatus: status,
          score,
          feedback: status === "ACCEPTED" ? "Barakalla, zo'r chiqibdi!" : (status === "RETURNED" ? "Xatolar ko'p, qayta qiling." : null),
          checked_at: status !== "PENDING" ? new Date() : null,
        }
      });
    }
  }
}

main().then(() => {
  console.log("Barcha guruhlarga muvaffaqiyatli mock ma'lumotlar qo'shildi!");
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
