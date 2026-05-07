import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StudentStatus } from '@prisma/client';

export class FindAllStudentsDto {
    @IsOptional()
    @IsEnum(StudentStatus)
    @ApiPropertyOptional({ 
        enum: StudentStatus,
        enumName: 'StudentStatus',
    })
    status?: StudentStatus;

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

    @IsOptional()
    @ApiPropertyOptional()
    birth_date?: string;
}
