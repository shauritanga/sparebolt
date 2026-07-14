import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  LoginDto,
  RegisterDto,
  RegisterDriverDto,
  RegisterSellerDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private signToken(user: {
    id: string;
    email: string | null;
    phone: string | null;
    role: Role;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: this.sanitize(user),
    };
  }

  private sanitize(user: Record<string, unknown>) {
    const { passwordHash: _, ...rest } = user as {
      passwordHash?: string;
      [k: string]: unknown;
    };
    return rest;
  }

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone is required');
    }
    if (dto.email) {
      const exists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (exists) throw new ConflictException('Email already registered');
    }
    if (dto.phone) {
      const exists = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (exists) throw new ConflictException('Phone already registered');
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : null;

    const allowedRoles: Role[] = [Role.CUSTOMER, Role.SELLER, Role.DRIVER];
    const role =
      dto.role && allowedRoles.includes(dto.role) ? dto.role : Role.CUSTOMER;

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role,
      },
    });

    return this.signToken(user);
  }

  async login(dto: LoginDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : undefined,
          dto.phone ? { phone: dto.phone } : undefined,
        ].filter(Boolean) as { email?: string; phone?: string }[],
      },
      include: { sellerProfile: true, driverProfile: true },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.signToken(user);
  }

  async requestOtp(dto: RequestOtpDto) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpCode.create({
      data: {
        phone: dto.phone,
        code,
        purpose: 'login',
        expiresAt,
      },
    });

    // In production: send via SMS provider
    const isDev = this.config.get('NODE_ENV') !== 'production';
    return {
      message: 'OTP sent',
      ...(isDev ? { debugCode: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone: dto.phone,
        code: dto.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new UnauthorizedException('Invalid or expired OTP');

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { used: true },
    });

    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { sellerProfile: true, driverProfile: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          firstName: dto.firstName || 'User',
          lastName: dto.lastName || '',
          phoneVerified: true,
          role: Role.CUSTOMER,
        },
        include: { sellerProfile: true, driverProfile: true },
      });
    } else if (!user.phoneVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
        include: { sellerProfile: true, driverProfile: true },
      });
    }

    return this.signToken(user);
  }

  async registerSeller(userId: string, dto: RegisterSellerDto) {
    const existing = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (existing) throw new ConflictException('Already a seller');

    const [profile] = await this.prisma.$transaction([
      this.prisma.sellerProfile.create({
        data: {
          userId,
          businessName: dto.businessName,
          description: dto.description,
          city: dto.city,
          region: dto.region,
          licenseNumber: dto.licenseNumber,
          status: 'APPROVED', // auto-approve for MVP; admin can moderate later
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { role: Role.SELLER },
      }),
    ]);

    return profile;
  }

  async registerDriver(userId: string, dto: RegisterDriverDto) {
    const existing = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });
    if (existing) throw new ConflictException('Already a driver');

    const [profile] = await this.prisma.$transaction([
      this.prisma.driverProfile.create({
        data: {
          userId,
          vehicleType: dto.vehicleType,
          vehiclePlate: dto.vehiclePlate,
          licenseNumber: dto.licenseNumber,
          city: dto.city,
          status: 'APPROVED',
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { role: Role.DRIVER },
      }),
    ]);

    return profile;
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { sellerProfile: true, driverProfile: true, addresses: true },
    });
    if (!user) throw new UnauthorizedException();
    return this.sanitize(user);
  }
}
