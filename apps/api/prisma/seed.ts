import { PrismaClient, PartCondition, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SpareBolt…');

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sparebolt.tz' },
    update: {},
    create: {
      email: 'admin@sparebolt.tz',
      phone: '+255700000001',
      passwordHash,
      firstName: 'Admin',
      lastName: 'SpareBolt',
      role: Role.ADMIN,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@sparebolt.tz' },
    update: {},
    create: {
      email: 'customer@sparebolt.tz',
      phone: '+255700000002',
      passwordHash,
      firstName: 'Amina',
      lastName: 'Mwangi',
      role: Role.CUSTOMER,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const sellerUser = await prisma.user.upsert({
    where: { email: 'seller@sparebolt.tz' },
    update: {},
    create: {
      email: 'seller@sparebolt.tz',
      phone: '+255700000003',
      passwordHash,
      firstName: 'Juma',
      lastName: 'Hassan',
      role: Role.SELLER,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@sparebolt.tz' },
    update: {},
    create: {
      email: 'driver@sparebolt.tz',
      phone: '+255700000004',
      passwordHash,
      firstName: 'Baraka',
      lastName: 'Kimaro',
      role: Role.DRIVER,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const seller = await prisma.sellerProfile.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: {
      userId: sellerUser.id,
      businessName: 'Juma Auto Parts',
      description: 'Genuine & quality used parts for Japanese and European cars.',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      latitude: -6.7924,
      longitude: 39.2083,
      status: 'APPROVED',
      ratingAvg: 4.7,
      ratingCount: 23,
    },
  });

  await prisma.driverProfile.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      vehicleType: 'motorcycle',
      vehiclePlate: 'T 123 ABC',
      licenseNumber: 'DL-DSM-44521',
      licenseVerified: true,
      city: 'Dar es Salaam',
      latitude: -6.8,
      longitude: 39.28,
      isOnline: true,
      status: 'APPROVED',
      ratingAvg: 4.9,
      ratingCount: 41,
    },
  });

  await prisma.address.create({
    data: {
      userId: customer.id,
      label: 'Home',
      street: 'Mikocheni Light Industrial Area',
      area: 'Mikocheni',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      latitude: -6.765,
      longitude: 39.25,
      isDefault: true,
    },
  });

  const categories = [
    { nameEn: 'Engine', nameSw: 'Injini', slug: 'engine', icon: 'engine', sortOrder: 1 },
    { nameEn: 'Brakes', nameSw: 'Breki', slug: 'brakes', icon: 'brakes', sortOrder: 2 },
    { nameEn: 'Suspension', nameSw: 'Suspension', slug: 'suspension', icon: 'suspension', sortOrder: 3 },
    { nameEn: 'Electrical', nameSw: 'Umeme', slug: 'electrical', icon: 'electrical', sortOrder: 4 },
    { nameEn: 'Body & Exterior', nameSw: 'Mwili', slug: 'body', icon: 'body', sortOrder: 5 },
    { nameEn: 'Filters & Fluids', nameSw: 'Vichujio', slug: 'filters', icon: 'filters', sortOrder: 6 },
    { nameEn: 'Tyres & Wheels', nameSw: 'Tairi', slug: 'tyres', icon: 'tyres', sortOrder: 7 },
    { nameEn: 'Lighting', nameSw: 'Taa', slug: 'lighting', icon: 'lighting', sortOrder: 8 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  const makes = [
    {
      name: 'Toyota',
      models: ['Corolla', 'Hilux', 'Rav4', 'Land Cruiser', 'Vitz', 'Wish'],
    },
    {
      name: 'Nissan',
      models: ['X-Trail', 'Navara', 'Note', 'Tiida', 'Patrol'],
    },
    {
      name: 'Honda',
      models: ['Fit', 'CR-V', 'Civic', 'Accord'],
    },
    {
      name: 'Mitsubishi',
      models: ['Lancer', 'Pajero', 'Outlander', 'Canter'],
    },
    {
      name: 'Isuzu',
      models: ['D-Max', 'NQR', 'Elf'],
    },
  ];

  for (const m of makes) {
    const make = await prisma.vehicleMake.upsert({
      where: { name: m.name },
      update: {},
      create: { name: m.name },
    });
    for (const modelName of m.models) {
      await prisma.vehicleModel.upsert({
        where: { makeId_name: { makeId: make.id, name: modelName } },
        update: {},
        create: { makeId: make.id, name: modelName },
      });
    }
  }

  const allCats = await prisma.category.findMany();
  const cat = (slug: string) => allCats.find((c) => c.slug === slug)!.id;

  const listings = [
    {
      title: 'Toyota Hilux Front Brake Pads (OEM)',
      description:
        'Genuine-quality ceramic brake pads for Toyota Hilux 2015–2022. Low dust, quiet braking. Includes fitting hardware.',
      partNumber: '04465-0K280',
      condition: PartCondition.NEW,
      price: 85000,
      quantity: 12,
      make: 'Toyota',
      model: 'Hilux',
      yearFrom: 2015,
      yearTo: 2022,
      categoryId: cat('brakes'),
      // Use stable Unsplash photo IDs only (invalid IDs return 404 and blank UI)
      images: [
        'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80',
      ],
    },
    {
      title: 'Oil Filter – Toyota Corolla 1.8',
      description:
        'High-efficiency oil filter compatible with Corolla 2008–2018 1NZ/2ZR engines. Protects your engine on Tanzanian roads.',
      partNumber: '90915-YZZD3',
      condition: PartCondition.NEW,
      price: 18000,
      quantity: 40,
      make: 'Toyota',
      model: 'Corolla',
      yearFrom: 2008,
      yearTo: 2018,
      categoryId: cat('filters'),
      images: [
        'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=800&q=80',
        'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
      ],
    },
    {
      title: 'Used Alternator – Nissan X-Trail T31',
      description:
        'Tested used alternator, 12V 110A. Bench tested and guaranteed 30 days. Ideal budget replacement.',
      partNumber: '23100-JG00A',
      condition: PartCondition.USED,
      price: 120000,
      quantity: 2,
      make: 'Nissan',
      model: 'X-Trail',
      yearFrom: 2007,
      yearTo: 2013,
      categoryId: cat('electrical'),
      images: [
        'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80',
      ],
    },
    {
      title: 'Shock Absorber Pair – Honda Fit GE',
      description:
        'Refurbished front shocks for Honda Fit 2008–2013. Restored ride quality after pothole damage.',
      condition: PartCondition.REFURBISHED,
      price: 95000,
      quantity: 4,
      make: 'Honda',
      model: 'Fit',
      yearFrom: 2008,
      yearTo: 2013,
      categoryId: cat('suspension'),
      images: [
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80',
      ],
    },
    {
      title: 'Headlight Assembly LH – Toyota Land Cruiser 200',
      description:
        'Left-hand headlight for Land Cruiser 200 series. Clear lens, new bulbs included. OEM-style fitment.',
      condition: PartCondition.NEW,
      price: 280000,
      quantity: 3,
      make: 'Toyota',
      model: 'Land Cruiser',
      yearFrom: 2008,
      yearTo: 2015,
      categoryId: cat('lighting'),
      images: [
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
      ],
    },
    {
      title: 'Timing Belt Kit – Mitsubishi Lancer 4G15',
      description:
        'Complete timing belt kit with tensioner and water pump. Critical maintenance part — install before failure.',
      partNumber: 'MD182293',
      condition: PartCondition.NEW,
      price: 145000,
      quantity: 6,
      make: 'Mitsubishi',
      model: 'Lancer',
      yearFrom: 2000,
      yearTo: 2010,
      categoryId: cat('engine'),
      images: [
        'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&q=80',
      ],
    },
    {
      title: 'All-Terrain Tyre 265/70R16 (Set of 4)',
      description:
        'Durable AT tyres for Hilux, D-Max, Navara. Excellent for city + rough roads. Free balancing at partner shop.',
      condition: PartCondition.NEW,
      price: 520000,
      quantity: 8,
      make: 'Toyota',
      model: 'Hilux',
      yearFrom: 2010,
      yearTo: 2024,
      categoryId: cat('tyres'),
      images: [
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80',
      ],
    },
    {
      title: 'Side Mirror RH Electric – Isuzu D-Max',
      description:
        'Right-side electric folding mirror with indicator. Paint-ready housing.',
      condition: PartCondition.NEW,
      price: 110000,
      quantity: 5,
      make: 'Isuzu',
      model: 'D-Max',
      yearFrom: 2012,
      yearTo: 2020,
      categoryId: cat('body'),
      images: [
        'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80',
      ],
    },
  ];

  const existingCount = await prisma.listing.count();
  if (existingCount === 0) {
    for (const l of listings) {
      const { images, ...data } = l;
      await prisma.listing.create({
        data: {
          ...data,
          sellerId: seller.id,
          city: 'Dar es Salaam',
          latitude: -6.7924,
          longitude: 39.2083,
          currency: 'TZS',
          images: {
            create: images.map((url, i) => ({
              url,
              sortOrder: i,
              isPrimary: i === 0,
            })),
          },
        },
      });
    }
  }

  // Home carousel promos (3 active ads for seller product promotion)
  const promoCount = await prisma.promoAd.count();
  if (promoCount === 0) {
    const topListings = await prisma.listing.findMany({
      take: 3,
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'asc' },
    });

    const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const promoCopy = [
      {
        title: 'Hilux brake pads — OEM quality',
        subtitle: 'Stop safer. Free city delivery this week.',
        ctaLabel: 'View deal',
      },
      {
        title: 'Tyre sets from 520,000 TZS',
        subtitle: 'All-terrain rubber for Dar roads.',
        ctaLabel: 'Shop tyres',
      },
      {
        title: 'Genuine filters & engine kits',
        subtitle: 'Protect your engine — trusted sellers only.',
        ctaLabel: 'Browse now',
      },
    ];

    for (let i = 0; i < Math.min(3, topListings.length); i++) {
      const listing = topListings[i];
      await prisma.promoAd.create({
        data: {
          sellerId: seller.id,
          listingId: listing.id,
          title: promoCopy[i]?.title || listing.title,
          subtitle: promoCopy[i]?.subtitle,
          imageUrl:
            listing.images[0]?.url ||
            'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200&q=80',
          ctaLabel: promoCopy[i]?.ctaLabel || 'Shop now',
          package: i === 0 ? 'PREMIUM' : i === 1 ? 'STANDARD' : 'STARTER',
          status: 'ACTIVE',
          sortOrder: i,
          endsAt,
          pricePaid: i === 0 ? 75000 : i === 1 ? 35000 : 15000,
        },
      });
    }
  }

  console.log('Seed complete.');
  console.log('Demo accounts (password: password123):');
  console.log('  admin@sparebolt.tz');
  console.log('  customer@sparebolt.tz');
  console.log('  seller@sparebolt.tz');
  console.log('  driver@sparebolt.tz');
  console.log(`Admin id: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
