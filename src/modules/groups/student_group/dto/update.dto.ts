import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Status } from '@prisma/client';
import { CreateStudentGroupDto } from './create.dto';

export class UpdateStudentGroupDto extends PartialType(CreateStudentGroupDto) {
    @ApiProperty({ enum: Status, required: false })
    @IsOptional()
    @IsEnum(Status)
    status?: Status;
}
