import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateRoomDto extends PartialType(CreateRoomDto) {
    @ApiProperty({ enum: Status, required: false })
    @IsOptional()
    @IsEnum(Status)
    status?: Status;
}
