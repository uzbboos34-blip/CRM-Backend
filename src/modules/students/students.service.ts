import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { PrismaService } from "src/core/database/prisma.service";
import * as bcrypt from "bcrypt";
import { join } from "path";
import fs from "fs";
import { EmailService } from "src/common/email/email.service";
import { Status, StudentStatus } from "@prisma/client";
import { uploadToSupabase } from "src/core/utils/supabase-upload";
import { createClient } from "@supabase/supabase-js";
import { SmsService } from "src/common/service/sms.service";
@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private smsService: SmsService,
  ) {}
  async create(payload: CreateStudentDto, filename: string) {
    const existStudent = await this.prisma.students.findFirst({
      where: {
        OR: [
          {
            email: payload.email,
          },
          {
            phone: payload.phone,
          },
        ],
      },
    });

    if (existStudent) {
      if (filename) {
        const filePath = join(process.cwd(), "src", "uploads", filename);
        await fs.unlinkSync(filePath);
      }
      throw new ConflictException("Student already exists");
    }

    if (payload.groups?.length) {
      const groups = await this.prisma.groups.findMany({
        where: {
          id: {
            in: payload.groups,
          },
        },
        select: {
          id: true,
        },
      });

      if (groups.length !== payload.groups.length) {
        throw new NotFoundException("Guruhlardan biri topilmadi");
      }
    }

    if (filename) {
      await uploadToSupabase(filename);
    }

    const passHash = await bcrypt.hash(payload.password, 10);

    await this.prisma.students.create({
      data: {
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        password: passHash,
        photo: filename ?? null,
        birth_date: new Date(payload.birth_date),
        studentGroups: payload.groups?.length
          ? {
              create: payload.groups?.map((groupId) => ({
                group_id: groupId,
              })),
            }
          : undefined,
      },
    });

    // Email va SMS fire-and-forget (await yo'q, response tezda qaytadi)
    const cleanPhone = payload.phone.replace(/\+/g, '').replace(/\s+/g, '');
    this.emailService.sendEmail(payload.email, payload.phone, payload.password)
      .catch((err) => console.error('Student email xatolik:', err.message));
    this.smsService.sendSMS(
      `Fixoo platformasidan ro'yxatdan o'tish uchun tasdiqlash kodi: Login:${cleanPhone}_Parol:${payload.password} Kodni hech kimga bermang!`,
      payload.phone,
    ).catch((err) => console.error('Student SMS xatolik:', err.message));

    return {
      success: true,
      message: "Student created successfully",
    };
  }

  async findAll(query) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = StudentStatus.active;
    }

    if (query.full_name) {
      where.full_name = { contains: query.full_name, mode: "insensitive" };
    }

    if (query.email) {
      where.email = query.email;
    }

    if (query.phone) {
      where.phone = query.phone;
    }

    if (query.address) {
      where.address = query.address;
    }

    if (query.birth_date) {
      where.birth_date = query.birth_date;
    }

    const students = await this.prisma.students.findMany({
      where,
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        photo: true,
        address: true,
        birth_date: true,
        status: true,
        created_at: true,
        studentGroups: {
          select: {
            groups: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: students,
    };
  }

  async findOne(id: number) {
    const teacher = await this.prisma.students.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        photo: true,
        address: true,
        status: true,
        studentGroups: {
          select: {
            groups: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    if (!teacher) {
      throw new NotFoundException("Student not found");
    }
    return {
      success: true,
      data: teacher,
    };
  }

  async update(id: number, payload: UpdateStudentDto, filename?: string) {
    const student = await this.prisma.students.findUnique({ where: { id } });

    if (!student) {
      throw new NotFoundException("Student not found");
    }
    let photo = student.photo;

    if (filename) {
      if (student.photo) {
        const filePath = join(process.cwd(), "src", "uploads", student.photo);
        try {
          fs.unlinkSync(filePath);
        } catch {}

        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;
        if (url && key) {
          try {
            const supabase = createClient(url, key);
            await supabase.storage.from("NajotEdu").remove([student.photo]);
          } catch {}
        }
      }
      await uploadToSupabase(filename);
      photo = filename;
    }
    let groupIds: number[] = [];
    if (payload.groups) {
      groupIds = (
        Array.isArray(payload.groups) ? payload.groups : [payload.groups]
      )
        .map(Number)
        .filter(Boolean);
    }

    if (groupIds.length) {
      const groups = await this.prisma.groups.findMany({
        where: {
          id: {
            in: groupIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (groups.length !== groupIds.length) {
        throw new NotFoundException("Guruhlardan biri topilmadi");
      }
    }
    let passHash;
    if (payload.password) {
      passHash = await bcrypt.hash(payload.password, 10);
    }
    let birth_date;
    if (payload.birth_date) {
      birth_date = new Date(payload.birth_date);
    }

    const {
      groups: _,
      password: __,
      birth_date: ___,
      ...studentData
    } = payload;

    await this.prisma.students.update({
      where: { id },
      data: {
        ...studentData,
        photo,
        password: passHash,
        birth_date,
        studentGroups: groupIds.length
          ? {
              deleteMany: {},
              create: groupIds.map((groupId) => ({
                group_id: groupId,
              })),
            }
          : undefined,
      },
    });

    const isPasswordChanged = !!payload.password;
    const normalizePhone = (phone: string) => phone.replace(/\+/g, '').replace(/\s+/g, '');
    const isPhoneChanged = !!(payload.phone && normalizePhone(payload.phone) !== normalizePhone(student.phone));

    if (isPasswordChanged || isPhoneChanged) {
      const targetPhone = payload.phone || student.phone;
      const cleanPhone = targetPhone.replace(/\+/g, '').replace(/\s+/g, '');
      const passwordToSend = payload.password || 'eski';

      this.smsService.sendSMS(
        `Fixoo platformasidan ro'yxatdan o'tish uchun tasdiqlash kodi: Login:${cleanPhone}_Parol:${passwordToSend} Kodni hech kimga bermang!`,
        targetPhone,
      ).catch((err) => console.error('Student update SMS xatolik:', err.message));
    }

    return {
      success: true,
      message: "Student updated successfully",
    };
  }

  async remove(id: number) {
    const student = await this.prisma.students.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    if (student.photo) {
      const filePath = join(process.cwd(), "src", "uploads", student.photo);
      if (fs.existsSync(filePath)) {
        await fs.unlinkSync(filePath);
      }
    }

    await this.prisma.students.update({
      where: { id },
      data: {
        status: StudentStatus.inactive,
      },
    });

    return {
      success: true,
      message: "Student deleted successfully",
    };
  }

  async findMyGroups(studentId: number) {
    const studentGroups = await this.prisma.studentGroup.findMany({
      where: { student_id: studentId },
      select: {
        id: true,
        status: true,
        groups: {
          select: {
            id: true,
            name: true,
            description: true,
            start_date: true,
            week_day: true,
            start_time: true,
            status: true,
            course: { select: { id: true, name: true } },
            teachersGroups: {
              select: {
                teacher: { select: { id: true, full_name: true } },
              },
            },
          },
        },
      },
    });
    return { success: true, data: studentGroups };
  }

  // ✅ LESSON RO'YXATI — faqat kerakli minimal ma'lumot (StudentGroupLessons sahifasi uchun)
  async findMyGroupLessonsList(studentId: number, groupId: number) {
    // Guruhga a'zoligini tekshirish
    const membership = await this.prisma.studentGroup.findFirst({
      where: { student_id: studentId, group_id: groupId },
    });
    if (!membership) {
      throw new ForbiddenException('Siz bu guruhga tegishli emassiz');
    }

    const lessons = await this.prisma.lesson.findMany({
      where: { group_id: groupId, status: Status.active },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        topic: true,
        date: true,
        _count: { select: { videos: true } }, // faqat video soni
        homeWorks: {
          select: {
            id: true,
            created_at: true,
            homeWorkAnswers: {
              where: { student_id: studentId },
              select: {
                homeworkStatus: true, // faqat holat
              },
            },
          },
        },
      },
    });

    // Ma'lumotlarni soddalashtirish
    const data = lessons.map((lesson) => {
      const hw = lesson.homeWorks[0] ?? null;
      const answer = hw?.homeWorkAnswers[0] ?? null;

      let hwStatus: string = 'NONE'; // Uy vazifasi berilmagan
      if (hw) {
        hwStatus = answer ? answer.homeworkStatus : 'NOT_DONE';
      }

      return {
        id: lesson.id,
        topic: lesson.topic,
        date: lesson.date,
        videoCount: lesson._count.videos,
        homeworkId: hw?.id ?? null,
        homeworkStatus: hwStatus,
        homeworkCreatedAt: hw?.created_at ?? null,
      };
    });

    return { success: true, data };
  }

  // ✅ BITTA DARS DETAIL — faqat bosilgan darsning to'liq ma'lumoti
  async findMyGroupLessonDetail(studentId: number, groupId: number, lessonId: number) {
    // Guruhga a'zoligini tekshirish
    const membership = await this.prisma.studentGroup.findFirst({
      where: { student_id: studentId, group_id: groupId },
    });
    if (!membership) {
      throw new ForbiddenException('Siz bu guruhga tegishli emassiz');
    }

    // Faqat bitta darsni olish
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, group_id: groupId, status: Status.active },
      select: {
        id: true,
        topic: true,
        description: true,
        date: true,
        _count: { select: { videos: true } },
        videos: {
          select: {
            id: true,
            title: true,
            video_url: true,
            created_at: true,
          },
          orderBy: { created_at: 'asc' },
        },
        homeWorks: {
          select: {
            id: true,
            title: true,
            description: true,
            file: true,
            created_at: true,
            homeWorkAnswers: {
              where: { student_id: studentId },
              select: {
                id: true,
                title: true,
                file: true,
                homeworkStatus: true,
                allow_resubmit: true,
                created_at: true,
                updated_at: true,
                homeWorkResults: {
                  select: {
                    id: true,
                    grade: true,
                    title: true,
                    created_at: true,
                    teachers: { select: { full_name: true } },
                    users: { select: { full_name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Dars topilmadi');
    }

    // Video fayllarni homework file'dan filter qilish
    const VIDEO_EXTS = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'm4v'];
    const isVideoFile = (f: string) => {
      const ext = f.split('.').pop()?.toLowerCase().split('?')[0] || '';
      return VIDEO_EXTS.includes(ext);
    };

    const cleanedHomeWorks = lesson.homeWorks.map((hw) => {
      let cleanedFile: string | null = hw.file;
      if (hw.file) {
        if (hw.file.trim().startsWith('[')) {
          try {
            const files: string[] = JSON.parse(hw.file);
            const filtered = files.filter((f) => !isVideoFile(f));
            cleanedFile = filtered.length > 0 ? JSON.stringify(filtered) : null;
          } catch {
            cleanedFile = isVideoFile(hw.file) ? null : hw.file;
          }
        } else {
          cleanedFile = isVideoFile(hw.file) ? null : hw.file;
        }
      }
      return {
        id: hw.id,
        title: hw.title,
        description: hw.description,
        file: cleanedFile,
        created_at: hw.created_at,
        homeWorkAnswers: hw.homeWorkAnswers,
      };
    });

    return {
      success: true,
      data: { ...lesson, homeWorks: cleanedHomeWorks },
    };
  }

  async getMyProfile(id: number) {
    const student = await this.prisma.students.findUnique({
      where: { id },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        photo: true,
        address: true,
        status: true,
        birth_date: true,
        studentGroups: {
          select: {
            groups: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    return {
      success: true,
      data: student,
    };
  }

  async updateMyProfile(id: number, payload: any, filename?: string) {
    const student = await this.prisma.students.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    let photo = student.photo;

    if (filename) {
      if (student.photo) {
        const filePath = join(process.cwd(), "src", "uploads", student.photo);
        try {
          fs.unlinkSync(filePath);
        } catch {}

        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;
        if (url && key) {
          try {
            const supabase = createClient(url, key);
            await supabase.storage.from("NajotEdu").remove([student.photo]);
          } catch {}
        }
      }
      await uploadToSupabase(filename);
      photo = filename;
    }

    let passHash;
    if (payload.password) {
      passHash = await bcrypt.hash(payload.password, 10);
    }
    let birth_date;
    if (payload.birth_date) {
      birth_date = new Date(payload.birth_date);
    }

    const updateData: any = {};
    if (payload.full_name) updateData.full_name = payload.full_name;
    if (payload.email) updateData.email = payload.email;
    if (payload.phone) updateData.phone = payload.phone;
    if (payload.address) updateData.address = payload.address;
    if (birth_date) updateData.birth_date = birth_date;
    if (passHash) updateData.password = passHash;
    if (photo) updateData.photo = photo;

    await this.prisma.students.update({
      where: { id },
      data: updateData,
    });

    const isPasswordChanged = !!payload.password;
    const normalizePhone = (phone: string) => phone.replace(/\+/g, '').replace(/\s+/g, '');
    const isPhoneChanged = !!(payload.phone && normalizePhone(payload.phone) !== normalizePhone(student.phone));

    if (isPasswordChanged || isPhoneChanged) {
      const targetPhone = payload.phone || student.phone;
      const cleanPhone = targetPhone.replace(/\+/g, '').replace(/\s+/g, '');
      const passwordToSend = payload.password || 'eski';

      this.smsService.sendSMS(
        `Fixoo platformasidan ro'yxatdan o'tish uchun tasdiqlash kodi: Login:${cleanPhone}_Parol:${passwordToSend} Kodni hech kimga bermang!`,
        targetPhone,
      ).catch((err) => console.error('Student update SMS xatolik:', err.message));
    }

    return {
      success: true,
      message: "Profile updated successfully",
    };
  }
}
