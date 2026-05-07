import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto';
import { Status } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
    @ApiProperty({ enum: Status, required: false })
    @IsOptional()
    @IsEnum(Status)
    status?: Status;

}
