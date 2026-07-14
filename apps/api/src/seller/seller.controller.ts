import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SellerService } from './seller.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('seller')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER, Role.ADMIN)
export class SellerController {
  constructor(private seller: SellerService) {}

  @Get('analytics')
  analytics(@CurrentUser('id') userId: string) {
    return this.seller.analytics(userId);
  }

  @Get('sales')
  sales(@CurrentUser('id') userId: string) {
    return this.seller.sales(userId);
  }
}
