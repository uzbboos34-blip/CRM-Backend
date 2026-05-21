import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/database/prisma.service";
import { Status, StudentStatus, GroupStatus } from "@prisma/client";

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

    // 1. Dars davomati (Attendance rate)
    const [totalAttendance, presentAttendance] = await Promise.all([
      this.prisma.attendance.count(),
      this.prisma.attendance.count({ where: { isPresent: true } }),
    ]);
    const attendanceRate =
      totalAttendance > 0
        ? Math.round((presentAttendance / totalAttendance) * 100)
        : 0;

    // 2. Vazifalar bajarilishi (Homework completion rate)
    const [totalHomeworkAnswers, acceptedHomeworkAnswers] = await Promise.all([
      this.prisma.homeWorkAnswer.count(),
      this.prisma.homeWorkAnswer.count({
        where: { homeworkStatus: "ACCEPTED" },
      }),
    ]);
    const homeworkCompletionRate =
      totalHomeworkAnswers > 0
        ? Math.round((acceptedHomeworkAnswers / totalHomeworkAnswers) * 100)
        : 0;

    // 3. Kurs to'liqlanishi (Course occupancy rate)
    const activeGroupsList = await this.prisma.groups.findMany({
      where: { status: GroupStatus.active },
      include: {
        _count: {
          select: { studentGroups: true },
        },
      },
    });
    let totalMaxStudents = 0;
    let totalEnrolled = 0;
    activeGroupsList.forEach((g) => {
      totalMaxStudents += g.max_students;
      totalEnrolled += g._count.studentGroups;
    });
    const courseOccupancyRate =
      totalMaxStudents > 0
        ? Math.round((totalEnrolled / totalMaxStudents) * 100)
        : 0;

    // 4. Faol o'quvchilar ulushi (Active students rate)
    const [totalStudentsCount, activeStudentsCount] = await Promise.all([
      this.prisma.students.count(),
      this.prisma.students.count({ where: { status: StudentStatus.active } }),
    ]);
    const activeStudentsRate =
      totalStudentsCount > 0
        ? Math.round((activeStudentsCount / totalStudentsCount) * 100)
        : 0;

    // 5. So'nggi faoliyat (Recent activity)
    const [latestStudents, latestLessons, latestHomeworks, latestGroups] =
      await Promise.all([
        this.prisma.students.findMany({
          take: 3,
          orderBy: { created_at: "desc" },
          select: { full_name: true, created_at: true },
        }),
        this.prisma.lesson.findMany({
          take: 3,
          orderBy: { created_at: "desc" },
          select: {
            topic: true,
            created_at: true,
            groups: { select: { name: true } },
          },
        }),
        this.prisma.homeWorkAnswer.findMany({
          take: 3,
          orderBy: { created_at: "desc" },
          select: {
            title: true,
            created_at: true,
            students: { select: { full_name: true } },
          },
        }),
        this.prisma.groups.findMany({
          take: 3,
          orderBy: { created_at: "desc" },
          select: { name: true, created_at: true },
        }),
      ]);

    const activities: { dot: string; text: string; date: Date }[] = [];

    latestStudents.forEach((s) => {
      activities.push({
        dot: "#10b981",
        text: `Yangi o'quvchi ro'yxatga qo'shildi: ${s.full_name}`,
        date: s.created_at,
      });
    });

    latestLessons.forEach((l) => {
      activities.push({
        dot: "#7b61ff",
        text: `"${l.groups?.name || "Guruh"}" guruhiga yangi dars qo'shildi: ${l.topic || "Dars"}`,
        date: l.created_at,
      });
    });

    latestHomeworks.forEach((hw) => {
      activities.push({
        dot: "#f59e0b",
        text: `${hw.students?.full_name || "O'quvchi"} uyga vazifa topshirdi: ${hw.title}`,
        date: hw.created_at,
      });
    });

    latestGroups.forEach((g) => {
      activities.push({
        dot: "#0ea5e9",
        text: `Yangi guruh yaratildi: ${g.name}`,
        date: g.created_at,
      });
    });

    activities.sort((a, b) => b.date.getTime() - a.date.getTime());
    const recentActivity = activities.slice(0, 5);

    return {
      success: true,
      data: {
        groups,
        courses,
        students,
        teachers,
        rooms,
        attendanceRate,
        homeworkCompletionRate,
        courseOccupancyRate,
        activeStudentsRate,
        recentActivity,
      },
    };
  }
}
