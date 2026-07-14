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
import { ApprovalStatus, Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('users')
  users(@Query('role') role?: string) {
    return this.admin.listUsers(role);
  }

  @Patch('users/:id/active')
  setActive(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.admin.setUserActive(id, body.isActive);
  }

  @Patch('sellers/:id/status')
  sellerStatus(
    @Param('id') id: string,
    @Body() body: { status: ApprovalStatus },
  ) {
    return this.admin.approveSeller(id, body.status);
  }

  @Patch('drivers/:id/status')
  driverStatus(
    @Param('id') id: string,
    @Body() body: { status: ApprovalStatus },
  ) {
    return this.admin.approveDriver(id, body.status);
  }

  @Get('disputes')
  disputes() {
    return this.admin.listDisputes();
  }

  @Post('disputes/:id/resolve')
  resolve(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() body: { resolution: 'customer' | 'seller'; notes?: string },
  ) {
    return this.admin.resolveDispute(
      id,
      adminId,
      body.resolution,
      body.notes,
    );
  }

  @Patch('listings/:id')
  moderate(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.admin.moderateListing(id, body.isActive);
  }

  @Get('escrows')
  escrows() {
    return this.admin.listEscrows();
  }
}
