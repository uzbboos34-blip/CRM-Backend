import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '@prisma/client';

export class FindAllRoomsDto {
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
}
