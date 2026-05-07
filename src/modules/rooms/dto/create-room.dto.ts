import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ maximum: 30, minimum: 1 })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(30)
  capacity: number;
}
