import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { CounterpartiesService } from './counterparties.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';

@Controller('counterparties')
@UseGuards(JwtAuthGuard)
export class CounterpartiesController {
  constructor(private readonly counterparties: CounterpartiesService) {}

  @Post()
  create(@GetUser() user: RequestUser, @Body() body: CreateCounterpartyDto) {
    return this.counterparties.create(user, body);
  }

  @Get()
  list(@GetUser() user: RequestUser) {
    return this.counterparties.list(user);
  }

  @Get(':id')
  getById(@GetUser() user: RequestUser, @Param('id') id: string) {
    return this.counterparties.getById(user, id);
  }
}
