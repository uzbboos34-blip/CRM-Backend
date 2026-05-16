import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVideoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  group_id: number;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  lesson_id?: number;

  @ApiProperty({ example: 'Dars videosi' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'https://youtube.com/...', required: false })
  @IsOptional()
  @IsString()
  video_url?: string;

  @ApiProperty({ example: 'Video haqida...', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
