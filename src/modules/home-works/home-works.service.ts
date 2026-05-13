import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateHomeWorkDto } from './dto/create-home-work.dto';
import { UpdateHomeWorkDto } from './dto/update-home-work.dto';
import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class HomeWorksService {
  constructor(private prisma: PrismaService) {}

  // async create(createHomeWorkDto: CreateHomeWorkDto, currentUser: { id: number; role: string }) {
  //   const homework = await this.prisma.homeWork.create({
  //     data: {
  //       lesson_id: createHomeWorkDto.lesson_id,
  //       group_id: createHomeWorkDto.group_id,
  //       title: createHomeWorkDto.title,
  //       description: createHomeWorkDto.description,
  //       file: createHomeWorkDto.file,
  //       teacher_id: currentUser.role === 'TEACHER' ? currentUser.id : null,
  //       user_id: currentUser.role !== 'TEACHER' ? currentUser.id : null,
  //     },
  //   });
  //   return { success: true, message: 'HomeWork created successfully', data: homework };
  // }

  async findAll() {
    return this.prisma.homeWork.findMany({
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
  }

  async findOne(id: number) {
    const hw = await this.prisma.homeWork.findUnique({
      where: { id },
      include: { lessons: true, groups: true, teachers: true },
    });
    if (!hw) throw new NotFoundException('HomeWork topilmadi');
    return hw;
  }

  async update(id: number, updateHomeWorkDto: UpdateHomeWorkDto) {
    return this.prisma.homeWork.update({
      where: { id },
      data: { ...updateHomeWorkDto },
    });
  }

  async remove(id: number) {
    await this.prisma.homeWork.delete({ where: { id } });
    return { success: true, message: 'HomeWork deleted successfully' };
  }
}
