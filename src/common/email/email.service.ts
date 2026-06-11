import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { text } from "stream/consumers";

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}
  async sendEmail(email: string, login: string, password: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        from: "uzbboos34.gmail.com",
        subject: "Login and password",
        template: "index",
        context: {
          text: `Login: ${login}, Password: ${password}`,
        },
      });
    } catch (error) {
      console.error("Email yuborishda xatolik yuz berdi:", error.message || error);
    }
  }
}
