import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateHomeWorkDto } from "./dto/create-home-work.dto";
import { UpdateHomeWorkDto } from "./dto/update-home-work.dto";
import { PrismaService } from "src/core/database/prisma.service";
import { UserRole, Status, HomeworkStatus } from "@prisma/client";
import { uploadToSupabase } from "src/core/utils/supabase-upload";
import { join } from "path";
import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";

@Injectable()
export class HomeWorksService {
  constructor(private prisma: PrismaService) {}

  // ─── Helper: Check teacher belongs to group ────────────────────────────────
  private async checkTeacherGroup(teacherId: number, groupId: number) {
    const tg = await this.prisma.teachersGroup.findFirst({
      where: { teacher_id: teacherId, group_id: groupId },
    });
    if (!tg) throw new ForbiddenException("Bu sizning guruhingiz emas");
  }

  // ─── CREATE ────────────────────────────────────────────────────────────────
  async create(
    dto: CreateHomeWorkDto,
    currentUser: { id: number; role: UserRole },
    file?: string,
    video?: string,
  ) {
    const groupId = Number(dto.group_id);
    const lessonId = Number(dto.lesson_id);

    const group = await this.prisma.groups.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new BadRequestException("Guruh topilmadi");

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, group_id: groupId },
    });
    if (!lesson)
      throw new BadRequestException(
        "Bu dars bu guruhga tegishli emas yoki topilmadi",
      );

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroup(currentUser.id, groupId);
    }

    if (file) {
      await uploadToSupabase(file);
    }
    if (video) {
      await uploadToSupabase(video);
    }

    const hw = await this.prisma.homeWork.create({
      data: {
        lesson_id: lessonId,
        group_id: groupId,
        title: dto.title,
        description: dto.description,
        file: file || dto.file,
        video_url: video || dto.video_url,
        teacher_id:
          currentUser.role === UserRole.TEACHER ? currentUser.id : null,
        user_id: currentUser.role !== UserRole.TEACHER ? currentUser.id : null,
      },
      include: {
        lessons: { select: { id: true, topic: true, date: true } },
        groups: { select: { id: true, name: true } },
        teachers: { select: { id: true, full_name: true } },
      },
    });

    if (video || dto.video_url) {
      await this.prisma.videos.create({
        data: {
          group_id: groupId,
          lesson_id: lessonId,
          title: dto.title + " (Video)",
          video_url: video || dto.video_url,
          teacher_id:
            currentUser.role === UserRole.TEACHER ? currentUser.id : null,
          user_id:
            currentUser.role !== UserRole.TEACHER ? currentUser.id : null,
        },
      });
    }

    return { success: true, message: "Uyga vazifa yaratildi", data: hw };
  }

  // ─── FIND ALL BY GROUP (teacher/admin) ────────────────────────────────────
  async findAllByGroup(
    groupId: number,
    currentUser: { id: number; role: UserRole },
  ) {
    const group = await this.prisma.groups.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException("Guruh topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroup(currentUser.id, groupId);
    }

    const homeworks = await this.prisma.homeWork.findMany({
      where: { group_id: groupId },
      orderBy: { created_at: "desc" },
      include: {
        lessons: { select: { id: true, topic: true, date: true } },
        _count: { select: { homeWorkAnswers: true } },
        homeWorkAnswers: {
          select: {
            id: true,
            homeWorkResults: { select: { id: true, grade: true } },
          },
        },
      },
    });

    const totalStudents = await this.prisma.studentGroup.count({
      where: {
        group_id: groupId,
        status: Status.active,
        students: { status: "active" },
      },
    });

    const data = homeworks.map((hw) => {
      const submitted = hw._count.homeWorkAnswers;
      const graded = hw.homeWorkAnswers.filter(
        (a) => a.homeWorkResults.length > 0,
      ).length;
      const accepted = hw.homeWorkAnswers.filter(
        (a) => a.homeWorkResults.length > 0 && a.homeWorkResults[0].grade >= 60,
      ).length;
      const returned = hw.homeWorkAnswers.filter(
        (a) => a.homeWorkResults.length > 0 && a.homeWorkResults[0].grade < 60,
      ).length;
      const pending = submitted - graded;
      const notDone = totalStudents - submitted;

      return {
        ...hw,
        stats: {
          totalStudents,
          submitted,
          graded,
          accepted,
          returned,
          pending,
          notDone: notDone < 0 ? 0 : notDone,
        },
      };
    });

    return { success: true, data };
  }

  // ─── FIND ALL (admin uchun) ────────────────────────────────────────────────
  async findAll(currentUser: { id: number; role: UserRole }) {
    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.SUPERADMIN
    ) {
      throw new ForbiddenException("Sizga ruxsat yo'q");
    }

    const homeworks = await this.prisma.homeWork.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        file: true,
        created_at: true,
        lessons: { select: { id: true, topic: true, date: true } },
        groups: { select: { id: true, name: true } },
        teachers: { select: { id: true, full_name: true } },
      },
    });

    return { success: true, data: homeworks };
  }

  // ─── FIND ONE ─────────────────────────────────────────────────────────────
  async findOne(id: number, currentUser: { id: number; role: UserRole }) {
    const hw = await this.prisma.homeWork.findUnique({
      where: { id },
      include: {
        lessons: true,
        groups: true,
        teachers: true,
      },
    });

    if (!hw) throw new NotFoundException("Uyga vazifa topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroup(currentUser.id, hw.group_id);
    }

    return { success: true, data: hw };
  }

  // ─── GET HOMEWORK SUBMISSIONS (Kutilayotganlar, Qaytarilganlar, Qabul, Bajarmaganlar) ──
  async getHomeworkSubmissions(
    hwId: number,
    currentUser: { id: number; role: UserRole },
  ) {
    const hw = await this.prisma.homeWork.findUnique({
      where: { id: hwId },
      include: { groups: true, lessons: true },
    });
    if (!hw) throw new NotFoundException("Uyga vazifa topilmadi");

    // Teacher faqat o'z guruhini ko'radi
    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroup(currentUser.id, hw.group_id);
    }

    // Guruhning barcha active studentlari
    const studentGroups = await this.prisma.studentGroup.findMany({
      where: {
        group_id: hw.group_id,
        status: Status.active,
        students: { status: "active" },
      },
      include: {
        students: {
          select: { id: true, full_name: true, photo: true, phone: true },
        },
      },
    });

    // Barcha topshiriqlar
    const answers = await this.prisma.homeWorkAnswer.findMany({
      where: { homwork_id: hwId },
      include: {
        students: { select: { id: true, full_name: true, photo: true } },
        homeWorkResults: {
          select: { id: true, grade: true, title: true, created_at: true },
        },
      },
    });

    // Student ID → answer map
    const answerMap = new Map<number, (typeof answers)[0]>();
    answers.forEach((a) => answerMap.set(a.student_id, a));

    const kutilayotganlar: any[] = [];
    const qaytarilganlar: any[] = [];
    const qabulQilinganlar: any[] = [];
    const bajarmaganlar: any[] = [];

    for (const sg of studentGroups) {
      const answer = answerMap.get(sg.student_id);

      if (!answer) {
        // Topshirmagan
        bajarmaganlar.push({
          student: sg.students,
          answer: null,
          status: "not_done",
        });
      } else {
        const statusStr = answer.homeworkStatus.toLowerCase(); // pending, accepted, returned

        if (statusStr === "pending") {
          kutilayotganlar.push({
            student: sg.students,
            answer,
            status: "pending",
            submitted_at: answer.created_at,
          });
        } else if (statusStr === "accepted") {
          qabulQilinganlar.push({
            student: sg.students,
            answer,
            result: answer.homeWorkResults?.[0],
            status: "accepted",
            submitted_at: answer.created_at,
          });
        } else if (statusStr === "returned") {
          qaytarilganlar.push({
            student: sg.students,
            answer,
            result: answer.homeWorkResults?.[0],
            status: "returned",
            submitted_at: answer.created_at,
          });
        }
      }
    }

    return {
      success: true,
      data: {
        homework: {
          id: hw.id,
          title: hw.title,
          description: hw.description,
          file: hw.file,
          video_url: hw.video_url,
          created_at: hw.created_at,
          lesson: hw.lessons,
          group: hw.groups,
        },
        kutilayotganlar,
        qaytarilganlar,
        qabulQilinganlar,
        bajarmaganlar,
        stats: {
          total: studentGroups.length,
          pending: kutilayotganlar.length,
          returned: qaytarilganlar.length,
          accepted: qabulQilinganlar.length,
          notDone: bajarmaganlar.length,
        },
      },
    };
  }

  // ─── GET STUDENT SUBMISSION (bitta student uchun) ─────────────────────────
  async getStudentSubmission(
    hwId: number,
    studentId: number,
    currentUser: { id: number; role: UserRole },
  ) {
    const hw = await this.prisma.homeWork.findUnique({
      where: { id: hwId },
      include: { lessons: true, groups: true },
    });
    if (!hw) throw new NotFoundException("Uyga vazifa topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroup(currentUser.id, hw.group_id);
    }

    const student = await this.prisma.students.findUnique({
      where: { id: studentId },
      select: { id: true, full_name: true, photo: true, phone: true },
    });
    if (!student) throw new NotFoundException("Student topilmadi");

    const answer = await this.prisma.homeWorkAnswer.findFirst({
      where: { homwork_id: hwId, student_id: studentId },
      include: {
        homeWorkResults: {
          select: { id: true, grade: true, title: true, created_at: true },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    });

    // Parse files from answer title field (we store multiple filenames as JSON)
    let files: string[] = [];
    if (answer?.file) {
      try {
        files = JSON.parse(answer.file);
      } catch {
        files = [answer.file];
      }
    }

    const result = answer?.homeWorkResults?.[0];
    let status: string;
    if (!answer) {
      status = "not_done";
    } else {
      status = answer.homeworkStatus.toLowerCase();
    }

    return {
      success: true,
      data: {
        homework: {
          id: hw.id,
          title: hw.title,
          description: hw.description,
          created_at: hw.created_at,
          lesson: hw.lessons,
          group: hw.groups,
        },
        student,
        answer: answer
          ? {
              id: answer.id,
              comment: answer.title,
              files,
              raw_file: answer.file,
              created_at: answer.created_at,
            }
          : null,
        result: result || null,
        status,
      },
    };
  }

  // ─── GRADE SUBMISSION ─────────────────────────────────────────────────────
  async gradeSubmission(
    answerId: number,
    grade: number,
    comment: string,
    currentUser: { id: number; role: UserRole },
  ) {
    if (grade < 0 || grade > 100) {
      throw new BadRequestException("Ball 0 dan 100 gacha bo'lishi kerak");
    }

    const answer = await this.prisma.homeWorkAnswer.findUnique({
      where: { id: answerId },
      include: { homeWorks: { select: { group_id: true } } },
    });
    if (!answer) throw new NotFoundException("Topshiriq topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroup(currentUser.id, answer.homeWorks.group_id);
    }

    // Delete previous result if exists
    await this.prisma.homeWorkResult.deleteMany({
      where: { homework_answer_id: answerId },
    });

    const result = await this.prisma.homeWorkResult.create({
      data: {
        homework_answer_id: answerId,
        grade,
        title: comment || (grade >= 60 ? "Qabul qilindi" : "Qaytarildi"),
        techer_id:
          currentUser.role === UserRole.TEACHER ? currentUser.id : null,
        user_id: currentUser.role !== UserRole.TEACHER ? currentUser.id : null,
      },
    });

    const statusEnum = grade >= 60 ? "ACCEPTED" : "RETURNED";

    await this.prisma.homeWorkAnswer.update({
      where: { id: answerId },
      data: { homeworkStatus: statusEnum as any },
    });

    const status = grade >= 60 ? "accepted" : "returned";
    const message =
      grade >= 60
        ? `Vazifa qabul qilindi (${grade} ball)`
        : `Vazifa qaytarildi (${grade} ball)`;

    return { success: true, message, data: { result, status } };
  }

  // ─── STUDENT SUBMIT HOMEWORK ──────────────────────────────────────────────
  async submitHomework(
    hwId: number,
    studentId: number,
    comment: string,
    files: string[],
  ) {
    const hw = await this.prisma.homeWork.findUnique({ where: { id: hwId } });
    if (!hw) throw new NotFoundException("Uyga vazifa topilmadi");

    // Check student is in this group
    const sg = await this.prisma.studentGroup.findFirst({
      where: {
        student_id: studentId,
        group_id: hw.group_id,
        status: Status.active,
        students: { status: "active" },
      },
    });
    if (!sg) throw new ForbiddenException("Siz bu guruhga tegishli emassiz");

    // Check if already submitted
    const existing = await this.prisma.homeWorkAnswer.findFirst({
      where: { homwork_id: hwId, student_id: studentId },
    });

    if (files && files.length > 0) {
      for (const file of files) {
        await uploadToSupabase(file);
      }
    }

    const fileJson = JSON.stringify(files);

    if (existing) {
      // Update existing
      const updated = await this.prisma.homeWorkAnswer.update({
        where: { id: existing.id },
        data: {
          title: comment || "Uyga vazifa topshirildi",
          file: fileJson,
          homeworkStatus: "PENDING",
        },
      });
      return {
        success: true,
        message: "Uyga vazifa yangilandi",
        data: updated,
      };
    }

    const answer = await this.prisma.homeWorkAnswer.create({
      data: {
        student_id: studentId,
        homwork_id: hwId,
        title: comment || "Uyga vazifa topshirildi",
        file: fileJson,
        homeworkStatus: "PENDING",
      },
    });

    return { success: true, message: "Uyga vazifa topshirildi", data: answer };
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────
  async update(
    id: number,
    dto: UpdateHomeWorkDto,
    currentUser: { id: number; role: UserRole },
    file?: string,
    video?: string,
  ) {
    const hw = await this.prisma.homeWork.findUnique({ where: { id } });
    if (!hw) throw new NotFoundException("Uyga vazifa topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroup(currentUser.id, hw.group_id);
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    // Upload new files to Supabase if provided, and delete old ones
    if (file) {
      if (hw.file) {
        const oldPath = join(process.cwd(), "src", "uploads", hw.file);
        try {
          fs.unlinkSync(oldPath);
        } catch {}
        if (url && key) {
          try {
            const supabase = createClient(url, key);
            await supabase.storage.from("NajotEdu").remove([hw.file]);
          } catch {}
        }
      }
      await uploadToSupabase(file);
    }

    if (video) {
      if (hw.video_url) {
        if (hw.video_url.includes("supabase.co/storage")) {
          try {
            const parts = hw.video_url.split("/");
            const filename = parts[parts.length - 1];
            if (filename && url && key) {
              const supabase = createClient(url, key);
              await supabase.storage.from("NajotEdu").remove([filename]);
            }
          } catch {}
        } else if (!hw.video_url.startsWith("http")) {
          const oldPath = join(process.cwd(), "src", "uploads", hw.video_url);
          try {
            fs.unlinkSync(oldPath);
          } catch {}
        }
      }
      await uploadToSupabase(video);
    }

    const updated = await this.prisma.homeWork.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        lesson_id: dto.lesson_id ? Number(dto.lesson_id) : undefined,
        file: file !== undefined ? file : undefined,
        video_url: video !== undefined ? video : undefined,
      },
      include: {
        lessons: { select: { id: true, topic: true, date: true } },
        groups: { select: { id: true, name: true } },
      },
    });

    return { success: true, message: "Uyga vazifa yangilandi", data: updated };
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────
  async remove(id: number, currentUser: { id: number; role: UserRole }) {
    const hw = await this.prisma.homeWork.findUnique({
      where: { id },
      include: {
        homeWorkAnswers: {
          select: {
            id: true,
            file: true,
          },
        },
      },
    });
    if (!hw) throw new NotFoundException("Uyga vazifa topilmadi");

    if (currentUser.role === UserRole.TEACHER) {
      await this.checkTeacherGroup(currentUser.id, hw.group_id);
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    // 1. Delete associated files of homework answers from Supabase/disk
    for (const answer of hw.homeWorkAnswers) {
      if (answer.file) {
        try {
          const files = JSON.parse(answer.file);
          if (Array.isArray(files)) {
            for (const file of files) {
              const filePath = join(process.cwd(), "src", "uploads", file);
              try {
                fs.unlinkSync(filePath);
              } catch {}
              if (url && key) {
                try {
                  const supabase = createClient(url, key);
                  await supabase.storage.from("NajotEdu").remove([file]);
                } catch {}
              }
            }
          }
        } catch {}
      }
    }

    // 2. Delete all results for all answers of this homework
    const answerIds = hw.homeWorkAnswers.map((a) => a.id);
    if (answerIds.length > 0) {
      await this.prisma.homeWorkResult.deleteMany({
        where: {
          homework_answer_id: { in: answerIds },
        },
      });
      // 3. Delete all answers of this homework
      await this.prisma.homeWorkAnswer.deleteMany({
        where: {
          homwork_id: id,
        },
      });
    }

    // 4. Delete homework attachment file from Supabase/disk
    if (hw.file) {
      const filePath = join(process.cwd(), "src", "uploads", hw.file);
      try {
        fs.unlinkSync(filePath);
      } catch {}
      if (url && key) {
        try {
          const supabase = createClient(url, key);
          await supabase.storage.from("NajotEdu").remove([hw.file]);
        } catch {}
      }
    }

    // 5. Delete homework video file if any
    if (hw.video_url && hw.video_url.includes("supabase.co/storage")) {
      try {
        const parts = hw.video_url.split("/");
        const filename = parts[parts.length - 1];
        if (filename && url && key) {
          const supabase = createClient(url, key);
          await supabase.storage.from("NajotEdu").remove([filename]);
        }
      } catch {}
    } else if (hw.video_url && !hw.video_url.startsWith("http")) {
      const filePath = join(process.cwd(), "src", "uploads", hw.video_url);
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }

    // 6. Delete the homework itself
    await this.prisma.homeWork.delete({ where: { id } });
    return { success: true, message: "Uyga vazifa o'chirildi" };
  }
}
