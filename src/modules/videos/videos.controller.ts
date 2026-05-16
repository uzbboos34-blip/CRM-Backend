import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, ParseIntPipe, UseInterceptors, UploadedFile } from '@nestjs/common';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { TokenGuard } from 'src/common/guards/token.guards';
import { RolesGuard } from 'src/common/guards/role.guards';
import { Roles } from 'src/common/decorators/roles';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@ApiTags('Videos')
@ApiBearerAuth()
@Controller('videos')
@UseGuards(TokenGuard, RolesGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: './src/uploads',
        filename: (req, file, cb) => {
          const ext = file.originalname.split('.').pop();
          const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
          cb(null, filename);
        },
      }),
    }),
  )
  create(
    @Body() dto: CreateVideoDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.videosService.create(dto, req.user, file?.filename);
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
