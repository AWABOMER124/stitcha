type NumericValue = number | string | { toString(): string };

export interface DeliveryPricingRule {
  baseFee: NumericValue;
  perKmFee: NumericValue;
  minimumFee: NumericValue;
  maximumFee?: NumericValue | null;
  maxDistanceKm?: number | null;
  currency: string;
}

export interface DeliveryPriceQuote {
  amount: number;
  currency: string;
  distanceKm: number;
}

function asFiniteNumber(value: NumericValue, field: string): number {
  const parsed = Number(value.toString());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid non-negative delivery pricing value: ${field}`);
  }
  return parsed;
}

/**
 * Produces a deterministic quote for one eligible rule. A null result means
 * that the trip exceeds the rule's service distance and another rule/partner
 * should be considered. This does not mutate orders or reserve a courier.
 */
export function calculateDeliveryPrice(
  rule: DeliveryPricingRule,
  distanceKm: number,
): DeliveryPriceQuote | null {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new Error("Delivery distance must be a non-negative number");
  }
  if (rule.maxDistanceKm != null && distanceKm > rule.maxDistanceKm) {
    return null;
  }

  const baseFee = asFiniteNumber(rule.baseFee, "baseFee");
  const perKmFee = asFiniteNumber(rule.perKmFee, "perKmFee");
  const minimumFee = asFiniteNumber(rule.minimumFee, "minimumFee");
  const maximumFee =
    rule.maximumFee == null
      ? null
      : asFiniteNumber(rule.maximumFee, "maximumFee");

  if (maximumFee != null && maximumFee < minimumFee) {
    throw new Error("Delivery maximum fee cannot be less than minimum fee");
  }

  let amount = Math.max(baseFee + perKmFee * distanceKm, minimumFee);
  if (maximumFee != null) amount = Math.min(amount, maximumFee);

  return {
    amount: Math.round((amount + Number.EPSILON) * 100) / 100,
    currency: rule.currency,
    distanceKm,
  };
}
