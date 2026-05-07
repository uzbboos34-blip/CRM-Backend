import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '@prisma/client';

export class FindAllStudentGroupDto {
    @IsOptional()
    @IsEnum(Status)
    @ApiPropertyOptional({ 
        enum: Status,
        enumName: 'Status',
    })
    status?: Status;
}
