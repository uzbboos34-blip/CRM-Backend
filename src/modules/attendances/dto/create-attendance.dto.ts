import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsBoolean, IsString, IsDateString, ValidateNested } from "class-validator";

export class AttendanceRecord {
  @ApiProperty()
  @IsNumber()
  student_id: number;

  @ApiProperty()
  @IsBoolean()
  present: boolean;
}

export class CreateAttendanceDto {
  @ApiProperty()
  @IsNumber()
  group_id: number;

  @ApiProperty({ example: '2025-05-13' })
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  topic: string;

  @ApiProperty({ example: 'plan' })
  @IsString()
  type: string;

  @ApiProperty({ type: [AttendanceRecord] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecord)
  records: AttendanceRecord[];
}
