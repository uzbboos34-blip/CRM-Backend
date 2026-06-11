import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateTeacherDto } from "./dto/create-teacher.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";
import { PrismaService } from "src/core/database/prisma.service";
import * as bcrypt from "bcrypt";
import { join } from "path";
import fs from "fs";
import { EmailService } from "src/common/email/email.service";
import { Prisma, Status } from "@prisma/client";
import { uploadToSupabase } from "src/core/utils/supabase-upload";
import { createClient } from "@supabase/supabase-js";
import { SmsService } from "src/common/service/sms.service";
@Injectable()
export class TeachersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private smsService: SmsService,
  ) {}
  async create(payload: CreateTeacherDto, filename: string) {
    const existTeacher = await this.prisma.teachers.findFirst({
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

    if (existTeacher) {
      if (filename) {
        const filePath = join(process.cwd(), "src", "uploads", filename);
        await fs.unlinkSync(filePath);
      }
      throw new ConflictException("Teacher already exists");
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

    await this.prisma.teachers.create({
      data: {
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        password: passHash,
        photo: filename ?? null,
        teachersGroups: payload.groups?.length
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
      .catch((err) => console.error('Teacher email xatolik:', err.message));
    this.smsService.sendSMS(
      `Fixoo platformasidan ro'yxatdan o'tish uchun tasdiqlash kodi: Login:${cleanPhone}_Parol:${payload.password} Kodni hech kimga bermang!`,
      payload.phone,
    ).catch((err) => console.error('Teacher SMS xatolik:', err.message));

    return {
      success: true,
      message: "Teacher created successfully",
    };
  }

  async findAll(query) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = Status.active;
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

    const teachers = await this.prisma.teachers.findMany({
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
        status: true,
        created_at: true,
        teachersGroups: {
          select: {
            group: {
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
      data: teachers,
    };
  }

  async findOne(id: number) {
    const teacher = await this.prisma.teachers.findUnique({
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
        created_at: true,
        teachersGroups: {
          select: {
            group: {
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
      throw new NotFoundException("Teacher not found");
    }
    return {
      success: true,
      data: teacher,
    };
  }

  async findGroupStudents(req) {
    const { id, role } = req.user;

    if (role == "SUPERADMIN" || role == "ADMIN") {
      throw new NotFoundException("This is for teachers only");
    }

    const groups = await this.prisma.groups.findMany({
      where: {
        teachersGroups: {
          some: {
            teacher_id: id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        max_students: true,
        start_date: true,
        end_date: true,
        start_time: true,
        week_day: true,
        status: true,
        rooms: {
          select: {
            id: true,
            name: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            duration_hours: true,
          },
        },
        studentGroups: {
          where: {
            status: Status.active,
            students: {
              status: "active",
            },
          },
          select: {
            students: {
              select: {
                id: true,
                full_name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return groups.map((el) => ({
      id: el.id,
      name: el.name,
      status: el.status,
      max_students: el.max_students,
      start_date: el.start_date,
      end_date: el.end_date,
      start_time: el.start_time,
      week_day: el.week_day,
      course: el.course?.name || "—",
      course_duration: el.course?.duration_hours || 0,
      rooms: el.rooms?.name || "—",
      studentCount: el.studentGroups.length,
      students: el.studentGroups.map((el) => el.students),
    }));
  }

  async update(id: number, payload: UpdateTeacherDto, filename?: string) {
    const teacher = await this.prisma.teachers.findUnique({ where: { id } });

    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }
    let photo = teacher.photo;

    if (filename) {
      if (teacher.photo) {
        const filePath = join(process.cwd(), "src", "uploads", teacher.photo);
        try {
          fs.unlinkSync(filePath);
        } catch {}

        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;
        if (url && key) {
          try {
            const supabase = createClient(url, key);
            await supabase.storage.from("NajotEdu").remove([teacher.photo]);
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

    const { groups: _, password: __, ...teacherData } = payload;

    await this.prisma.teachers.update({
      where: { id },
      data: {
        ...teacherData,
        photo,
        password: passHash,
        teachersGroups: groupIds.length
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
    const isPhoneChanged = !!(payload.phone && normalizePhone(payload.phone) !== normalizePhone(teacher.phone));

    if (isPasswordChanged || isPhoneChanged) {
      const targetPhone = payload.phone || teacher.phone;
      const cleanPhone = targetPhone.replace(/\+/g, '').replace(/\s+/g, '');
      const passwordToSend = payload.password || 'eski';

      this.smsService.sendSMS(
        `Fixoo platformasidan ro'yxatdan o'tish uchun tasdiqlash kodi: Login:${cleanPhone}_Parol:${passwordToSend} Kodni hech kimga bermang!`,
        targetPhone,
      ).catch((err) => console.error('Teacher update SMS xatolik:', err.message));
    }

    return {
      success: true,
      message: "Teacher updated successfully",
    };
  }

  async remove(id: number) {
    const teacher = await this.prisma.teachers.findUnique({ where: { id } });
    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }
    if (teacher.photo) {
      const filePath = join(process.cwd(), "src", "uploads", teacher.photo);
      if (fs.existsSync(filePath)) {
        await fs.unlinkSync(filePath);
      }
    }

    await this.prisma.teachers.update({
      where: { id },
      data: {
        status: Status.inactive,
      },
    });
    return {
      success: true,
      message: "Teacher deleted successfully",
    };
  }
}
