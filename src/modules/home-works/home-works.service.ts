import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateHomeWorkDto } from './dto/create-home-work.dto';
import { UpdateHomeWorkDto } from './dto/update-home-work.dto';
import { PrismaService } from 'src/core/database/prisma.service';
import { UserRole, Status } from '@prisma/client';

@Injectable()
export class HomeWorksService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE ────────────────────────────────────────────────────────────────
  async create(
    dto: CreateHomeWorkDto,
    currentUser: { id: number; role: UserRole },
    file?: string,
    video?: string,
  ) {
    const groupId = Number(dto.group_id);
    const lessonId = Number(dto.lesson_id);

    // 1. Guruh mavjudligini tekshirish
    const group = await this.prisma.groups.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new BadRequestException('Guruh topilmadi');

    // 2. Lesson mavjudligini va guruhga tegishliligini tekshirish
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, group_id: groupId },
    });
    if (!lesson)
      throw new BadRequestException(
        "Bu dars bu guruhga tegishli emas yoki topilmadi",
      );

    // 3. Teacher o'z guruhiga tegishli ekanini tekshirish
    if (currentUser.role === UserRole.TEACHER) {
      const teacherGroup = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: groupId },
      });
      if (!teacherGroup)
        throw new ForbiddenException("Bu sizning guruhingiz emas");
    }

    // 4. Create HomeWork
    const hw = await this.prisma.homeWork.create({
      data: {
        lesson_id: lessonId,
        group_id: groupId,
        title: dto.title,
        description: dto.description,
        file: file || dto.file,
        video_url: video || dto.video_url,
        teacher_id: currentUser.role === UserRole.TEACHER ? currentUser.id : null,
        user_id: currentUser.role !== UserRole.TEACHER ? currentUser.id : null,
      },
      include: {
        lessons: { select: { id: true, topic: true, date: true } },
        groups: { select: { id: true, name: true } },
        teachers: { select: { id: true, full_name: true } },
      },
    });

    // 5. If video uploaded, also add to Videos table
    if (video || dto.video_url) {
      await this.prisma.videos.create({
        data: {
          group_id: groupId,
          lesson_id: lessonId,
          title: dto.title + " (Video)",
          video_url: video || dto.video_url,
          teacher_id: currentUser.role === UserRole.TEACHER ? currentUser.id : null,
          user_id: currentUser.role !== UserRole.TEACHER ? currentUser.id : null,
        },
      });
    }

    return { success: true, message: "Uyga vazifa yaratildi", data: hw };
  }

  // ─── FIND ALL (guruhga tegishli) ───────────────────────────────────────────
  async findAllByGroup(
    groupId: number,
    currentUser: { id: number; role: UserRole },
  ) {
    // 1. Guruh mavjudligini tekshirish
    const group = await this.prisma.groups.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');

    // 2. Teacher faqat o'z guruhini ko'radi
    if (currentUser.role === UserRole.TEACHER) {
      const teacherGroup = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: groupId },
      });
      if (!teacherGroup)
        throw new ForbiddenException("Bu sizning guruhingiz emas");
    }

    // 3. Homeworks fetch with nested counts
    const homeworks = await this.prisma.homeWork.findMany({
      where: { group_id: groupId },
      orderBy: { created_at: 'desc' },
      include: {
        lessons: { select: { id: true, topic: true, date: true } },
        _count: { select: { homeWorkAnswers: true } },
        homeWorkAnswers: {
          select: {
            id: true,
            homeWorkResults: { select: { id: true } },
          },
        },
      },
    });

    // 4. Total students in group
    const totalStudents = await this.prisma.studentGroup.count({
      where: { group_id: groupId, status: Status.active },
    });

    // 5. Map stats
    const data = homeworks.map((hw) => {
      const submitted = hw._count.homeWorkAnswers;
      const graded = hw.homeWorkAnswers.reduce(
        (acc, curr) => acc + (curr.homeWorkResults.length > 0 ? 1 : 0),
        0,
      );

      return {
        ...hw,
        stats: {
          totalStudents,
          submitted,
          graded,
          pending: submitted - graded,
        },
      };
    });

    return { success: true, data };
  }

  // ─── FIND ALL (admin uchun — barcha) ───────────────────────────────────────
  async findAll(currentUser: { id: number; role: UserRole }) {
    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.SUPERADMIN
    ) {
      throw new ForbiddenException("Sizga ruxsat yo'q");
    }

    const homeworks = await this.prisma.homeWork.findMany({
      orderBy: { created_at: 'desc' },
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

  // ─── FIND ONE ──────────────────────────────────────────────────────────────
  async findOne(id: number, currentUser: { id: number; role: UserRole }) {
    const hw = await this.prisma.homeWork.findUnique({
      where: { id },
      include: {
        lessons: true,
        groups: true,
        teachers: true,
      },
    });

    if (!hw) throw new NotFoundException('Uyga vazifa topilmadi');

    // Teacher faqat o'z guruhidagi homework ni ko'radi
    if (currentUser.role === UserRole.TEACHER) {
      const teacherGroup = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: hw.group_id },
      });
      if (!teacherGroup)
        throw new ForbiddenException("Bu sizning guruhingizga tegishli emas");
    }

    return { success: true, data: hw };
  }

  // ─── UPDATE ────────────────────────────────────────────────────────────────
  async update(
    id: number,
    dto: UpdateHomeWorkDto,
    currentUser: { id: number; role: UserRole },
  ) {
    const hw = await this.prisma.homeWork.findUnique({ where: { id } });
    if (!hw) throw new NotFoundException('Uyga vazifa topilmadi');

    // Teacher faqat o'z guruhidagi homeworkni yangilaydi
    if (currentUser.role === UserRole.TEACHER) {
      const teacherGroup = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: hw.group_id },
      });
      if (!teacherGroup)
        throw new ForbiddenException("Bu sizning guruhingizga tegishli emas");
    }

    const updated = await this.prisma.homeWork.update({
      where: { id },
      data: { ...dto },
      include: {
        lessons: { select: { id: true, topic: true, date: true } },
        groups: { select: { id: true, name: true } },
      },
    });

    return { success: true, message: 'Uyga vazifa yangilandi', data: updated };
  }

  // ─── DELETE ────────────────────────────────────────────────────────────────
  async remove(id: number, currentUser: { id: number; role: UserRole }) {
    const hw = await this.prisma.homeWork.findUnique({ where: { id } });
    if (!hw) throw new NotFoundException('Uyga vazifa topilmadi');

    // Teacher faqat o'z guruhidagini o'chiradi
    if (currentUser.role === UserRole.TEACHER) {
      const teacherGroup = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: hw.group_id },
      });
      if (!teacherGroup)
        throw new ForbiddenException("Bu sizning guruhingizga tegishli emas");
    }

    await this.prisma.homeWork.delete({ where: { id } });
    return { success: true, message: "Uyga vazifa o'chirildi" };
  }
}
