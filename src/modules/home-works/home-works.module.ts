import { Module } from '@nestjs/common';
import { HomeWorksService } from './home-works.service';
import { HomeWorksController } from './home-works.controller';

@Module({
  controllers: [HomeWorksController],
  providers: [HomeWorksService],
})
export class HomeWorksModule {}
