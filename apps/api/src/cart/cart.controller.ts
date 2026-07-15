import { Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { SyncCartDto } from './cart.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cart: CartService) {}

  /** Sync client cart for abandoned-cart recovery (logged-in only). */
  @Put('sync')
  sync(@CurrentUser('id') userId: string, @Body() dto: SyncCartDto) {
    return this.cart.sync(userId, dto);
  }

  @Delete('sync')
  clear(@CurrentUser('id') userId: string) {
    return this.cart.clear(userId);
  }

  /** Confirm recovery schedule is working (any authed user). */
  @Get('recovery-stats')
  stats() {
    return this.cart.recoveryStats();
  }
}
