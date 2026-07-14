import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  Matches,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';

/** Full URL or local upload path (/uploads/…) */
const MEDIA_URL =
  /^(https?:\/\/[^\s]+|\/uploads\/[A-Za-z0-9._-]+)$/;

export class RegisterDto {
  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Invalid phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RequestOtpDto {
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/)
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/)
  phone!: string;

  @IsString()
  @MinLength(4)
  code!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}

/** Customer-editable profile fields */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Invalid phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(MEDIA_URL, {
    message: 'avatarUrl must be a URL or /uploads/… path',
  })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  locale?: string; // en | sw

  // Default delivery address (upserted when any location field is sent)
  @IsOptional()
  @IsString()
  addressLabel?: string;

  @IsOptional()
  @IsString()
  addressStreet?: string;

  @IsOptional()
  @IsString()
  addressArea?: string; // ward

  @IsOptional()
  @IsString()
  addressCity?: string; // district

  @IsOptional()
  @IsString()
  addressRegion?: string;
}

/**
 * Full seller KYC for customer safety.
 * Status starts as PENDING until admin verifies documents.
 */
export class RegisterSellerDto {
  // Business
  @IsString()
  @MinLength(2)
  businessName!: string;

  @IsString()
  businessType!: string; // individual | partnership | company

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  tinNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  yearsTrading?: number;

  // Identity
  @IsString()
  @MinLength(3)
  legalFullName!: string;

  @IsString()
  @MinLength(5)
  nationalId!: string;

  @IsString()
  @Matches(MEDIA_URL, {
    message: 'nationalIdFrontUrl must be a URL or /uploads/… path',
  })
  nationalIdFrontUrl!: string;

  @IsString()
  @Matches(MEDIA_URL, {
    message: 'nationalIdBackUrl must be a URL or /uploads/… path',
  })
  nationalIdBackUrl!: string;

  @IsString()
  @Matches(MEDIA_URL, {
    message: 'selfieUrl must be a URL or /uploads/… path',
  })
  selfieUrl!: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/)
  secondaryPhone?: string;

  // Location
  @IsString()
  @MinLength(3)
  addressStreet!: string;

  @IsOptional()
  @IsString()
  addressArea?: string;

  @IsOptional()
  @IsString()
  addressWard?: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  addressLandmark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @Matches(MEDIA_URL)
  shopExteriorUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(MEDIA_URL)
  shopInteriorUrl?: string;

  // Payout
  @IsString()
  payoutMethod!: string; // mobile_money | bank

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/)
  payoutPhone?: string;

  @IsString()
  @MinLength(3)
  payoutAccountName!: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  // Consents
  @IsBoolean()
  termsAccepted!: boolean;

  @IsBoolean()
  dataConsent!: boolean;

  @IsBoolean()
  accurateListingConsent!: boolean;
}

/**
 * Full driver onboarding for accountability / theft recovery.
 * Status starts as PENDING until admin verifies documents.
 */
export class RegisterDriverDto {
  // Identity
  @IsString()
  @MinLength(3)
  legalFullName!: string;

  @IsString()
  @MinLength(5)
  nationalId!: string;

  @IsString()
  @Matches(MEDIA_URL, { message: 'nationalIdFrontUrl must be a URL or /uploads/… path' })
  nationalIdFrontUrl!: string;

  @IsString()
  @Matches(MEDIA_URL, { message: 'nationalIdBackUrl must be a URL or /uploads/… path' })
  nationalIdBackUrl!: string;

  @IsString()
  @Matches(MEDIA_URL, { message: 'selfieUrl must be a URL or /uploads/… path' })
  selfieUrl!: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string; // ISO date YYYY-MM-DD

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/)
  secondaryPhone?: string;

  // Address
  @IsString()
  @MinLength(3)
  addressStreet!: string;

  @IsOptional()
  @IsString()
  addressArea?: string;

  @IsOptional()
  @IsString()
  addressWard?: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  addressLandmark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  homeLatitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  homeLongitude?: number;

  // Vehicle
  @IsString()
  vehicleType!: string; // motorcycle | car | van

  @IsString()
  @MinLength(3)
  vehiclePlate!: string;

  @IsOptional()
  @IsString()
  vehicleMake?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  vehicleColor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1980)
  @Max(2100)
  vehicleYear?: number;

  @IsString()
  @Matches(MEDIA_URL, { message: 'vehiclePhotoSideUrl must be a URL or /uploads/… path' })
  vehiclePhotoSideUrl!: string;

  @IsString()
  @Matches(MEDIA_URL, { message: 'vehiclePhotoRearUrl must be a URL or /uploads/… path' })
  vehiclePhotoRearUrl!: string;

  @IsString()
  @Matches(MEDIA_URL, { message: 'vehiclePhotoWithDriverUrl must be a URL or /uploads/… path' })
  vehiclePhotoWithDriverUrl!: string;

  // Licence
  @IsString()
  @MinLength(3)
  licenseNumber!: string;

  @IsOptional()
  @IsString()
  licenseClass?: string;

  @IsString()
  @Matches(MEDIA_URL, { message: 'licensePhotoUrl must be a URL or /uploads/… path' })
  licensePhotoUrl!: string;

  @IsOptional()
  @IsString()
  @Matches(MEDIA_URL, { message: 'insuranceDocUrl must be a URL or /uploads/… path' })
  insuranceDocUrl?: string;

  @IsOptional()
  @IsString()
  insuranceExpiresAt?: string;

  // Payout
  @IsString()
  payoutMethod!: string; // mobile_money | bank

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/)
  payoutPhone?: string;

  @IsString()
  @MinLength(3)
  payoutAccountName!: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  // Emergency + guarantor
  @IsString()
  @MinLength(2)
  emergencyName!: string;

  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/)
  emergencyPhone!: string;

  @IsOptional()
  @IsString()
  emergencyRelation?: string;

  @IsOptional()
  @IsString()
  guarantorName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/)
  guarantorPhone?: string;

  @IsOptional()
  @IsString()
  guarantorIdNumber?: string;

  @IsOptional()
  @IsString()
  guarantorAddress?: string;

  // Consents (must be true)
  @IsBoolean()
  termsAccepted!: boolean;

  @IsBoolean()
  dataConsent!: boolean;

  @IsBoolean()
  trackingConsent!: boolean;
}
