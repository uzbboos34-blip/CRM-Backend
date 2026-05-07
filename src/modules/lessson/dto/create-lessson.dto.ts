import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateLesssonDto {
    @ApiProperty()
    @IsNumber()
    group_id: number

    @ApiProperty()
    @IsOptional()
    @IsString()
    topic:string

    @ApiProperty()
    @IsOptional()
    @IsString()
    description:string
}
