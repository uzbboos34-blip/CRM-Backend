import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateHomeWorkDto {
  @ApiProperty({ description: 'Dars (lesson) ID' })
  @IsInt()
  lesson_id: number;

  @ApiProperty({ description: 'Guruh ID' })
  @IsInt()
  group_id: number;

  @ApiProperty({ description: 'Vazifa sarlavhasi' })
  @IsString()
  title: string;

  @ApiProperty({ required: false, description: 'Izoh (rich-text)' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Fayl nomi / yo\'li' })
  @IsOptional()
  @IsString()
  file?: string;
}
