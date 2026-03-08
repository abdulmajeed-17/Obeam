import { Controller, Get } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

  @Get('health')
  async healthCheck() {
    return this.monitoring.getHealthCheck();
  }
}
