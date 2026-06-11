import { Body, Controller, Post } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { SendOtpDto } from './dto/verification.dto';

@Controller('verification')
export class VerificationController {
    constructor(private readonly verificationService:VerificationService){}

    @Post("send")
    sendOtp(@Body() payload: any){
        return this.verificationService.sendOtp(payload)
    }
}
