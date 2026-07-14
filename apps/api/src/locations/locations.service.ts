import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  regions() {
    return this.prisma.region.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    });
  }

  async districts(regionId?: string, q?: string) {
    return this.prisma.district.findMany({
      where: {
        ...(regionId ? { regionId } : {}),
        ...(q
          ? { name: { contains: q, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        regionId: true,
        region: { select: { id: true, name: true } },
      },
      take: 200,
    });
  }

  async wards(districtId: string, q?: string) {
    const district = await this.prisma.district.findUnique({
      where: { id: districtId },
    });
    if (!district) throw new NotFoundException('District not found');

    return this.prisma.ward.findMany({
      where: {
        districtId,
        ...(q
          ? { name: { contains: q, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, districtId: true },
    });
  }

  /** Flat list of district names for simple city pickers */
  async districtNames() {
    const rows = await this.prisma.district.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        region: { select: { name: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      region: r.region.name,
      label: `${r.name}, ${r.region.name}`,
    }));
  }
}
