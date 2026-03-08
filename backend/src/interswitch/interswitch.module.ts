import { Module } from '@nestjs/common';
import { InterswitchController } from './interswitch.controller';
import { InterswitchService } from './interswitch.service';

@Module({
  controllers: [InterswitchController],
  providers: [InterswitchService],
  exports: [InterswitchService],
})
export class InterswitchModule {}
