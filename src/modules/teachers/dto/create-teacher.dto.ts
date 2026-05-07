import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsMobilePhone,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  Matches,
} from 'class-validator';

export class CreateTeacherDto {
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
  @Matches(/^998(20|25|33|50|55|70|71|77|78|88|90|91|93|94|95|97|98|99)\d{7}$/, {
    message: 'Telefon raqami noto\'g\'ri formatda kiritildi',
  })
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

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
