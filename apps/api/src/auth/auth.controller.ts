import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RegisterDriverDto,
  RegisterSellerDto,
  RequestOtpDto,
  UpdateProfileDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto);
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser('id') userId: string) {
    return this.auth.me(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(userId, dto);
  }

  @Post('become-seller')
  @UseGuards(JwtAuthGuard)
  becomeSeller(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterSellerDto,
  ) {
    return this.auth.registerSeller(userId, dto);
  }

  @Post('become-driver')
  @UseGuards(JwtAuthGuard)
  becomeDriver(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterDriverDto,
  ) {
    return this.auth.registerDriver(userId, dto);
  }
}
