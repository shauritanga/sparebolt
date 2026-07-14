import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateListingDto,
  MIN_LISTING_IMAGES,
  SearchListingsDto,
  UpdateListingDto,
} from './dto/listings.dto';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async search(query: SearchListingsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.ListingWhereInput = {
      isActive: true,
      quantity: { gt: 0 },
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { partNumber: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.make) where.make = { equals: query.make, mode: 'insensitive' };
    if (query.model) where.model = { equals: query.model, mode: 'insensitive' };
    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    if (query.condition) where.condition = query.condition;
    if (query.minPrice || query.maxPrice) {
      where.price = {};
      if (query.minPrice) where.price.gte = query.minPrice;
      if (query.maxPrice) where.price.lte = query.maxPrice;
    }
    if (query.year) {
      where.AND = [
        {
          OR: [{ yearFrom: null }, { yearFrom: { lte: query.year } }],
        },
        {
          OR: [{ yearTo: null }, { yearTo: { gte: query.year } }],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          category: true,
          seller: {
            select: {
              id: true,
              businessName: true,
              city: true,
              ratingAvg: true,
              ratingCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        seller: {
          include: {
            user: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    await this.prisma.listing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return listing;
  }

  private normalizeImageUrls(images: string[]) {
    const cleaned = [
      ...new Set(
        images
          .map((u) => u?.trim())
          .filter((u): u is string => Boolean(u && u.length > 0)),
      ),
    ];
    if (cleaned.length < MIN_LISTING_IMAGES) {
      throw new BadRequestException(
        `At least ${MIN_LISTING_IMAGES} product images are required`,
      );
    }
    return cleaned;
  }

  async create(userId: string, dto: CreateListingDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller || seller.status !== 'APPROVED') {
      throw new ForbiddenException('Approved seller profile required');
    }

    const imageUrls = this.normalizeImageUrls(dto.images);

    return this.prisma.listing.create({
      data: {
        sellerId: seller.id,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        partNumber: dto.partNumber,
        condition: dto.condition,
        price: dto.price,
        compareAtPrice:
          dto.compareAtPrice != null && dto.compareAtPrice > dto.price
            ? dto.compareAtPrice
            : null,
        quantity: dto.quantity,
        manufacturer: dto.manufacturer,
        brand: dto.brand,
        partType: dto.partType,
        engine: dto.engine,
        warrantyMonths: dto.warrantyMonths,
        make: dto.make,
        model: dto.model,
        yearFrom: dto.yearFrom,
        yearTo: dto.yearTo,
        city: dto.city || seller.city,
        latitude: dto.latitude ?? seller.latitude,
        longitude: dto.longitude ?? seller.longitude,
        images: {
          create: imageUrls.map((url, i) => ({
            url,
            sortOrder: i,
            isPrimary: i === 0,
          })),
        },
      },
      include: { images: true, category: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateListingDto) {
    const listing = await this.getOwnedListing(userId, id);

    if (dto.images) {
      const imageUrls = this.normalizeImageUrls(dto.images);
      await this.prisma.$transaction([
        this.prisma.listingImage.deleteMany({ where: { listingId: id } }),
        this.prisma.listingImage.createMany({
          data: imageUrls.map((url, i) => ({
            listingId: id,
            url,
            sortOrder: i,
            isPrimary: i === 0,
          })),
        }),
      ]);
    }

    return this.prisma.listing.update({
      where: { id: listing.id },
      data: {
        title: dto.title,
        description: dto.description,
        partNumber: dto.partNumber,
        condition: dto.condition,
        price: dto.price,
        compareAtPrice:
          dto.compareAtPrice === null
            ? null
            : dto.compareAtPrice !== undefined
              ? dto.compareAtPrice
              : undefined,
        quantity: dto.quantity,
        manufacturer: dto.manufacturer,
        brand: dto.brand,
        partType: dto.partType,
        engine: dto.engine,
        warrantyMonths: dto.warrantyMonths,
        make: dto.make,
        model: dto.model,
        yearFrom: dto.yearFrom,
        yearTo: dto.yearTo,
        city: dto.city,
        isActive: dto.isActive,
      },
      include: { images: true },
    });
  }

  async remove(userId: string, id: string) {
    const listing = await this.getOwnedListing(userId, id);
    return this.prisma.listing.update({
      where: { id: listing.id },
      data: { isActive: false },
    });
  }

  async myListings(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) return [];
    return this.prisma.listing.findMany({
      where: { sellerId: seller.id },
      include: { images: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async categories() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { children: true },
      where: { parentId: null },
    });
  }

  async vehicleMakes() {
    return this.prisma.vehicleMake.findMany({
      include: { models: true },
      orderBy: { name: 'asc' },
    });
  }

  private async getOwnedListing(userId: string, listingId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) throw new ForbiddenException();

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing || listing.sellerId !== seller.id) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }
}
