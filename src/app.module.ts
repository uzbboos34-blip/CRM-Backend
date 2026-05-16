import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { GroupsModule } from './modules/groups/groups.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { CoursesModule } from './modules/courses/courses.module';

import { PrismaModule } from './core/database/prisma.model';
import { EmailModule } from './common/email/email.module';
import { LesssonModule } from './modules/lessson/lessson.module';
import { AttendancesModule } from './modules/attendances/attendances.module';
import { HomeWorksModule } from './modules/home-works/home-works.module';
import { VideosModule } from './modules/videos/videos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    TeachersModule,
    StudentsModule,
    RoomsModule,
    CoursesModule,
    GroupsModule,
    PrismaModule,
    EmailModule,
    LesssonModule,
    AttendancesModule,
    HomeWorksModule,
    VideosModule,
  ],
})
export class AppModule {}
