import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateGroupDto } from './create-group.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { GroupStatus } from '@prisma/client';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {
    @ApiProperty({ enum: GroupStatus, required: false })
    @IsOptional()
    @IsEnum(GroupStatus)
    status?: GroupStatus;
}
