import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Put,
  Query,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { TokenGuard } from 'src/common/guards/token.guards';
import { RolesGuard } from 'src/common/guards/role.guards';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles';
import { UserRole } from '@prisma/client';
import { FindAllCoursesDto } from './dto/query.dto';

@Controller('courses')
@UseGuards(TokenGuard, RolesGuard)
@ApiBearerAuth()
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Post('courses')
  create(@Body() payload: CreateCourseDto) {
    return this.coursesService.create(payload);
  }

  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get('all')
  findAll(@Query() query: FindAllCoursesDto) {
    return this.coursesService.findAll(query);
  }

  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.findOne(id);
  }

  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)


  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, payload);
  }

  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Delete(':id') 
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.remove(id);
  }
}
