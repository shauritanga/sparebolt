import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { DispatchService } from './dispatch.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, DispatchService],
  exports: [DeliveriesService, DispatchService],
})
export class DeliveriesModule {}
