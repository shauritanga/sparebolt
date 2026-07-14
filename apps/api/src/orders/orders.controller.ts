import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateAddressDto,
  CreateOrderDto,
  CreateReviewDto,
  OpenDisputeDto,
} from './dto/orders.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post('addresses')
  createAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.orders.createAddress(userId, dto);
  }

  @Get('addresses')
  getAddresses(@CurrentUser('id') userId: string) {
    return this.orders.getAddresses(userId);
  }

  @Post('orders')
  createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.createOrder(userId, dto);
  }

  @Get('orders')
  myOrders(@CurrentUser('id') userId: string) {
    return this.orders.myOrders(userId);
  }

  @Get('orders/:id')
  getOrder(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    return this.orders.getOrder(userId, id, role);
  }

  @Post('orders/:id/confirm')
  confirm(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.orders.confirmReceipt(userId, id);
  }

  @Post('orders/:id/dispute')
  dispute(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: OpenDisputeDto,
  ) {
    return this.orders.openDispute(userId, id, dto);
  }

  @Post('orders/:id/reviews')
  review(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.orders.addReview(userId, id, dto);
  }
}
