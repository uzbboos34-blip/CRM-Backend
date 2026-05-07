import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({ enum: Status, required: false })
    @IsOptional()
    @IsEnum(Status)
    status?: Status;
}
