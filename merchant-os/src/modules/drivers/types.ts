import type { DriverStatus, VehicleType } from '@prisma/client';
export type { DriverStatus, VehicleType };

export const DRIVER_STATUS_CONFIG: Record<DriverStatus, { label: string; color: string; dot: string }> = {
  OFFLINE:  { label: 'غير متصل',  color: 'bg-stone-100 text-stone-600',    dot: 'bg-stone-400' },
  ONLINE:   { label: 'متاح',      color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  BUSY:     { label: 'مشغول',     color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
  ON_BREAK: { label: 'استراحة',   color: 'bg-blue-100 text-blue-600',       dot: 'bg-blue-400' },
};

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  MOTORCYCLE: '🏍️ دراجة نارية',
  CAR:        '🚗 سيارة',
  BICYCLE:    '🚲 دراجة',
  VAN:        '🚐 فان',
};

export interface DriverSummary {
  id: string;
  name: string;
  phone: string;
  vehicleType: VehicleType;
  vehiclePlate: string | null;
  status: DriverStatus;
  isActive: boolean;
  isVerified: boolean;
  rating: number;
  totalDeliveries: number;
  currentLat: number | null;
  currentLng: number | null;
  lastSeenAt: Date | null;
  activeOrderId?: string | null;
}
