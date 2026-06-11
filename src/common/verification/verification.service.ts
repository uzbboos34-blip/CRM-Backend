import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SmsService } from '../service/sms.service';

@Injectable()
export class VerificationService {
    constructor(
        private readonly smsService: SmsService
    ){}

    private getMessage(phone: string, password: string){
        return `Fixoo platformasidan ro'yxatdan o'tish uchun tasdiqlash kodi: Login: ${phone} Parol: ${password}. Kodni hech kimga bermang!`
    }
    
    async sendOtp(payload: any) {
        const { phone, password } = payload;

        if (!phone || !password) {
            throw new HttpException("Phone and password are required", HttpStatus.BAD_REQUEST);
        }

        await this.smsService.sendSMS(this.getMessage(phone, password), phone);

        return {
            success: true,
            message: "SMS sent successfully"
        };
    }
}
