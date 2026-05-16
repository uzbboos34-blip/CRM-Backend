import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVideoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  group_id: number;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  lesson_id?: number;

  @ApiProperty({ example: 'Dars videosi' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'https://youtube.com/...' })
  @IsString()
  @IsNotEmpty()
  video_url: string;

  @ApiProperty({ example: 'Video haqida...', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
