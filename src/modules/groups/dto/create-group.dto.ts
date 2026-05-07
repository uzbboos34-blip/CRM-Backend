import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayNotEmpty,
    IsArray,
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsString,
} from 'class-validator';

export class CreateGroupDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    course_id: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    room_id: number;

    @ApiProperty({ example: '2026-03-01' })
    @IsDateString()
    start_date: string;

    @ApiProperty({ example: '2026-06-01' })
    @IsDateString()
    end_date: string;

    @ApiPropertyOptional({
        example: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        type: [String],
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    week_day: string[];

    @ApiProperty({ example: '18:00' })
    @IsString()
    @IsNotEmpty()
    start_time: string;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    max_students: number;
    
    @ApiProperty({
        type: [Number],
        example: [1, 2, 3],
    })
    @IsArray()
    students?: number[];

    @ApiProperty({
        type: [Number],
        example: [1, 2, 3],
    })
    @IsArray()
    teachers?: number[]
}
