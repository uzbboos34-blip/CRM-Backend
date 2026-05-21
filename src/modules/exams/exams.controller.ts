import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { ExamsService } from "./exams.service";
import { CreateExamDto } from "./dto/create-exam.dto";
import { TokenGuard } from "src/common/guards/token.guards";
import { RolesGuard } from "src/common/guards/role.guards";
import { Roles } from "src/common/decorators/roles";
import { UserRole } from "@prisma/client";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiProperty,
  ApiConsumes,
} from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min, Max } from "class-validator";
import { Type } from "class-transformer";

class GradeExamDto {
  @ApiProperty({ description: "Ball (0-100)" })
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  score: number;

  @ApiProperty({ required: false, description: "Izoh" })
  @IsOptional()
  @IsString()
  feedback?: string;
}

@ApiTags("Exams")
@ApiBearerAuth()
@UseGuards(TokenGuard, RolesGuard)
@Controller("exams")
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @ApiOperation({ summary: "Yangi imtihon yaratish (ADMIN, TEACHER)" })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./src/uploads",
        filename: (req, file, cb) => {
          const ext = file.originalname.split(".").pop();
          const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
          cb(null, filename);
        },
      }),
    }),
  )
  create(
    @Body() dto: CreateExamDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.examsService.create(dto, req["user"], file?.filename);
  }

  @ApiOperation({
    summary: "Guruhga tegishli imtihonlar (TEACHER, ADMIN, STUDENT)",
  })
  @Roles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @Get("group/:groupId")
  findAllByGroup(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Req() req: Request,
  ) {
    return this.examsService.findAllByGroup(groupId, req["user"]);
  }

  @ApiOperation({ summary: "Imtihon topshiriqlarini ko'rish (TEACHER, ADMIN)" })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get(":examId/submissions")
  getSubmissions(
    @Param("examId", ParseIntPipe) examId: number,
    @Req() req: Request,
  ) {
    return this.examsService.getExamSubmissions(examId, req["user"]);
  }

  @ApiOperation({ summary: "Imtihonni baholash (TEACHER, ADMIN)" })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Post("submissions/:answerId/grade")
  gradeSubmission(
    @Param("answerId") answerId: string,
    @Body() dto: GradeExamDto,
    @Req() req: Request,
  ) {
    return this.examsService.gradeSubmission(
      answerId,
      dto.score,
      dto.feedback,
      req["user"],
    );
  }

  @ApiOperation({
    summary: "Imtihon natijalarini e'lon qilish (TEACHER, ADMIN)",
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Post(":examId/publish")
  publishExam(
    @Param("examId", ParseIntPipe) examId: number,
    @Req() req: Request,
  ) {
    return this.examsService.publishExam(examId, req["user"]);
  }

  @ApiOperation({ summary: "Imtihonni tahrirlash (TEACHER, ADMIN)" })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Put(":examId")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + "-" + file.originalname);
        },
      }),
    }),
  )
  updateExam(
    @Param("examId", ParseIntPipe) examId: number,
    @Body() dto: any,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.examsService.updateExam(
      examId,
      {
        title: dto.title,
        description: dto.description,
        start_date: dto.start_date,
        end_date: dto.end_date,
        file: file?.filename,
      },
      req["user"],
    );
  }

  @ApiOperation({ summary: "Imtihonni o'chirish (TEACHER, ADMIN)" })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Delete(":examId")
  deleteExam(
    @Param("examId", ParseIntPipe) examId: number,
    @Req() req: Request,
  ) {
    return this.examsService.deleteExam(examId, req["user"]);
  }
}
