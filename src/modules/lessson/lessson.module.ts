import { Module } from '@nestjs/common';
import { LesssonService } from './lessson.service';
import { LesssonController } from './lessson.controller';

@Module({
  controllers: [LesssonController],
  providers: [LesssonService],
})
export class LesssonModule {}
