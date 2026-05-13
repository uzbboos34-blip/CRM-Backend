import { Module } from '@nestjs/common';
import { HomeWorksService } from './home-works.service';
import { HomeWorksController } from './home-works.controller';
import { PrismaService } from 'src/core/database/prisma.service';

@Module({
  controllers: [HomeWorksController],
  providers: [HomeWorksService, PrismaService],
})
export class HomeWorksModule {}
