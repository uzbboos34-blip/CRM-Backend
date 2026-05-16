import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class VideosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVideoDto, currentUser: { id: number; role: UserRole }, video_file?: string) {
    const groupId = Number(dto.group_id);
    const lessonId = dto.lesson_id ? Number(dto.lesson_id) : null;

    // 1. Check group access for teacher
    if (currentUser.role === UserRole.TEACHER) {
      const access = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: groupId },
      });
      if (!access) throw new ForbiddenException("Bu guruhga ruxsatingiz yo'q");
    }

    // 2. Create video
    const data = await this.prisma.videos.create({
      data: {
        title: dto.title,
        description: dto.description,
        video_url: video_file || dto.video_url,
        group_id: groupId,
        lesson_id: lessonId,
        teacher_id: currentUser.role === UserRole.TEACHER ? currentUser.id : null,
        user_id: currentUser.role !== UserRole.TEACHER ? currentUser.id : null,
      },
    });
    return { success: true, data };
  }

  async findAllByGroup(groupId: number, currentUser: { id: number; role: UserRole }) {
    // Check access
    if (currentUser.role === UserRole.TEACHER) {
      const access = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: groupId },
      });
      if (!access) throw new ForbiddenException("Bu guruhga ruxsatingiz yo'q");
    }

    const videos = await this.prisma.videos.findMany({
      where: { group_id: groupId },
      orderBy: { created_at: 'desc' },
      include: {
        lessons: { select: { id: true, topic: true } },
      },
    });

    return { success: true, data: videos };
  }

  async remove(id: number, currentUser: { id: number; role: UserRole }) {
    const video = await this.prisma.videos.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Video topilmadi');

    // Check ownership/permission
    if (currentUser.role === UserRole.TEACHER) {
      if (video.teacher_id !== currentUser.id) {
        throw new ForbiddenException("Siz bu videoni o'chira olmaysiz");
      }
    }

    await this.prisma.videos.delete({ where: { id } });
    return { success: true, message: "Video o'chirildi" };
  }
}
