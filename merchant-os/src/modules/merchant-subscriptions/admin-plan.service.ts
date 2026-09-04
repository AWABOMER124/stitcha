import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { parseEntitlements } from './entitlements';
import { PLAN_BOOLEAN_FIELDS, PLAN_LIMIT_FIELDS } from './plan-fields';

const updatePlanSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500),
  monthlyPrice: z.coerce.number().min(0).max(1_000_000),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
  isPublic: z.boolean(),
  isActive: z.boolean(),
  limits: z.record(z.string(), z.coerce.number().int().min(-1).max(1_000_000)),
  flags: z.record(z.string(), z.boolean()),
});

export type AdminPlanUpdate = z.infer<typeof updatePlanSchema>;

export async function listAdminMerchantPlans() {
  const plans = await prisma.merchantPlan.findMany({ orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }] });
  return plans.map((plan) => ({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description ?? '',
    monthlyPrice: Number(plan.monthlyPrice),
    currency: plan.currency,
    sortOrder: plan.sortOrder,
    isPublic: plan.isPublic,
    isActive: plan.isActive,
    entitlements: parseEntitlements(plan.entitlements),
  }));
}

export async function updateAdminMerchantPlan(input: AdminPlanUpdate) {
  const parsed = updatePlanSchema.parse(input);
  const current = await prisma.merchantPlan.findUniqueOrThrow({ where: { id: parsed.id }, select: { entitlements: true } });
  const existing = typeof current.entitlements === 'object' && current.entitlements !== null && !Array.isArray(current.entitlements)
    ? current.entitlements as Prisma.JsonObject
    : {};
  const entitlements: Prisma.JsonObject = { ...existing };
  for (const key of PLAN_LIMIT_FIELDS) entitlements[key] = parsed.limits[key] ?? 0;
  for (const key of PLAN_BOOLEAN_FIELDS) entitlements[key] = parsed.flags[key] ?? false;

  return prisma.merchantPlan.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      description: parsed.description || null,
      monthlyPrice: parsed.monthlyPrice,
      currency: parsed.currency,
      sortOrder: parsed.sortOrder,
      isPublic: parsed.isPublic,
      isActive: parsed.isActive,
      entitlements,
    },
  });
}
