import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QueueService } from '../queue/queue.service';

@Controller('loyalty')
@ApiTags('loyalty')
export class LoyaltyHealthController {
  constructor(private readonly queue: QueueService) {}

  @Get('health')
  health() {
    return {
      status: 'ok' as const,
      queue: this.queue.health(),
    };
  }
}
