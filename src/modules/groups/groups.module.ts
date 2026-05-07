import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { StudentGroupController } from './student_group/student_group.controller';
import { StudentGroupService } from './student_group/student_group.service';

@Module({
  controllers: [GroupsController, StudentGroupController],
  providers: [GroupsService, StudentGroupService],
  imports: [],
})
export class GroupsModule {}
