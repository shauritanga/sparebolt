import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DeliveryStatus, Role } from '@prisma/client';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DRIVER, Role.ADMIN)
export class DeliveriesController {
  constructor(private deliveries: DeliveriesService) {}

  @Get('jobs/available')
  available(@CurrentUser('id') userId: string) {
    return this.deliveries.availableJobs(userId);
  }

  @Get('jobs')
  myJobs(@CurrentUser('id') userId: string) {
    return this.deliveries.myJobs(userId);
  }

  @Post('jobs/:id/accept')
  accept(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.deliveries.accept(userId, id);
  }

  @Post('jobs/:id/reject')
  reject(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.deliveries.reject(userId, id, body.reason);
  }

  @Patch('jobs/:id/status')
  updateStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body()
    body: {
      status: DeliveryStatus;
      lat?: number;
      lng?: number;
    },
  ) {
    return this.deliveries.updateStatus(
      userId,
      id,
      body.status,
      body.lat != null && body.lng != null
        ? { lat: body.lat, lng: body.lng }
        : undefined,
    );
  }

  @Patch('jobs/:id/location')
  location(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.deliveries.updateLocation(userId, id, body.lat, body.lng);
  }

  @Patch('online')
  online(
    @CurrentUser('id') userId: string,
    @Body() body: { isOnline: boolean },
  ) {
    return this.deliveries.setOnline(userId, body.isOnline);
  }

  @Get('earnings')
  earnings(@CurrentUser('id') userId: string) {
    return this.deliveries.earnings(userId);
  }
}
