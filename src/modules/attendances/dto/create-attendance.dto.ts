import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber } from "class-validator";

export class CreateAttendanceDto {
    @ApiProperty()
    @IsNumber()
    lesson_id: number

    @ApiProperty()
    @IsNumber()
    student_id: number
    
    @ApiProperty()
    @IsBoolean()
    isPresent: boolean
}
