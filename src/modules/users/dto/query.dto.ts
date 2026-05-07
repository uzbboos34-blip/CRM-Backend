import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '@prisma/client';

export class FindAllUsersDto {
    @IsOptional()
    @IsEnum(Status)
    @ApiPropertyOptional({ 
        enum: Status,
        enumName: 'Status',
    })
    status?: Status;

    @IsOptional()
    @ApiPropertyOptional()
    first_name?: string;
    
    @IsOptional()
    @ApiPropertyOptional()
    last_name?: string;

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
