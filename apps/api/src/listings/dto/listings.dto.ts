import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartCondition } from '@prisma/client';

/** Sellers must provide at least 3 product photos */
export const MIN_LISTING_IMAGES = 3;
export const MAX_LISTING_IMAGES = 10;

const MEDIA_URL =
  /^(https?:\/\/[^\s]+|\/uploads\/[A-Za-z0-9._-]+)$/;

export class SearchListingsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(PartCondition)
  condition?: PartCondition;

  /** Genuine | Aftermarket | OEM | Refurbished type string */
  @IsOptional()
  @IsString()
  partType?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class CreateListingDto {
  @IsString()
  categoryId!: string;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsEnum(PartCondition)
  condition!: PartCondition;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  /** Original / list price — shown struck through when higher than price */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  partType?: string;

  @IsOptional()
  @IsString()
  engine?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  warrantyMonths?: number;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yearFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yearTo?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  /** At least 3 product images (URLs). First image is primary. */
  @IsArray()
  @ArrayMinSize(MIN_LISTING_IMAGES, {
    message: `At least ${MIN_LISTING_IMAGES} product images are required`,
  })
  @ArrayMaxSize(MAX_LISTING_IMAGES)
  @IsString({ each: true })
  @Matches(MEDIA_URL, {
    each: true,
    message: 'Each image must be a URL or /uploads/… path',
  })
  images!: string[];
}

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsOptional()
  @IsEnum(PartCondition)
  condition?: PartCondition;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  compareAtPrice?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  partType?: string;

  @IsOptional()
  @IsString()
  engine?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  warrantyMonths?: number;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yearFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yearTo?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** When provided, must include at least 3 image URLs (replaces existing images) */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(MIN_LISTING_IMAGES, {
    message: `At least ${MIN_LISTING_IMAGES} product images are required`,
  })
  @ArrayMaxSize(MAX_LISTING_IMAGES)
  @IsString({ each: true })
  @Matches(MEDIA_URL, {
    each: true,
    message: 'Each image must be a URL or /uploads/… path',
  })
  images?: string[];
}
