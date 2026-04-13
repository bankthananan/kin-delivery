import { Controller, Put, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('fcm-token')
  @UseGuards(JwtAuthGuard)
  async updateFcmToken(
    @CurrentUser() user: JwtPayload,
    @Body('fcmToken') fcmToken: string,
  ) {
    return this.usersService.updateFcmToken(user.sub, fcmToken);
  }
}
