import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      if (!path.startsWith('/auth') && !path.startsWith('/browse')) {
        // soft logout only on protected routes failures
      }
    }
    return Promise.reject(error);
  },
);

export type User = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'SELLER' | 'DRIVER' | 'ADMIN';
  avatarUrl?: string | null;
  locale?: string;
  sellerProfile?: SellerProfile | null;
  driverProfile?: DriverProfile | null;
  addresses?: Address[];
};

export type SellerProfile = {
  id: string;
  businessName: string;
  city: string;
  ratingAvg: number;
  ratingCount: number;
  status: string;
  legalFullName?: string | null;
  nationalId?: string | null;
  payoutAccountName?: string | null;
  rejectionReason?: string | null;
  businessType?: string | null;
};

export type DriverProfile = {
  id: string;
  vehicleType: string;
  vehiclePlate: string;
  city: string;
  isOnline: boolean;
  ratingAvg: number;
  status: string;
  legalFullName?: string | null;
  nationalId?: string | null;
  licenseNumber?: string;
  licenseVerified?: boolean;
  payoutAccountName?: string | null;
  rejectionReason?: string | null;
};

export type Address = {
  id: string;
  label: string;
  street: string;
  area?: string;
  city: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
};

export type Category = {
  id: string;
  nameEn: string;
  nameSw: string;
  slug: string;
  icon?: string;
  children?: Category[];
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  partNumber?: string | null;
  condition: 'NEW' | 'USED' | 'REFURBISHED';
  price: string | number;
  compareAtPrice?: string | number | null;
  currency: string;
  quantity: number;
  isActive?: boolean;
  manufacturer?: string | null;
  brand?: string | null;
  partType?: string | null;
  engine?: string | null;
  warrantyMonths?: number | null;
  make?: string | null;
  model?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  city: string;
  viewCount: number;
  images: { id: string; url: string; isPrimary: boolean }[];
  category?: Category;
  seller?: {
    id: string;
    businessName: string;
    city: string;
    ratingAvg: number;
    ratingCount: number;
    user?: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string | null;
    };
  };
};

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string | number;
  deliveryFee: string | number;
  platformFee: string | number;
  total: string | number;
  currency: string;
  createdAt: string;
  items: {
    id: string;
    title: string;
    unitPrice: string | number;
    quantity: number;
    lineTotal: string | number;
    sellerId: string;
  }[];
  payment?: { status: string; method?: string };
  escrow?: { status: string; amount: string | number };
  delivery?: {
    id: string;
    status: string;
    driverId?: string;
    currentLat?: number;
    currentLng?: number;
  };
  address?: Address;
};
