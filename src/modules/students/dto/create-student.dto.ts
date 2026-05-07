import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsMobilePhone,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';
export class CreateStudentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsStrongPassword()
  password: string;

  @ApiProperty()
  @IsMobilePhone('uz-UZ')
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  birth_date: string;

  @ApiProperty({ type: [Number], example: [1, 2, 3] })
    @IsOptional()
    @Transform(({ value }) => {
      if (!value) return [];
      if (typeof value === 'string') {
        return value.split(',').map((v) => Number(v.trim()));
      }
      if (Array.isArray(value)) {
        return value.map((v) => Number(v));
      }
      return [Number(value)];
    })
    groups?: number[];
}
