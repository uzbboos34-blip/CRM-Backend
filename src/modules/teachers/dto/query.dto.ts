import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '@prisma/client';

export class FindAllTeachersDto {
    @IsOptional()
    @IsEnum(Status)
    @ApiPropertyOptional({ 
        enum: Status,
        enumName: 'Status',
    })
    status?: Status;

    @IsOptional()
    @ApiPropertyOptional()
    full_name?: string;

    @IsOptional()
    @ApiPropertyOptional()
    email?: string;

    @IsOptional()
    @ApiPropertyOptional()
    phone?: string;

    @IsOptional()
    @ApiPropertyOptional()
    address?: string;
}
