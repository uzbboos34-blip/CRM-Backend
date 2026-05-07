import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/core/database/prisma.service';
import { Status, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'src/common/email/email.service';
import { FindAllUsersDto } from './dto/query.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}
  async create(payload: CreateUserDto) {
    const admin = await this.prisma.user.findFirst({
      where: {
        OR: [
          {
            email: payload.email,
          },
          {
            phone: payload.phone,
          },
        ],
      },
    });

    if (admin) {
      throw new ConflictException('User already exists');
    }

    const hashPass = await bcrypt.hash(payload.password, 10);

    await this.prisma.user.create({
      data: {
        ...payload,
        role: UserRole.ADMIN,
        password: hashPass,
      },
    });

    await this.emailService.sendEmail(payload.email,payload.phone, payload.password);

    return {
      success: true,
      message: 'User created successfully',
    };
  }

  async findAll(query: FindAllUsersDto) {
  const where : any= {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.first_name) {
    where.first_name = query.first_name;
  }

  if (query.last_name) {
    where.last_name = query.last_name;
  }

  if (query.email) {
    where.email = query.email;
  }

  if (query.phone) {
    where.phone = query.phone;
  }

  if (query.address) {
    where.address = query.address;
  }
  

  return await this.prisma.user.findMany({
    where,
  });
}

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        address: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      success: true,
      data: user,
    };
  }

  async update(id: number, payload: UpdateUserDto) {
    const data: any = {
      ...payload,
      role: UserRole.ADMIN,
    };
    if (payload.password) {
      data.password = await bcrypt.hash(payload.password, 10);
    }
    await this.prisma.user.update({
      where: { id },
      data,
    });
    return {
      success: true,
      message: 'User updated successfully',
    };
  }

  async delete(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.user.update({
      where: { id },
      data: {
        status: Status.inactive
      }
    })  
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}
