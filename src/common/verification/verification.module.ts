import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { SmsService } from '../service/sms.service';

@Module({
  controllers: [VerificationController],
  providers: [VerificationService, SmsService]
})
export class VerificationModule {}
