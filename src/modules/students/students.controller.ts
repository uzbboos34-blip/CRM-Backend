import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { TokenGuard } from 'src/common/guards/token.guards';
import { RolesGuard } from 'src/common/guards/role.guards';
import { Roles } from 'src/common/decorators/roles';
import { UserRole } from '@prisma/client';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FindAllStudentsDto } from './dto/query.dto';

@Controller('students')
@UseGuards(TokenGuard, RolesGuard)
@ApiBearerAuth()
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        full_name: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        photo: { type: 'string', format: 'binary' },
        birth_date: { type: 'string', example:"2006-02-07" },
        groups: { type: 'array', items: { type: 'number' }, example: [1, 2] },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './src/uploads',
        filename: (req, file, cb) => {
          const filename = Date.now() + '.' + file.originalname.split('.')[1];
          cb(null, filename);
        },
      }),
    }),
  )
  create(
    @Body() payload: CreateStudentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.studentsService.create(payload, file?.filename);
  }

  @ApiOperation({
    summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}`,
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get('all')
  findAll(@Query() query: FindAllStudentsDto) {
    return this.studentsService.findAll(query);
  }

  @ApiOperation({
    summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}`,
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Put(':id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        full_name: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './src/uploads',
        filename: (req, file, cb) => {
          const filename = Date.now() + '.' + file.originalname.split('.')[1];
          cb(null, filename);
        },
      }),
    }),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateStudentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.studentsService.update(id, payload, file?.filename);
  }

  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.remove(id);
  }
}
