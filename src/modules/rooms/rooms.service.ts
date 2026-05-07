import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from 'src/core/database/prisma.service';
import { Status } from '@prisma/client';
import { FindAllRoomsDto } from './dto/query.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}
  async create(payload: CreateRoomDto) {
    const room = await this.prisma.rooms.findFirst({
      where: {
        name: payload.name,
        status: Status.active,
      },
    });
    if (room) {
      throw new ConflictException('Room already exists');
    }

    await this.prisma.rooms.create({
      data: payload,
    });

    return {
      success: true,
      message: 'Room created successfully',
    };
  }

  async findAll(query: FindAllRoomsDto) {
    const where : any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.name) {
      where.name = query.name;
    }
    
    return await this.prisma.rooms.findMany({where});
  }

  findOne(id: number) {
    const room = this.prisma.rooms.findUnique({ where: { id } });

    if (!room) {
      throw new BadRequestException('Room not fount');
    }
    return {
      success: true,
      data: room,
    };
  }

  async update(id: number, payload: UpdateRoomDto) {
    const room = await this.prisma.rooms.findUnique({ where: { id } });

    if (!room) {
      throw new BadRequestException('Room not fount');
    }

    await this.prisma.rooms.update({
      where: { id },
      data: payload,
    });

    return {
      success: true,
      message: 'Room updated successfully',
    };
  }

  async remove(id: number) {
    const room = await this.prisma.rooms.findUnique({ where: { id } });

    if (!room) {
      throw new BadRequestException('Room not fount');
    }

    await this.prisma.rooms.update({
      where: { id },
      data: {
        status: Status.inactive
      }
    });

    return {
      success: true,
      message: 'Room deleted successfully',
    };
  }
}
