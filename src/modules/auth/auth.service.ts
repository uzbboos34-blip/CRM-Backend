import { BadRequestException, Body, Injectable, Req } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/core/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}
  async loginUser(payload: CreateAuthDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        phone: payload.phone,
      },
    });
    if (!user) {
      throw new BadRequestException('User or password not found');
    }

    const res = await bcrypt.compare(payload.password, user.password);
    if (!res) {
      throw new BadRequestException('User or password not found');
    }

    return {
      success: true,
      token: this.jwtService.sign({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        photo: user.photo,
        status: user.status,
        role: user.role,
      }),
    };
  }

  async loginTeacher(payload: CreateAuthDto) {
    const teacher = await this.prisma.teachers.findFirst({
      where: {
        phone: payload.phone,
      },
    });
    if (!teacher) {
      throw new BadRequestException('Teacher or password not found');
    }

    const res = await bcrypt.compare(payload.password, teacher.password);
    if (!res) {
      throw new BadRequestException('Teacher or password not found');
    }

    return {
      success: true,
      token: this.jwtService.sign({
        id: teacher.id,
        full_name: teacher.full_name,
        email: teacher.email,
        phone: teacher.phone,
        address: teacher.address,
        photo: teacher.photo,
        status: teacher.status,
        role: UserRole.TEACHER,
      }),
    };
  }

  async loginStudent(payload: CreateAuthDto) {
    const student = await this.prisma.students.findFirst({
      where: {
        phone: payload.phone,
      },
    });
    if (!student) {
      throw new BadRequestException('Student or password not found');
    }

    const res = await bcrypt.compare(payload.password, student.password);
    if (!res) {
      throw new BadRequestException('Student or password not found');
    }

    return {
      success: true,
      token: this.jwtService.sign({
        id: student.id,
        full_name: student.full_name,
        email: student.email,
        phone: student.phone,
        address: student.address,
        photo: student.photo,
        status: student.status,
        role: UserRole.STUDENT,
      }),
    };
  }

  async me(@Req() req: any) {
    if (!req || !req.user) {
      throw new BadRequestException('User not found in request');
    }
    const {id, full_name, email, phone, address, photo, status, role} = req.user
    return {
      success: true,
      data: {
        id,
        full_name,
        email,
        phone,
        address,
        photo,
        status,
        role
      }    
    };
  }
}
