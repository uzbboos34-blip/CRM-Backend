import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { HomeWorksService } from './home-works.service';
import { CreateHomeWorkDto } from './dto/create-home-work.dto';
import { UpdateHomeWorkDto } from './dto/update-home-work.dto';

@Controller('home-works')
export class HomeWorksController {
  constructor(private readonly homeWorksService: HomeWorksService) {}

//  @Post()
//   create(@Body() createHomeWorkDto: CreateHomeWorkDto) {
//     return this.homeWorksService.create(createHomeWorkDto);
//   }
 
  @Get()
  findAll() {
    return this.homeWorksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.homeWorksService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateHomeWorkDto: UpdateHomeWorkDto) {
    return this.homeWorksService.update(+id, updateHomeWorkDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.homeWorksService.remove(+id);
  }
}
