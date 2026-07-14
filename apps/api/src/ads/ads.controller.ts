import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdsService } from './ads.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class AdsController {
  constructor(private ads: AdsService) {}

  /** Public — home carousel (default 3) */
  @Get('ads/carousel')
  carousel(@Query('limit') limit?: string) {
    return this.ads.activeCarousel(limit ? Number(limit) : 3);
  }

  @Get('ads/packages')
  packages() {
    return this.ads.packages();
  }

  @Post('ads/:id/impression')
  impression(@Param('id') id: string) {
    return this.ads.trackImpression(id);
  }

  @Post('ads/:id/click')
  click(@Param('id') id: string) {
    return this.ads.trackClick(id);
  }

  @Get('seller/promos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  myPromos(@CurrentUser('id') userId: string) {
    return this.ads.myPromos(userId);
  }

  @Post('seller/promos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  subscribe(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePromoDto,
  ) {
    return this.ads.subscribe(userId, dto);
  }

  @Patch('seller/promos/:id/pause')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  pause(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ads.pause(userId, id);
  }
}
