import { Module } from "@nestjs/common";
import { ExamsService } from "./exams.service";
import { ExamsController } from "./exams.controller";
import { PrismaModule } from "src/core/database/prisma.model";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [PrismaModule, JwtModule.register({}), ConfigModule],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
