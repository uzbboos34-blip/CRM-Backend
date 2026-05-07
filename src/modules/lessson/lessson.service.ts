import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateLesssonDto } from './dto/create-lessson.dto';
import { UpdateLesssonDto } from './dto/update-lessson.dto';
import { PrismaService } from 'src/core/database/prisma.service';
import { Status, UserRole } from '@prisma/client';

@Injectable()
export class LesssonService {
  constructor(private prisma : PrismaService) {}
  async create(payload: CreateLesssonDto, currentUser : {id: number, role: UserRole}) {
    const exsitGroup = await this.prisma.groups.findUnique({
      where: {
        id: payload.group_id,
        status: Status.active
      },  
    })

    if (!exsitGroup) {
      throw new BadRequestException('Group not fount');
    }

    if (currentUser.role == "TEACHER") {
      const teacherGroup = await this.prisma.teachersGroup.findFirst({
        where: {
          group_id: payload.group_id,
          teacher_id: currentUser.id,
        }
      });
      if (!teacherGroup) {
        throw new BadRequestException('Bu sizning guruhigiz emas');
      }
    }

    await this.prisma.lesson.create({
      data: {
        ...payload,
        teacher_id: currentUser.role == UserRole.TEACHER ? currentUser.id: null,
        user_id: currentUser.role != UserRole.TEACHER ? currentUser.id: null
      }
    });
    return {
      success: true,
      message: 'Lessson created successfully',
    }
  }

  async findAll(currentUser: { id: number; role: UserRole }) {

  if (currentUser.role == UserRole.ADMIN) {
    return await this.prisma.lesson.findMany({
      select:{
        id: true,
        topic: true,
        description: true,
        teachers: {
          select: {
            full_name: true,
          }
        },
        users: {
          select: {
            full_name: true,
          }
        }
        
      }
    });
  }

  if (currentUser.role == UserRole.TEACHER) {
    return await this.prisma.lesson.findMany({
      where: {
      teacher_id: currentUser.id,
      },
    });
  }

  throw new ForbiddenException(' ');
}

  async findOne(id, currentUser: { id: number; role: UserRole }) {

  const lesson = await this.prisma.lesson.findUnique({
    where: { id },

  });
  

  if (!lesson) {
    throw new NotFoundException('Lesson not found');
  }

  if (currentUser.role == UserRole.ADMIN) {
    return lesson;
  }
  if (
    currentUser.role == UserRole.TEACHER &&
    lesson.teacher_id == currentUser.id
  ) {
    return lesson;
  }


  throw new ForbiddenException('You are not allowed to view this lesson');
}

  async update(id, payload: UpdateLesssonDto, currentUser : {id: number, role: UserRole}) {

    const exsitGroup = await this.prisma.groups.findUnique({
      where: {
        id: payload.group_id,
        status: Status.active
      },  
    })

    if (!exsitGroup) {
      throw new BadRequestException('Group not fount');
    }

    if (currentUser.role == "TEACHER") {
      const teacherGroup = await this.prisma.teachersGroup.findFirst({
        where: {
          group_id: payload.group_id,
          teacher_id: currentUser.id,
        }
      });
      if (!teacherGroup) {
        throw new BadRequestException('Bu sizning guruhigiz emas');
      }
    }


    await this.prisma.lesson.update({
      where: {
        id
      },
      data: {
        ...payload,
        teacher_id: currentUser.role == UserRole.TEACHER ? currentUser.id: null,
        user_id: currentUser.role != UserRole.TEACHER ? currentUser.id: null
      }
    })
    return {
      success: true,
      message: 'Lessson updated successfully',
      
    }
  }

  async remove(id, currentUser : {id: number, role: UserRole}) {
    const lesson = await this.prisma.lesson.findUnique({
    where: { id },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (currentUser.role == UserRole.ADMIN) {
      await this.prisma.lesson.update({
          where: { id },
          data: {
            status: Status.inactive
          } 
        });
        return {
          success: true,
          message: 'Lesson deleted successfully',
        }

    }

    if (
      currentUser.role == UserRole.TEACHER &&
      lesson.teacher_id == currentUser.id
    ) {
      await this.prisma.lesson.update({
        where: {
          id
        },
        data: {
          status: Status.inactive
        } 
      })
      return {
        success: true,
        message: 'Lesson deleted successfully',
      }
    }

    throw new ForbiddenException('You cannot delete this lesson');
  }
}
