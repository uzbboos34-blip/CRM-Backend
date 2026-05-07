import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {  Status } from '@prisma/client';

export class FindAllCoursesDto {
    @IsOptional()
    @IsEnum(Status)
    @ApiPropertyOptional({ 
        enum: Status,
        enumName: 'Status',
    })
    status?: Status;

    @IsOptional()
    @ApiPropertyOptional()
    name?: string

    @IsOptional()
    @ApiPropertyOptional()
    description?: string

    @IsOptional()
    @ApiPropertyOptional()
    price?: number

    @IsOptional()
    @ApiPropertyOptional()
    duration_month?: number

    @IsOptional()
    @ApiPropertyOptional()
    duration_hours?: number
}
