import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { StudentStatus } from '@prisma/client';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
    @ApiProperty({ enum: StudentStatus, required: false })
    @IsOptional()
    @IsEnum(StudentStatus)
    status?: StudentStatus;
}
