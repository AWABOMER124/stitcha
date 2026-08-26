import { describe, expect, it } from "vitest";
import { calculateDeliveryPrice } from "./delivery-pricing.service";

const rule = {
  baseFee: "500",
  perKmFee: "120",
  minimumFee: "700",
  maximumFee: "1500",
  maxDistanceKm: 10,
  currency: "SDG",
};

describe("calculateDeliveryPrice", () => {
  it("applies the minimum, distance price, and maximum cap", () => {
    expect(calculateDeliveryPrice(rule, 0)?.amount).toBe(700);
    expect(calculateDeliveryPrice(rule, 5)?.amount).toBe(1100);
    expect(calculateDeliveryPrice(rule, 9)?.amount).toBe(1500);
  });

  it("returns null when the rule does not cover the distance", () => {
    expect(calculateDeliveryPrice(rule, 10.01)).toBeNull();
  });

  it("rejects invalid distance and contradictory limits", () => {
    expect(() => calculateDeliveryPrice(rule, -1)).toThrow(/distance/);
    expect(() =>
      calculateDeliveryPrice({ ...rule, minimumFee: 900, maximumFee: 800 }, 1),
    ).toThrow(/maximum fee/);
  });
});
