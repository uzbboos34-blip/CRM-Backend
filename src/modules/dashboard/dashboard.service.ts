import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Status, StudentStatus, GroupStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [groups, courses, students, teachers, rooms] = await Promise.all([
      this.prisma.groups.count({ where: { status: GroupStatus.active } }),
      this.prisma.courses.count({ where: { status: Status.active } }),
      this.prisma.students.count({ where: { status: StudentStatus.active } }),
      this.prisma.teachers.count({ where: { status: Status.active } }),
      this.prisma.rooms.count({ where: { status: Status.active } }),
    ]);

    return {
      success: true,
      data: {
        groups,
        courses,
        students,
        teachers,
        rooms,
      }
    };
  }
}
