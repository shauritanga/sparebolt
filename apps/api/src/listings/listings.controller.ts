import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ListingsService } from './listings.service';
import {
  CreateListingDto,
  SearchListingsDto,
  UpdateListingDto,
} from './dto/listings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class ListingsController {
  constructor(private listings: ListingsService) {}

  @Get('listings')
  search(@Query() query: SearchListingsDto) {
    return this.listings.search(query);
  }

  @Get('listings/:id')
  findOne(@Param('id') id: string) {
    return this.listings.findOne(id);
  }

  @Post('listings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  create(@CurrentUser('id') userId: string, @Body() dto: CreateListingDto) {
    return this.listings.create(userId, dto);
  }

  @Patch('listings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listings.update(userId, id, dto);
  }

  @Delete('listings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.listings.remove(userId, id);
  }

  @Get('seller/listings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  myListings(@CurrentUser('id') userId: string) {
    return this.listings.myListings(userId);
  }

  @Get('categories')
  categories() {
    return this.listings.categories();
  }

  @Get('vehicles/makes')
  vehicleMakes() {
    return this.listings.vehicleMakes();
  }
}
