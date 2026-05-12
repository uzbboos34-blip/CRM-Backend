import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PrismaService } from 'src/core/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { join } from 'path';
import fs from 'fs';
import { EmailService } from 'src/common/email/email.service';
import { Prisma, Status } from '@prisma/client';
@Injectable()
export class TeachersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) { }
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
        const filePath = join(process.cwd(), 'src', 'uploads', filename);
        await fs.unlinkSync(filePath);
      }
      throw new ConflictException('Teacher already exists');
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
        throw new NotFoundException('Guruhlardan biri topilmadi');
      }
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
        teachersGroups: payload.groups?.length ? {
          create: payload.groups?.map((groupId) => ({
            group_id: groupId
          }))
        } : undefined,
      },
    });
    await this.emailService.sendEmail(payload.email, payload.phone, payload.password);

    return {
      success: true,
      message: 'Teacher created successfully',
    };
  }

  async findAll(query) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.full_name) {
      where.full_name = { contains: query.full_name, mode: 'insensitive' };
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
                name: true
              }
            }
          }
        }
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
                name: true
              }
            }
          }
        }
      },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    return {
      success: true,
      data: teacher,
    };
  }

  async findGroupStudents(req) {
    const { id, role } = req.user;

    if (role == "SUPERADMIN" || role == "ADMIN") {
      throw new NotFoundException('This is for teachers only');
    }

    const groups = await this.prisma.groups.findMany({
      where: {
        teachersGroups: {
          some: {
            teacher_id: id
          }
        }
      },
      select: {
        id: true,
        name: true,
        max_students: true,
        start_date: true,
        start_time: true,
        week_day: true,
        studentGroups: {
          select: {
            students: {
              select: {
                id: true,
                full_name: true,
                phone: true
              }
            }
          }
        }
      }
    })

    return groups.map(el => ({
      id: el.id,
      name: el.name,
      max_students: el.max_students,
      start_date: el.start_date,
      start_time: el.start_time,
      week_day: el.week_day,
      studentCount: el.studentGroups.length,
      students: el.studentGroups.map(el => el.students)
    }))
  }

  async update(id: number, payload: UpdateTeacherDto, filename?: string) {
    const teacher = await this.prisma.teachers.findUnique({ where: { id } });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    let photo = teacher.photo;

    if (filename) {
      if (teacher.photo) {
        const filePath = join(process.cwd(), 'src', 'uploads', teacher.photo);
        console.log();

        await fs.unlinkSync(filePath);
      }
      photo = filename;
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
        throw new NotFoundException('Guruhlardan biri topilmadi');
      }
    }


    let passHash;
    if (payload.password) {
      passHash = await bcrypt.hash(payload.password, 10);
    }

    await this.prisma.teachers.update({
      where: { id },
      data: {
        ...payload,
        photo,
        password: passHash,
        teachersGroups: payload.groups?.length ? {
          deleteMany: {},
          create: payload.groups?.map((groupId) => ({
            group_id: groupId,
          })),
        } : undefined,
      },
    });
    return {
      success: true,
      message: 'Teacher updated successfully',
    };
  }

  async remove(id: number) {
    const teacher = await this.prisma.teachers.findUnique({ where: { id } });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    const filePath = join(
      process.cwd(),
      'src',
      'uploads',
      teacher.photo as string,
    );
    await fs.unlinkSync(filePath);

    await this.prisma.teachers.update({
      where: { id },
      data: {
        status: Status.inactive
      }
    });
    return {
      success: true,
      message: 'Teacher deleted successfully',
    };
  }
}
