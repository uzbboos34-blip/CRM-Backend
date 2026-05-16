import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { HomeWorksService } from './home-works.service';
import { CreateHomeWorkDto } from './dto/create-home-work.dto';
import { UpdateHomeWorkDto } from './dto/update-home-work.dto';
import { TokenGuard } from 'src/common/guards/token.guards';
import { RolesGuard } from 'src/common/guards/role.guards';
import { Roles } from 'src/common/decorators/roles';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Ruxsatlar:
 *   POST   /home-works            → SUPERADMIN, ADMIN, TEACHER
 *   GET    /home-works            → SUPERADMIN, ADMIN
 *   GET    /home-works/group/:id  → SUPERADMIN, ADMIN, TEACHER
 *   GET    /home-works/:id        → SUPERADMIN, ADMIN, TEACHER
 *   PUT    /home-works/:id        → SUPERADMIN, ADMIN, TEACHER
 *   DELETE /home-works/:id        → SUPERADMIN, ADMIN, TEACHER
 *
 * Teacher faqat o'zi tegishli bo'lgan guruhning
 * vazifalarini ko'rishi / yaratishi / o'zgartirishi / o'chirishi mumkin.
 * Admin va Superadmin barcha guruhlarni ko'radi.
 */
@ApiTags('HomeWorks')
@ApiBearerAuth()
@UseGuards(TokenGuard, RolesGuard)
@Controller('home-works')
export class HomeWorksController {
  constructor(private readonly homeWorksService: HomeWorksService) {}

  // ─── Yangi uyga vazifa yaratish ─────────────────────────────────────────
  @ApiOperation({
    summary: 'Yangi uyga vazifa yaratish (ADMIN, SUPERADMIN, TEACHER)',
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Post()
  create(@Body() dto: CreateHomeWorkDto, @Req() req: Request) {
    return this.homeWorksService.create(dto, req['user']);
  }

  // ─── Barcha uyga vazifalar (faqat admin) ─────────────────────────────────
  @ApiOperation({ summary: 'Barcha uyga vazifalar (SUPERADMIN, ADMIN)' })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get()
  findAll(@Req() req: Request) {
    return this.homeWorksService.findAll(req['user']);
  }

  // ─── Guruhga tegishli uyga vazifalar ─────────────────────────────────────
  @ApiOperation({
    summary: 'Guruhga tegishli uyga vazifalar (ADMIN, SUPERADMIN, TEACHER)',
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get('group/:groupId')
  findAllByGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Req() req: Request,
  ) {
    return this.homeWorksService.findAllByGroup(groupId, req['user']);
  }

  // ─── Bitta uyga vazifa ───────────────────────────────────────────────────
  @ApiOperation({
    summary: 'Bitta uyga vazifa (ADMIN, SUPERADMIN, TEACHER)',
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.homeWorksService.findOne(id, req['user']);
  }

  // ─── Yangilash ──────────────────────────────────────────────────────────
  @ApiOperation({
    summary: 'Uyga vazifani yangilash (ADMIN, SUPERADMIN, TEACHER)',
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHomeWorkDto,
    @Req() req: Request,
  ) {
    return this.homeWorksService.update(id, dto, req['user']);
  }

  // ─── O'chirish ──────────────────────────────────────────────────────────
  @ApiOperation({
    summary: "Uyga vazifani o'chirish (ADMIN, SUPERADMIN, TEACHER)",
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.homeWorksService.remove(id, req['user']);
  }
}
