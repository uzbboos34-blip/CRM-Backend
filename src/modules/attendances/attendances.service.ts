import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UserRole } from '@prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService) {}
  async create(payload: CreateAttendanceDto, currentUser:{id: number, role: UserRole}) {

    const week = {
      "1": "Monday",
      "2": "Tuesday",
      "3": "Wednesday",
      "4": "Thursday",
      "5": "Friday",
      "6": "Saturday",
      "7": "Sunday",
    }
    const lessonGroup = await this.prisma.lesson.findFirst({
      where: {
        id: payload.lesson_id,
      },
      select: {
        groups: {
          select:{
            start_time: true,
            start_date: true,
            week_day: true,
            course: {
              select: {
                duration_hours: true
              }
            }
          }
        }
      }
    })
    const week_day = lessonGroup?.groups.week_day
    const newDate = new Date()
    const day = newDate.getDay()
    if(!week_day?.includes(week[day])){
      throw new BadRequestException("Dars vaqti xali boshlanmadi")
    }
    
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes
    }

    const startMinute = timeToMinutes(lessonGroup!.groups.start_time)
    const endMinute = startMinute + lessonGroup!.groups.course.duration_hours * 60
    const nowMinute = newDate.getHours() * 60 + newDate.getMinutes()
    
    if (!(startMinute < nowMinute && endMinute > nowMinute) && currentUser.role == "TEACHER") {
      throw new BadRequestException("Darsdan tashqarida vaqtda davomat olib bolamaydi")
    }
    
    await this.prisma.attendance.create({
      data: {
        ...payload,
        teacher_id: currentUser.role == UserRole.TEACHER ? currentUser.id: null,
        user_id: currentUser.role != UserRole.TEACHER ? currentUser.id: null
      }
    })
    return {
      success: true,
      message: 'Attendance created successfully',
    }
  }

  async findAll(currentUser: {id: number, role: UserRole}) {
    if (currentUser.role == "ADMIN") {
      return await this.prisma.attendance.findMany({
        select:{
          id:true,
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
          lessons: {
            select: {
              id: true,
              topic: true,
              description: true,
              groups: {
                select: {
                  name: true,
                  course: {
                    select: {
                      name: true
                    }  
                  }
                }
              }
            }
          }
        }
      })
    } else {
      if (currentUser.role == "TEACHER") {
      return await this.prisma.attendance.findMany({
        where: {
          teacher_id: currentUser.id
        },
        select:{
          id:true,
          isPresent: true,
          created_at: true,
          updated_at: true,
          lessons: {
            select: {
              id: true,
              topic: true,
              description: true,
              groups: {
                select: {
                  name: true,
                  course: {
                    select: {
                      name: true
                    }  
                  }
                }
              }
            }
          }
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
