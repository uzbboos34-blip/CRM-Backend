import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { TokenGuard } from 'src/common/guards/token.guards';
import { RolesGuard } from 'src/common/guards/role.guards';
import { Roles } from 'src/common/decorators/roles';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Videos')
@ApiBearerAuth()
@Controller('videos')
@UseGuards(TokenGuard, RolesGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Post()
  create(@Body() dto: CreateVideoDto, @Req() req: any) {
    return this.videosService.create(dto, req.user);
  }

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get('group/:groupId')
  findAllByGroup(@Param('groupId', ParseIntPipe) groupId: number, @Req() req: any) {
    return this.videosService.findAllByGroup(groupId, req.user);
  }

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.videosService.remove(id, req.user);
  }
}
