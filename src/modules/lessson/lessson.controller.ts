import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Put, Req } from '@nestjs/common';
import { LesssonService } from './lessson.service';
import { CreateLesssonDto } from './dto/create-lessson.dto';
import { UpdateLesssonDto } from './dto/update-lessson.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TokenGuard } from 'src/common/guards/token.guards';
import { RolesGuard } from 'src/common/guards/role.guards';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles';

@Controller('lessson')
@UseGuards(TokenGuard, RolesGuard)
@ApiBearerAuth()
export class LesssonController {
  constructor(private readonly lesssonService: LesssonService) {}
  
  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Post()
  create(@Body() payload: CreateLesssonDto,
  @Req() req: Request
) {
    return this.lesssonService.create(payload, req['user']);
  }
  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get()
  findAll(@Req() req: Request) {
    return this.lesssonService.findAll(req['user']);
  }
  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get(':id')
  findOne( @Param('id', ParseIntPipe) id: number, @Req() req: Request){
    return this.lesssonService.findOne(id, req['user']);
  }
  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER}`})
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number, @Body() payload: UpdateLesssonDto,
    @Req() req: Request
) {
    return this.lesssonService.update(id, payload, req['user']);
  }
  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number,
  @Req() req: Request
  ) {
    return this.lesssonService.remove(id, req['user']);
  }
}
