import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { StudentGroupService } from './student_group.service';
import { CreateStudentGroupDto } from './dto/create.dto';
import { TokenGuard } from 'src/common/guards/token.guards';
import { RolesGuard } from 'src/common/guards/role.guards';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles';
import { UserRole } from '@prisma/client';
import { UpdateStudentGroupDto } from './dto/update.dto';
import { FindAllGroupsDto } from '../dto/query.dto';
import { FindAllStudentGroupDto } from './dto/query.dto';

@Controller('student-group')
@UseGuards(TokenGuard, RolesGuard)
@ApiBearerAuth()
export class StudentGroupController {
    constructor(private readonly studentGroupService: StudentGroupService) {}
    
    @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
    @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
    @Post()
    create(@Body() payload: CreateStudentGroupDto ) {
        return this.studentGroupService.create(payload);
    }

    @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
    @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
    @Get()
    findAll(@Query() query: FindAllStudentGroupDto) {
        return this.studentGroupService.findAll(query);
    }

    @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
    @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
    @Get(":id")
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.studentGroupService.findOne(id);
    }

    @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
    @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
    @Put(":id")
    update(@Param('id', ParseIntPipe) id: number, @Body() payload: UpdateStudentGroupDto) {
        return this.studentGroupService.update(id, payload);
    }

    @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
    @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
    @Delete(":id")
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.studentGroupService.remove(id);
    }
}
