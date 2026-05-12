import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { PrismaService } from 'src/core/database/prisma.service';
import { GroupStatus, Status, StudentStatus } from '@prisma/client';
import { FindAllGroupsDto } from './dto/query.dto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) { }
  async create(payload: CreateGroupDto) {

    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes
    };

    const group = await this.prisma.groups.findFirst({
      where: {
        name: payload.name,
      },
    });

    if (group) {
      throw new ConflictException('Group already exists');
    }

    const existCourse = await this.prisma.courses.findFirst({
      where: {
        id: payload.course_id,
        status: Status.active
      },
    });

    if (!existCourse) {
      throw new NotFoundException('Active course not foundd');
    }

    const room = await this.prisma.rooms.findFirst({
      where: {
        id: payload.room_id,
        status: Status.active
      },
    });

    if (!room) {
      throw new NotFoundException('Active room not found');
    }

    const startNew = timeToMinutes(payload.start_time);
    const endNew = startNew + existCourse.duration_hours * 60;

    const roomGroups = await this.prisma.groups.findMany({
      where: {
        room_id: payload.room_id,
        OR: [
          { status: GroupStatus.active },
          { status: GroupStatus.planned }
        ]
      },
      select: {
        start_time: true,
        week_day: true,
        course: {
          select: {
            duration_hours: true
          }
        }
      },
    })

    const RoomTime = roomGroups.some(el => {
      const hasCommonDay = el.week_day.some(day => payload.week_day.includes(day));
      if (!hasCommonDay) return false;

      const start = timeToMinutes(el.start_time);
      const end = start + el.course.duration_hours * 60;
      return start < endNew && end > startNew
    })

    if (RoomTime) {
      throw new ConflictException('Room is already reserved');
    }

    let teacher_ids = Array()
    if (payload.teachers?.length) {
      teacher_ids = await this.prisma.teachers.findMany({
        where: { id: { in: payload.teachers }, status: Status.active },
        select: {
          id: true
        }
      })

      if (teacher_ids.length !== payload.teachers?.length) {
        throw new NotFoundException('Ba\'zi teacherlar topilmadi yoki active emas');
      }
    }

    let student_ids = Array()
    if (payload.students?.length) {
      student_ids = await this.prisma.students.findMany({
        where: {
          id: { in: payload.students },
          status: StudentStatus.active
        },
        select: {
          id: true
        }
      });
      if (student_ids.length !== payload.students.length) {
        throw new NotFoundException('Ba\'zi studentlar topilmadi yoki active emas');
      }
    }

    if (payload.week_day.length === 0) {
      throw new NotFoundException('Week days are required');
    }

    const { teachers, students, ...groupData } = payload;

    await this.prisma.groups.create({
      data: {
        ...groupData,
        start_date: new Date(payload.start_date),
        end_date: new Date(payload.end_date),
        teachersGroups: payload.teachers?.length ? {
          create: payload.teachers?.map((teacher) => ({
            teacher_id: teacher
          })),
        } : undefined,
        studentGroups: payload.students?.length ? {
          create: payload.students?.map((student) => ({
            student_id: student
          })),
        } : undefined,
      }
    });
    return {
      success: true,
      message: 'Group created successfully',
    };
  }

  async findAll(query: FindAllGroupsDto) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.name) {
      where.name = query.name;
    }

    if (query.description) {
      where.description = query.description;
    }

    if (query.start_date) {
      where.start_date = new Date(query.start_date); // ✅ FIX
    }

    if (query.week_day) {
      where.week_day = { has: query.week_day };
    }

    if (query.start_time) {
      where.start_time = query.start_time;
    }

    if (query.max_students) {
      where.max_students = Number(query.max_students); // ✅ FIX
    }

    const groups = await this.prisma.groups.findMany({
      where,
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
        week_day: true,
        start_time: true,
        max_students: true,
        status: true,

        teachersGroups: {
          select: {
            teacher: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
        },

        studentGroups: {
          select: {
            students: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
        },
        rooms: {
          select: {
            id: true,
            name: true
          }
        },
        course: {
          select: {
            id: true,
            name: true,
            duration_hours: true
          }
        }

      },
    });

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      start_date: group.start_date,
      end_date: group.end_date,
      week_day: group.week_day,
      start_time: group.start_time,
      max_students: group.max_students,
      status: group.status,
      teachers: group.teachersGroups?.map((g) => g.teacher) || [],
      students: group.studentGroups?.length || [],
      course: group.course.name,
      course_duration: group.course.duration_hours,
      rooms: group.rooms.name
    }));
  }

  async findOne(id: number) {
    const group = await this.prisma.groups.findUnique({
      where: { id },
      include: {
        rooms: true,
        course: true,
        teachersGroups: {
          include: {
            teacher: {
              select: {
                id: true,
                full_name: true,
                photo: true,
              }
            }
          }
        },
        studentGroups: {
          include: {
            students: true
          }
        }
      }
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const groupStudentsCount = await this.prisma.studentGroup.count({
      where: {
        group_id: id,
        status: Status.active
      }
    });

    const now = new Date();
    const studentsList = group.studentGroups || [];
    
    const totalAge = studentsList.reduce((sum, item) => {
      if (!item.students?.birth_date) return sum;
      const birthDate = new Date(item.students.birth_date);
      if (isNaN(birthDate.getTime())) return sum;

      let age = now.getFullYear() - birthDate.getFullYear();
      const monthDiff = now.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
        age--;
      }
      return sum + age;
    }, 0);

    const averageAge = studentsList.length > 0 ? totalAge / studentsList.length : 0;

    // Calculate lesson counts
    let totalLessonsCount = 0;
    let firstMonthLessonsCount = 0;
    
    if (group.start_date && group.week_day && group.course?.duration_month) {
      const dayMap = {
        'Dushanba': 1, 'Seshanba': 2, 'Chorshanba': 3, 'Payshanba': 4, 'Juma': 5, 'Shanba': 6, 'Yakshanba': 0,
        'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0,
        '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 0
      };
      const lessonDays = group.week_day.map(d => dayMap[d]).filter(d => d !== undefined);
      
      for (let m = 0; m < group.course.duration_month; m++) {
        const monthDate = new Date(group.start_date);
        monthDate.setMonth(monthDate.getMonth() + m);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let monthCount = 0;

        for (let i = 1; i <= daysInMonth; i++) {
          const date = new Date(year, month, i);
          if (m === 0 && date < group.start_date) continue;
          
          if (lessonDays.includes(date.getDay())) {
            monthCount++;
            totalLessonsCount++;
          }
        }
        if (m === 0) firstMonthLessonsCount = monthCount;
      }
    }

    const dataFormatter = {
      ...group,
      students_count: groupStudentsCount,
      teachers: group.teachersGroups.map(g => g.teacher),
      averageAge: averageAge,
      room_capacity: group.rooms?.capacity,
      room: group.rooms, // For frontend compat
      total_lessons: totalLessonsCount,
      month_lessons: firstMonthLessonsCount,
    };

    return {
      success: true,
      data: dataFormatter,
    };
  }

  async update(id: number, payload: UpdateGroupDto) {
    const existingGroup = await this.prisma.groups.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      throw new NotFoundException('Group not found');
    }

    if (payload.name) {
      const group = await this.prisma.groups.findFirst({
        where: {
          name: payload.name,
          NOT: { id },
        },
      });

      if (group) {
        throw new ConflictException('Group already exists');
      }
    }

    if (payload.teachers) {
      const teacher = await this.prisma.teachers.findMany({
        where: {
          id: { in: payload.teachers },
          status: GroupStatus.active
        },
      });

      if (teacher.length !== payload.teachers.length) {
        throw new NotFoundException('Ba\'zi teacherlar topilmadi yoki active emas');
      }
    }

    if (payload.course_id) {
      const course = await this.prisma.courses.findFirst({
        where: {
          id: payload.course_id,
          status: GroupStatus.active
        },
      });

      if (!course) {
        throw new NotFoundException('Active course not foundd');
      }
    }

    if (payload.room_id) {
      const room = await this.prisma.rooms.findFirst({
        where: {
          id: payload.room_id,
          status: GroupStatus.active,
        },
      });

      if (!room) {
        throw new NotFoundException('Active room not found');
      }
    }
    const { teachers, students, ...groupData } = payload;
    let data: any = { ...groupData };

    if (payload.start_date) {
      data.start_date = new Date(payload.start_date);
    }

    await this.prisma.groups.update({
      where: { id },
      data: data
    });

    if (teachers) {
      await this.prisma.teachersGroup.deleteMany({
        where: {
          group_id: id,
          teacher_id: {
            notIn: teachers,
          },
        },
      });

      for (const teacher_id of teachers) {
        await this.prisma.teachersGroup.upsert({
          where: { teacher_id_group_id: { teacher_id, group_id: id } },
          update: {},
          create: { teacher_id, group_id: id },
        });
      }
    }

    if (students) {
      await this.prisma.studentGroup.deleteMany({
        where: {
          group_id: id,
          student_id: {
            notIn: students,
          },
        },
      });

      for (const student_id of students) {
        await this.prisma.studentGroup.upsert({
          where: { student_id_group_id: { student_id, group_id: id } },
          update: {},
          create: { student_id, group_id: id },
        });
      }
    }

    return {
      success: true,
      message: 'Group updated successfully',
    };
  }

  async remove(id: number) {
    const group = await this.prisma.groups.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    await this.prisma.groups.update({
      where: { id },
      data: {
        status: GroupStatus.cancelled
      },
    });

    return {
      success: true,
      message: 'Group deleted successfully',
    };
  }

  async getSchedule(id: number) {
    const group = await this.prisma.groups.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            duration_month: true,
          }
        }
      }
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const { start_date, week_day } = group;
    const duration_month = group.course.duration_month;

    // Day names mapping
    const dayMap = {
      'sunday': 0, 'yakshanba': 0,
      'monday': 1, 'dushanba': 1,
      'tuesday': 2, 'seshanba': 2,
      'wednesday': 3, 'chorshanba': 3,
      'thursday': 4, 'payshanba': 4,
      'friday': 5, 'juma': 5,
      'saturday': 6, 'shanba': 6
    };

    // Convert week_day to numbers [0-6]
    const weekDays = week_day.map(d => {
      const lower = d.toLowerCase().trim();
      if (dayMap[lower] !== undefined) return dayMap[lower];
      const val = parseInt(d);
      return val === 7 ? 0 : val;
    });

    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
    ];
    const daysUz = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

    const result = [];
    let currentStartDate = new Date(start_date);

    for (let i = 1; i <= duration_month; i++) {
      const lessons = [];
      const monthEnd = new Date(currentStartDate);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      let tempDate = new Date(currentStartDate);
      while (tempDate < monthEnd) {
        const dayIdx = tempDate.getDay();
        if (weekDays.includes(dayIdx)) {
          lessons.push({
            date: tempDate.toISOString().split('T')[0],
            day_of_month: tempDate.getDate(),
            day_name: daysUz[dayIdx]
          });
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }

      result.push({
        learning_month: i,
        month_name: months[currentStartDate.getMonth()],
        year: currentStartDate.getFullYear(),
        lessons: lessons
      });

      currentStartDate = monthEnd;
    }

    return result;
  }
}
