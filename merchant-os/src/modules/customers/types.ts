import type { Customer, CustomerAddress } from '@prisma/client';

// ============================================================================
// Customers Module — Types
// ============================================================================

/** Customer with order count */
export interface CustomerWithStats extends Customer {
  _count: { orders: number };
}

/** Customer with addresses and order count */
export interface CustomerFull extends Customer {
  addresses: CustomerAddress[];
  _count: { orders: number };
}

export type { Customer, CustomerAddress };
