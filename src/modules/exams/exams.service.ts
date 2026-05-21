import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "src/core/database/prisma.service";
import { CreateExamDto } from "./dto/create-exam.dto";
import { UserRole, ExamStatus } from "@prisma/client";
import { uploadToSupabase } from "src/core/utils/supabase-upload";
import { join } from "path";
import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Yangi imtihon yaratish
  async create(dto: CreateExamDto, currentUser: any, file?: string) {
    // Check access
    if (currentUser.role === UserRole.TEACHER) {
      const access = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: dto.group_id },
      });
      if (!access)
        throw new ForbiddenException("Siz bu guruhga dars bermaysiz");
    }

    if (file) {
      await uploadToSupabase(file);
    }

    const exam = await this.prisma.exam.create({
      data: {
        title: dto.title,
        description: dto.description,
        file: file || null,
        group_id: dto.group_id,
        start_date: dto.start_date ? new Date(dto.start_date) : null,
        end_date: dto.end_date ? new Date(dto.end_date) : null,
        teacher_id:
          currentUser.role === UserRole.TEACHER ? currentUser.id : null,
        user_id: currentUser.role !== UserRole.TEACHER ? currentUser.id : null,
      },
    });
    return { success: true, data: exam };
  }

  // 2. Guruhga tegishli barcha imtihonlarni olish
  async findAllByGroup(groupId: number, currentUser: any) {
    // Check access
    if (currentUser.role === UserRole.TEACHER) {
      const access = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: groupId },
      });
      if (!access)
        throw new ForbiddenException("Siz bu guruhga dars bermaysiz");
    } else if (currentUser.role === UserRole.STUDENT) {
      const access = await this.prisma.studentGroup.findFirst({
        where: {
          student_id: currentUser.id,
          group_id: groupId,
          status: "active",
          students: { status: "active" },
        },
      });
      if (!access) throw new ForbiddenException("Siz bu guruhda o'qimaysiz");
    }

    const exams = await this.prisma.exam.findMany({
      where: { group_id: groupId },
      include: {
        _count: { select: { examAnswers: true } },
        ...(currentUser.role === UserRole.STUDENT
          ? { examAnswers: { where: { student_id: currentUser.id } } }
          : {}),
      },
      orderBy: { created_at: "desc" },
    });

    // Guruh talabalar sonini olish
    const totalStudents = await this.prisma.studentGroup.count({
      where: {
        group_id: groupId,
        status: "active",
        students: { status: "active" },
      },
    });

    // Studentga o'z javobini qo'shib beramiz, lekin e'lon qilinmagan bo'lsa, ballarini yashiramiz!
    const data = exams.map((ex) => {
      const mapped: any = { ...ex, total_students: totalStudents };
      if (
        currentUser.role === UserRole.STUDENT &&
        mapped.examAnswers?.length > 0
      ) {
        const answer = mapped.examAnswers[0];
        if (!ex.is_published) {
          answer.score = null;
          answer.feedback = null;
        }
        mapped.myAnswer = answer;
      }
      delete mapped.examAnswers;
      return mapped;
    });

    return { success: true, data };
  }

  // 3. Imtihonga yuborilgan javoblarni ko'rish
  async getExamSubmissions(examId: number, currentUser: any) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException("Imtihon topilmadi");

    // Teachers checking
    if (currentUser.role === UserRole.TEACHER) {
      const access = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: exam.group_id },
      });
      if (!access) throw new ForbiddenException("Ruxsat yo'q");
    }

    const submissions = await this.prisma.examAnswer.findMany({
      where: { exam_id: examId },
      include: {
        students: { select: { id: true, full_name: true, phone: true } },
      },
      orderBy: { created_at: "desc" },
    });

    // Fetch all students in the group
    const studentGroups = await this.prisma.studentGroup.findMany({
      where: {
        group_id: exam.group_id,
        status: "active",
        students: { status: "active" },
      },
      include: {
        students: { select: { id: true, full_name: true, phone: true } },
      },
    });

    const result = studentGroups.map((sg) => {
      const sub = submissions.find((s) => s.student_id === sg.student_id);
      if (sub) return sub;
      return {
        id: `unsub_${exam.id}_${sg.student_id}`,
        student_id: sg.student_id,
        exam_id: exam.id,
        title: null,
        file: null,
        examStatus: "NOT_SUBMITTED",
        score: null,
        feedback: null,
        checked_at: null,
        created_at: null,
        updated_at: null,
        students: sg.students,
      };
    });

    return { success: true, data: result, exam };
  }

  // 4. Imtihonni tekshirib ball qo'yish (Grade)
  async gradeSubmission(
    answerId: string | number,
    score: number,
    feedback: string,
    currentUser: any,
  ) {
    let answer;

    // Parse and auto-create if it's an unsubmitted student
    if (typeof answerId === "string" && answerId.startsWith("unsub_")) {
      const parts = answerId.split("_");
      const examId = Number(parts[1]);
      const studentId = Number(parts[2]);

      if (currentUser.role === UserRole.TEACHER) {
        const access = await this.prisma.teachersGroup.findFirst({
          where: { teacher_id: currentUser.id, group_id: examId },
        });
        if (!access) throw new ForbiddenException("Ruxsat yo'q");
      }

      let status: ExamStatus = ExamStatus.ACCEPTED;
      if (score < 60) status = ExamStatus.RETURNED;

      const created = await this.prisma.examAnswer.create({
        data: {
          exam_id: examId,
          student_id: studentId,
          title: "Baho kiritildi",
          examStatus: status,
          score,
          feedback,
          checked_at: new Date(),
        },
      });
      return { success: true, data: created, message: "Baho qo'yildi" };
    }

    // Existing submission flow
    const numericId = Number(answerId);
    answer = await this.prisma.examAnswer.findUnique({
      where: { id: numericId },
      include: { exams: true },
    });
    if (!answer) throw new NotFoundException("Topshiriq topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      const access = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: answer.exams.group_id },
      });
      if (!access) throw new ForbiddenException("Ruxsat yo'q");
    }

    let status: ExamStatus = ExamStatus.ACCEPTED;
    if (score < 60) status = ExamStatus.RETURNED;

    const updated = await this.prisma.examAnswer.update({
      where: { id: numericId },
      data: {
        score,
        feedback,
        examStatus: status,
        checked_at: new Date(),
      },
    });

    return { success: true, data: updated, message: "Baho qo'yildi" };
  }

  // 5. Imtihon natijalarini hammaga e'lon qilish
  async publishExam(examId: number, currentUser: any) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException("Imtihon topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      const access = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: exam.group_id },
      });
      if (!access) throw new ForbiddenException("Ruxsat yo'q");
    }

    await this.prisma.exam.update({
      where: { id: examId },
      data: {
        is_published: true,
        published_at: new Date(),
      },
    });

    return { success: true, message: "Imtihon natijalari e'lon qilindi!" };
  }

  // 6. Imtihonni tahrirlash (Update)
  async updateExam(
    examId: number,
    data: {
      title: string;
      description?: string;
      start_date?: Date;
      end_date?: Date;
      file?: string;
    },
    currentUser: any,
  ) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException("Imtihon topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      const access = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: exam.group_id },
      });
      if (!access) throw new ForbiddenException("Ruxsat yo'q");
    }

    if (data.file) {
      if (exam.file) {
        const filePath = join(process.cwd(), "src", "uploads", exam.file);
        try {
          fs.unlinkSync(filePath);
        } catch {}
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;
        if (url && key) {
          try {
            const supabase = createClient(url, key);
            await supabase.storage.from("NajotEdu").remove([exam.file]);
          } catch {}
        }
      }
      await uploadToSupabase(data.file);
    }

    const updated = await this.prisma.exam.update({
      where: { id: examId },
      data: {
        title: data.title,
        description: data.description,
        start_date: data.start_date ? new Date(data.start_date) : undefined,
        end_date: data.end_date ? new Date(data.end_date) : undefined,
        file: data.file || undefined,
      },
    });

    return {
      success: true,
      data: updated,
      message: "Imtihon muvaffaqiyatli tahrirlandi",
    };
  }

  // 7. Imtihonni o'chirish (Delete)
  async deleteExam(examId: number, currentUser: any) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException("Imtihon topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      const access = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: exam.group_id },
      });
      if (!access) throw new ForbiddenException("Ruxsat yo'q");
    }

    // Delete physical/remote files
    if (exam.file) {
      const filePath = join(process.cwd(), "src", "uploads", exam.file);
      try {
        fs.unlinkSync(filePath);
      } catch {}
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_KEY;
      if (url && key) {
        try {
          const supabase = createClient(url, key);
          await supabase.storage.from("NajotEdu").remove([exam.file]);
        } catch {}
      }
    }

    // First delete all submissions under this exam
    await this.prisma.examAnswer.deleteMany({
      where: { exam_id: examId },
    });

    await this.prisma.exam.delete({
      where: { id: examId },
    });

    return { success: true, message: "Imtihon muvaffaqiyatli o'chirildi" };
  }
}
