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
@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
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

    this.emailService.sendEmail(payload.email, payload.phone, payload.password);

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

  async findMyGroupLessons(studentId: number, groupId: number) {
    // Student shu guruhga tegishliligini tekshirish
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
        },
        homeWorks: {
          select: {
            id: true,
            title: true,
            description: true,
            file: true,
            video_url: true,
            created_at: true,
            homeWorkAnswers: {
              where: { student_id: studentId },
              select: {
                id: true,
                title: true,
                file: true,
                homeworkStatus: true,
                created_at: true,
                updated_at: true,
                homeWorkResults: {
                  select: {
                    id: true,
                    grade: true,
                    title: true,
                    created_at: true,
                    teachers: {
                      select: {
                        full_name: true,
                      }
                    },
                    users: {
                      select: {
                        full_name: true,
                      }
                    }
                  },
                },
              },
            },
          },
        },
      },
    });

    return { success: true, data: lessons };
  }
}
