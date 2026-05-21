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
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { HomeWorksService } from "./home-works.service";
import { CreateHomeWorkDto } from "./dto/create-home-work.dto";
import { UpdateHomeWorkDto } from "./dto/update-home-work.dto";
import { TokenGuard } from "src/common/guards/token.guards";
import { RolesGuard } from "src/common/guards/role.guards";
import { Roles } from "src/common/decorators/roles";
import { UserRole } from "@prisma/client";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

// ─── Inline DTOs ──────────────────────────────────────────────────────────────
class GradeDto {
  @ApiProperty({ description: "Ball (0-100)" })
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  grade: number;

  @ApiProperty({ required: false, description: "Izoh" })
  @IsOptional()
  @IsString()
  comment?: string;
}

class SubmitHomeworkDto {
  @ApiProperty({ required: false, description: "Student izohi" })
  @IsOptional()
  @IsString()
  comment?: string;
}

/**
 * Ruxsatlar:
 *   POST   /home-works                         → SUPERADMIN, ADMIN, TEACHER
 *   GET    /home-works                         → SUPERADMIN, ADMIN
 *   GET    /home-works/group/:id               → SUPERADMIN, ADMIN, TEACHER
 *   GET    /home-works/:id                     → SUPERADMIN, ADMIN, TEACHER
 *   GET    /home-works/:hwId/submissions       → SUPERADMIN, ADMIN, TEACHER
 *   GET    /home-works/:hwId/student/:sid      → SUPERADMIN, ADMIN, TEACHER
 *   POST   /home-works/:hwId/grade/:answerId   → SUPERADMIN, ADMIN, TEACHER
 *   POST   /home-works/:hwId/submit            → STUDENT (via separate guard if needed)
 *   PUT    /home-works/:id                     → SUPERADMIN, ADMIN, TEACHER
 *   DELETE /home-works/:id                     → SUPERADMIN, ADMIN, TEACHER
 */
@ApiTags("HomeWorks")
@ApiBearerAuth()
@UseGuards(TokenGuard, RolesGuard)
@Controller("home-works")
export class HomeWorksController {
  constructor(private readonly homeWorksService: HomeWorksService) {}

  // ─── CREATE ──────────────────────────────────────────────────────────────
  @ApiOperation({
    summary: "Yangi uyga vazifa yaratish (ADMIN, SUPERADMIN, TEACHER)",
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "file", maxCount: 1 },
        { name: "video", maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: "./src/uploads",
          filename: (req, file, cb) => {
            const ext = file.originalname.split(".").pop();
            const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
            cb(null, filename);
          },
        }),
      },
    ),
  )
  create(
    @Body() dto: CreateHomeWorkDto,
    @Req() req: Request,
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    const file = files?.file?.[0]?.filename;
    const video = files?.video?.[0]?.filename;
    return this.homeWorksService.create(dto, req["user"], file, video);
  }

  // ─── BARCHA (admin) ───────────────────────────────────────────────────────
  @ApiOperation({ summary: "Barcha uyga vazifalar (SUPERADMIN, ADMIN)" })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get()
  findAll(@Req() req: Request) {
    return this.homeWorksService.findAll(req["user"]);
  }

  // ─── GURUHGA TEGISHLI ─────────────────────────────────────────────────────
  @ApiOperation({
    summary: "Guruhga tegishli uyga vazifalar (ADMIN, SUPERADMIN, TEACHER)",
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get("group/:groupId")
  findAllByGroup(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Req() req: Request,
  ) {
    return this.homeWorksService.findAllByGroup(groupId, req["user"]);
  }

  // ─── HOMEWORK SUBMISSIONS (kutilayotganlar, qaytarilganlar, ...) ──────────
  @ApiOperation({
    summary: "Homework topshiriqlarini ko'rish (TEACHER, ADMIN, SUPERADMIN)",
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get(":hwId/submissions")
  getSubmissions(
    @Param("hwId", ParseIntPipe) hwId: number,
    @Req() req: Request,
  ) {
    return this.homeWorksService.getHomeworkSubmissions(hwId, req["user"]);
  }

  // ─── BITTA STUDENT TOPSHIRIG'I ────────────────────────────────────────────
  @ApiOperation({
    summary: "Bitta student topshirig'ini ko'rish (TEACHER, ADMIN, SUPERADMIN)",
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get(":hwId/student/:studentId")
  getStudentSubmission(
    @Param("hwId", ParseIntPipe) hwId: number,
    @Param("studentId", ParseIntPipe) studentId: number,
    @Req() req: Request,
  ) {
    return this.homeWorksService.getStudentSubmission(
      hwId,
      studentId,
      req["user"],
    );
  }

  // ─── BAHOLASH ────────────────────────────────────────────────────────────
  @ApiOperation({
    summary: "Topshiriqni baholash (TEACHER, ADMIN, SUPERADMIN)",
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Post(":hwId/grade/:answerId")
  gradeSubmission(
    @Param("hwId", ParseIntPipe) hwId: number,
    @Param("answerId", ParseIntPipe) answerId: number,
    @Body() dto: GradeDto,
    @Req() req: Request,
  ) {
    return this.homeWorksService.gradeSubmission(
      answerId,
      Number(dto.grade),
      dto.comment,
      req["user"],
    );
  }

  // ─── STUDENT TOPSHIRISHI (file upload bilan) ──────────────────────────────
  @ApiOperation({
    summary: "Student uyga vazifa topshiradi (STUDENT, TEACHER, ADMIN)",
  })
  @Roles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @Post(":hwId/submit")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "files", maxCount: 10 }], {
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
  submitHomework(
    @Param("hwId", ParseIntPipe) hwId: number,
    @Body() dto: SubmitHomeworkDto,
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Req() req: Request,
  ) {
    const studentId = req["user"].id;
    const fileNames = files?.files?.map((f) => f.filename) || [];
    return this.homeWorksService.submitHomework(
      hwId,
      studentId,
      dto.comment,
      fileNames,
    );
  }

  // ─── BITTA HOMEWORK ───────────────────────────────────────────────────────
  @ApiOperation({ summary: "Bitta uyga vazifa (ADMIN, SUPERADMIN, TEACHER)" })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @Req() req: Request) {
    return this.homeWorksService.findOne(id, req["user"]);
  }

  // ─── YANGILASH ────────────────────────────────────────────────────────────
  @ApiOperation({
    summary: "Uyga vazifani yangilash (ADMIN, SUPERADMIN, TEACHER)",
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Put(":id")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "file", maxCount: 1 },
        { name: "video", maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: "./src/uploads",
          filename: (req, file, cb) => {
            const ext = file.originalname.split(".").pop();
            const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
            cb(null, filename);
          },
        }),
      },
    ),
  )
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateHomeWorkDto,
    @Req() req: Request,
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    const file = files?.file?.[0]?.filename;
    const video = files?.video?.[0]?.filename;
    return this.homeWorksService.update(id, dto, req["user"], file, video);
  }

  // ─── O'CHIRISH ────────────────────────────────────────────────────────────
  @ApiOperation({
    summary: "Uyga vazifani o'chirish (ADMIN, SUPERADMIN, TEACHER)",
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @Req() req: Request) {
    return this.homeWorksService.remove(id, req["user"]);
  }
}
