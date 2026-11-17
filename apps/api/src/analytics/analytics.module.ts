import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, DashboardService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
