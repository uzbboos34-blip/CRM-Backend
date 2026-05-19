import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UserRole, ExamStatus } from '@prisma/client';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Yangi imtihon yaratish
  async create(dto: CreateExamDto, currentUser: any) {
    // Check access
    if (currentUser.role === UserRole.TEACHER) {
      const access = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: dto.group_id },
      });
      if (!access) throw new ForbiddenException("Siz bu guruhga dars bermaysiz");
    }

    const exam = await this.prisma.exam.create({
      data: {
        title: dto.title,
        description: dto.description,
        group_id: dto.group_id,
        start_date: dto.start_date ? new Date(dto.start_date) : null,
        end_date: dto.end_date ? new Date(dto.end_date) : null,
        teacher_id: currentUser.role === UserRole.TEACHER ? currentUser.id : null,
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
      if (!access) throw new ForbiddenException("Siz bu guruhga dars bermaysiz");
    } else if (currentUser.role === UserRole.STUDENT) {
      const access = await this.prisma.studentGroup.findFirst({
        where: { student_id: currentUser.id, group_id: groupId },
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
      orderBy: { created_at: 'desc' },
    });

    // Studentga o'z javobini qo'shib beramiz, lekin e'lon qilinmagan bo'lsa, ballarini yashiramiz!
    const data = exams.map((ex) => {
      const mapped: any = { ...ex };
      if (currentUser.role === UserRole.STUDENT && mapped.examAnswers?.length > 0) {
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
      orderBy: { created_at: 'desc' },
    });

    return { success: true, data: submissions, exam };
  }

  // 4. Imtihonni tekshirib ball qo'yish (Grade)
  async gradeSubmission(answerId: number, score: number, feedback: string, currentUser: any) {
    const answer = await this.prisma.examAnswer.findUnique({
      where: { id: answerId },
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
      where: { id: answerId },
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
}
