import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Put } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { TokenGuard } from 'src/common/guards/token.guards';
import { RolesGuard } from 'src/common/guards/role.guards';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles';
import { UserRole } from '@prisma/client';

@Controller('attendances')
@UseGuards(TokenGuard, RolesGuard)
@ApiBearerAuth()
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}
  
  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Post()
  create(@Body() payload: CreateAttendanceDto, @Req() req: Request) {
    return this.attendancesService.create(payload, req['user']);
  }
  
  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get()
  findAll(@Req() req: Request) {
    return this.attendancesService.findAll(req['user']);
  }
  
  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendancesService.findOne(+id);
  }
  
  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateAttendanceDto: UpdateAttendanceDto) {
    return this.attendancesService.update(+id, updateAttendanceDto);
  }
  
  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendancesService.remove(+id);
  }
}
