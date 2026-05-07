import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PrismaService } from 'src/core/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { join } from 'path';
import fs from 'fs';
import { EmailService } from 'src/common/email/email.service';
import { StudentStatus } from '@prisma/client';
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
        const filePath = join(process.cwd(), 'src', 'uploads', filename);
        await fs.unlinkSync(filePath);
      }
      throw new ConflictException('Student already exists');
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

    await this.prisma.students.create({
      data: {
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        password: passHash,
        photo: filename ?? null,
        birth_date: new Date(payload.birth_date),
        studentGroups:payload.groups?.length ? {
          create: payload.groups?.map((groupId) => ({
            group_id: groupId,
          }))
        } : undefined,
      },
    });
    
    await this.emailService.sendEmail(payload.email,payload.phone, payload.password);


    return {
      success: true,
      message: 'Student created successfully',
    };
  }

  async findAll(query) {
    const where : any = {};

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

    if (query.birth_date) {
      where.birth_date = query.birth_date;
    }

    const students = await this.prisma.students.findMany({
      where,
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
        studentGroups:{
          select:{
            groups:{
              select:{
                id:true,
                name:true
              }
            }
          }
        }
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
        studentGroups:{
          select:{
            groups:{
              select:{
                id:true,
                name:true
              }
            }
          }
        }
      },
    });
    if (!teacher) {
      throw new NotFoundException('Student not found');
    }
    return {
      success: true,
      data: teacher,
    };
  }

  async update(id: number, payload: UpdateStudentDto, filename?: string) {
    const student = await this.prisma.students.findUnique({ where: { id } });

    if (!student) {
      throw new NotFoundException('Student not found');
    }
    let photo = student.photo;

    if (filename) {
      if (student.photo) {
        const filePath = join(process.cwd(), 'src', 'uploads', student.photo);

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
    let birth_date;
    if (payload.birth_date) {
      birth_date = new Date(payload.birth_date);
    }
    await this.prisma.students.update({
      where: { id },
      data: {
        ...payload,
        photo,
        password: passHash,
        birth_date,
        studentGroups:payload.groups?.length ? {
          deleteMany: {},
          create: payload.groups?.map((groupId) => ({
            group_id: groupId,
          })),
        } : undefined,
      },
    });
    return {
      success: true,
      message: 'Student updated successfully',
    };
  }

  async remove(id: number) {
    const student = await this.prisma.students.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    const filePath = join(
      process.cwd(),
      'src',
      'uploads',
      student.photo as string,
    );
    await fs.unlinkSync(filePath);

    await this.prisma.students.update({
        where: { id } ,
        data: {
          status: StudentStatus.inactive
        }
      });

    return {
      success: true,
      message: 'Student deleted successfully',
    };
  }
}
