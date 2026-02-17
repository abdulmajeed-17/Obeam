import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { BusinessService } from './business.service';
import { UpdateBusinessMeDto } from './dto/update-business-me.dto';

@Controller('business')
@UseGuards(JwtAuthGuard)
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  @Get('me')
  getMe(@GetUser() user: RequestUser) {
    return this.business.getMe(user);
  }

  @Patch('me')
  updateMe(@GetUser() user: RequestUser, @Body() dto: UpdateBusinessMeDto) {
    return this.business.updateMe(user, dto);
  }
}
