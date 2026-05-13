import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UserRole } from '@prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService) { }
  async create(payload: any, currentUser: { id: number, role: UserRole }) {
    const { group_id, date, topic, description, records } = payload;

    // 1. Lesson yaratish yoki yangilash
    let lesson = await this.prisma.lesson.findFirst({
      where: { group_id, date }
    });

    if (lesson) {
      lesson = await this.prisma.lesson.update({
        where: { id: lesson.id },
        data: { 
          topic, 
          description,
          teacher_id: currentUser.role == UserRole.TEACHER ? currentUser.id : lesson.teacher_id,
          user_id: currentUser.role != UserRole.TEACHER ? currentUser.id : lesson.user_id,
        }
      });
    } else {
      lesson = await this.prisma.lesson.create({
        data: {
          group_id,
          date,
          topic,
          description,
          teacher_id: currentUser.role == UserRole.TEACHER ? currentUser.id : null,
          user_id: currentUser.role != UserRole.TEACHER ? currentUser.id : null,
        }
      });
    }

    // 2. Eski davomatlarni o'chirish (yangilash uchun)
    await this.prisma.attendance.deleteMany({
      where: { lesson_id: lesson.id }
    });

    // 3. Faqat qatnashgan studentlarni yozish (foydalanuvchi so'ragandek)
    const presentRecords = records
      .filter((r: any) => r.isPresent)
      .map((r: any) => ({
        lesson_id: lesson.id,
        student_id: r.student_id,
        isPresent: true,
        teacher_id: currentUser.role == UserRole.TEACHER ? currentUser.id : null,
        user_id: currentUser.role != UserRole.TEACHER ? currentUser.id : null,
      }));

    if (presentRecords.length > 0) {
      await this.prisma.attendance.createMany({
        data: presentRecords
      });
    }

    return {
      success: true,
      message: 'Davomat muvaffaqiyatli saqlandi',
      lesson_id: lesson.id
    };
  }

  async findByDate(group_id: number, date: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { group_id, date },
      include: {
        attendances: true
      }
    });
    return lesson;
  }

  async findAll(currentUser: { id: number, role: UserRole }) {
    if (currentUser.role == "ADMIN") {
      return await this.prisma.attendance.findMany({
        select: {
          id: true,
          isPresent: true,
          created_at: true,
          updated_at: true,
          teachers: {
            select: {
              id: true,
              full_name: true,
            }
          },
          users: {
            select: {
              id: true,
              full_name: true,
            }
          },
        }
      })
    } else {
      if (currentUser.role == "TEACHER") {
        return await this.prisma.attendance.findMany({
          where: {
            teacher_id: currentUser.id
          },
          select: {
            id: true,
            isPresent: true,
            created_at: true,
            updated_at: true,
          }
        })
      }
    }
  }

  findOne(id: number) {

  }

  update(id: number, updateAttendanceDto: UpdateAttendanceDto) {
    return `This action updates a #${id} attendance`;
  }

  remove(id: number) {
    return `This action removes a #${id} attendance`;
  }
}
