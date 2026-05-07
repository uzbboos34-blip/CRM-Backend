import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsNumber } from "class-validator"

export class CreateStudentGroupDto {
    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    student_id: number

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    group_id: number
}