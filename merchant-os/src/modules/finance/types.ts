import type { CommissionType, TransactionType, TransactionDirection, SettlementStatus } from '@prisma/client';

export type { CommissionType, TransactionType, TransactionDirection, SettlementStatus };

export interface FinanceSummary {
  totalMerchants: number;
  activeMerchants: number;
  totalRevenue: number;
  totalFees: number;
  totalCommissions: number;
  pendingSettlements: number;
  currency: string;
}

export interface MerchantFinanceSummary {
  merchantId: string;
  merchantName: string;
  totalOrders: number;
  totalRevenue: number;
  commission: number;
  netAmount: number;
  lastSettlement: Date | null;
}

export interface CreateCommissionPlanInput {
  name: string;
  description?: string;
  type: CommissionType;
  rate: number;
  minFee?: number;
  currency?: string;
  isDefault?: boolean;
}

export interface UpdateCommissionPlanInput extends Partial<CreateCommissionPlanInput> {
  isActive?: boolean;
}

export interface CreateSettlementInput {
  merchantId: string;
  periodFrom: Date;
  periodTo: Date;
  notes?: string;
}

export interface CreateDeliveryZoneInput {
  name: string;
  description?: string;
  baseFee: number;
  perKmFee?: number;
  maxDistanceKm?: number;
  estimatedTime?: string;
  currency?: string;
  sortOrder?: number;
}

export interface UpdateDeliveryZoneInput extends Partial<CreateDeliveryZoneInput> {
  isActive?: boolean;
}
