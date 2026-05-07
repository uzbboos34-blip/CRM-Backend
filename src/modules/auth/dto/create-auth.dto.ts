import { ApiProperty } from '@nestjs/swagger';
import { IsMobilePhone, IsString } from 'class-validator';

export class CreateAuthDto {
  @ApiProperty({
    type: 'string',
    example: '+998907012161',
  })
  @IsMobilePhone('uz-UZ')
  phone: string;

  @ApiProperty({
    example: 'Rahmonbergan04@',
  })
  @IsString()
  password: string;
}
