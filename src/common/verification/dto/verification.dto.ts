export class SendOtpDto {
    phone: string;
}

export class verification extends SendOtpDto {
    otp: string;
}