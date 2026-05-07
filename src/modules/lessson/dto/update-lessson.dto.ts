import { PartialType } from '@nestjs/swagger';
import { CreateLesssonDto } from './create-lessson.dto';

export class UpdateLesssonDto extends PartialType(CreateLesssonDto) {}
