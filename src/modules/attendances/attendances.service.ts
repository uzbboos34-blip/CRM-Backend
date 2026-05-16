import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UserRole } from '@prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService) { }

  async create(payload: CreateAttendanceDto, currentUser: { id: number, role: UserRole }) {
    const { group_id, date, topic, type, records } = payload;

    // 1. Guruh dars kunini tekshirish
    const group = await this.prisma.groups.findUnique({
      where: { id: group_id },
      select: {
        week_day: true,
        start_time: true,
        course: { select: { duration_hours: true } }
      }
    });

    if (!group) throw new BadRequestException('Guruh topilmadi');

    const weekMap: Record<string, string> = {
      '0': 'Sunday', '1': 'Monday', '2': 'Tuesday',
      '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday'
    };

    // Use the submitted date's weekday (not necessarily today)
    const lessonDateForCheck = new Date(date);
    const lessonDayName = weekMap[String(lessonDateForCheck.getUTCDay())];

    if (!group.week_day?.includes(lessonDayName)) {
      throw new BadRequestException(`Guruh dars jadvalida bu kun (${lessonDayName}) yo'q`);
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const isToday = date === todayStr;

    // 2. Vaqt tekshirish (faqat TEACHER uchun va faqat bugun uchun)
    if (currentUser.role === UserRole.TEACHER && isToday) {
      const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const start = toMin(group.start_time);
      const end = start + (group.course?.duration_hours ?? 2) * 60;
      const now = today.getHours() * 60 + today.getMinutes();
      if (!(start <= now && now <= end)) {
        throw new BadRequestException('Dars vaqtidan tashqarida davomat olib bo\'lmaydi');
      }
    }

    // 3. Shu kun uchun allaqachon lesson bor-yo'qligini tekshirish
    const lessonDate = new Date(date);
    const startOfDay = new Date(lessonDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(lessonDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingLesson = await this.prisma.lesson.findFirst({
      where: {
        group_id,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (existingLesson) {
      if (currentUser.role === UserRole.TEACHER) {
        throw new BadRequestException(`Bu kun (${date}) uchun davomat allaqachon olingan`);
      }
      
      // Admin yoki SuperAdmin bo'lsa update qilish
      await this.prisma.lesson.update({
        where: { id: existingLesson.id },
        data: {
          topic,
          type,
        }
      });

      // Eski davomatlarni o'chirib yuborish
      await this.prisma.attendance.deleteMany({
        where: {
          group_id,
          date: { gte: startOfDay, lte: endOfDay }
        }
      });
    } else {
      // 4. Lesson yaratish (mavzu saqlash uchun)
      await this.prisma.lesson.create({
        data: {
          group_id,
          topic,
          type,
          date: lessonDate,
          teacher_id: currentUser.role === UserRole.TEACHER ? currentUser.id : null,
          user_id: currentUser.role !== UserRole.TEACHER ? currentUser.id : null,
        }
      });
    }

    // 5. Barcha studentlarni Attendance'ga yozish (ham kelgan, ham kelmagan)
    if (records.length > 0) {
      await this.prisma.attendance.createMany({
        data: records.map(r => ({
          group_id,
          student_id: r.student_id,
          isPresent: r.present,
          date: lessonDate,
          teacher_id: currentUser.role === UserRole.TEACHER ? currentUser.id : null,
          user_id: currentUser.role !== UserRole.TEACHER ? currentUser.id : null,
        }))
      });
    }

    const presentCount = records.filter(r => r.present).length;
    return {
      success: true,
      message: existingLesson ? 'Davomat muvaffaqiyatli yangilandi' : 'Davomat muvaffaqiyatli saqlandi',
      present_count: presentCount,
      absent_count: records.length - presentCount,
    };
  }

  // GET: guruh va sana bo'yicha lesson + davomat
  async findByGroupAndDate(group_id: number, date: string) {
    const lessonDate = new Date(date);
    const startOfDay = new Date(lessonDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(lessonDate);
    endOfDay.setHours(23, 59, 59, 999);

    const lesson = await this.prisma.lesson.findFirst({
      where: {
        group_id,
        date: { gte: startOfDay, lte: endOfDay }
      },
      select: {
        id: true,
        topic: true,
        type: true,
        date: true,
        teachers: { select: { id: true, full_name: true } },
      }
    });

    const attendances = await this.prisma.attendance.findMany({
      where: {
        group_id,
        date: { gte: startOfDay, lte: endOfDay }
      },
      select: {
        id: true,
        student_id: true,
        isPresent: true,
        students: { select: { id: true, full_name: true, photo: true } }
      }
    });

    return {
      lesson: lesson || null,
      attendances,
    };
  }

  async findAll(currentUser: { id: number, role: UserRole }) {
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERADMIN) {
      return await this.prisma.attendance.findMany({
        select: {
          id: true,
          isPresent: true,
          date: true,
          created_at: true,
          groups: { select: { id: true, name: true } },
          teachers: { select: { id: true, full_name: true } },
          students: { select: { id: true, full_name: true } },
        }
      });
    }

    return await this.prisma.attendance.findMany({
      where: { teacher_id: currentUser.id },
      select: {
        id: true,
        isPresent: true,
        date: true,
        created_at: true,
        students: { select: { id: true, full_name: true } },
      }
    });
  }

  findOne(id: number) {
    return this.prisma.attendance.findUnique({ where: { id } });
  }

  update(id: number, updateAttendanceDto: UpdateAttendanceDto) {
    return `This action updates a #${id} attendance`;
  }

  remove(id: number) {
    return `This action removes a #${id} attendance`;
  }
}
