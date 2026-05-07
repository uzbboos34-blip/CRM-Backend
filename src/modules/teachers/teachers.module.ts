import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { EmailModule } from 'src/common/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [TeachersController],
  providers: [TeachersService],
})
export class TeachersModule {}
