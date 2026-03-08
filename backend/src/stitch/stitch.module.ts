import { Module } from '@nestjs/common';
import { StitchController } from './stitch.controller';
import { StitchService } from './stitch.service';

@Module({
  controllers: [StitchController],
  providers: [StitchService],
  exports: [StitchService],
})
export class StitchModule {}
