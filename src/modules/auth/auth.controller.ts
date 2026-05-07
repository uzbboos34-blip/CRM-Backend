import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { TokenGuard } from 'src/common/guards/token.guards';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('user/login')
  createUser(@Body() payload: CreateAuthDto) {
    return this.authService.loginUser(payload);
  }
  @Post('teacher/login')
  createTeacher(@Body() payload: CreateAuthDto) {
    return this.authService.loginTeacher(payload);
  }
  @Post('student/login')
  createStudent(@Body() payload: CreateAuthDto) {
    return this.authService.loginStudent(payload);
  }

  @UseGuards(TokenGuard)
  @ApiBearerAuth()
  @Get('me')
  findMe(@Req() req: any) {
    return this.authService.me(req);
  }
}
