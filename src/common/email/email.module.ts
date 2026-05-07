import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'path';

@Global()
@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        service: 'gmail',
        auth: {
          user: "uzbboos34@gmail.com",
          pass:"kykmzvrmtaqjdhni"
        }
      },
      defaults: {
        from: '"N26 GROUP" uzbboos34@gmail.com',
      },
      template: {
        dir: join(process.cwd(),"src", "templates"),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    })
  ],
  providers: [EmailService],
  exports: [EmailService]
})
export class EmailModule {}
