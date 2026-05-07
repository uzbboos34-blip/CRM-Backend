import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GroupStatus, WeekDay} from '@prisma/client';

export class FindAllGroupsDto {
    @IsOptional()
    @IsEnum(GroupStatus)
    @ApiPropertyOptional({ 
        enum: GroupStatus,
        enumName: 'GroupStatus',
    })
    status?: GroupStatus;

    @IsOptional()
    @ApiPropertyOptional()
    name?: string

    @IsOptional()
    @ApiPropertyOptional()
    description?: string
    
    @IsOptional()
    @ApiPropertyOptional()
    start_date?: string

    @IsOptional()
    @IsEnum(WeekDay)
    @ApiPropertyOptional({
        enum: WeekDay,
        enumName: 'WeekDay',
    })
    week_day?: WeekDay

    @IsOptional()
    @ApiPropertyOptional()
    start_time?: string

    @IsOptional()
    @ApiPropertyOptional()
    max_students?: number
}
