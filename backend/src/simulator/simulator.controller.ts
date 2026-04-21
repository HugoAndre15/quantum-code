import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SimulatorService } from './simulator.service';
import { SimulatorLeadDto } from './dto/simulator-lead.dto';

@Controller('simulator')
export class SimulatorController {
  constructor(private simulator: SimulatorService) {}

  @Post('lead')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  submitLead(@Body() dto: SimulatorLeadDto) {
    return this.simulator.submitLead(dto);
  }
}
