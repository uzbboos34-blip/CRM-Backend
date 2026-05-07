import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateTeacherDto } from './create-teacher.dto';
import { Status } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {
    @ApiProperty({ enum: Status, required: false })
    @IsOptional()
    @IsEnum(Status)
    status?: Status;
}
