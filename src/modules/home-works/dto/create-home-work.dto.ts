import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHomeWorkDto {
  @ApiProperty({ description: 'Dars (lesson) ID' })
  @IsInt()
  @Type(() => Number)
  lesson_id: number;

  @ApiProperty({ description: 'Guruh ID' })
  @IsInt()
  @Type(() => Number)
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

  @ApiProperty({ required: false, description: 'Video nomi / yo\'li' })
  @IsOptional()
  @IsString()
  video_url?: string;
}
