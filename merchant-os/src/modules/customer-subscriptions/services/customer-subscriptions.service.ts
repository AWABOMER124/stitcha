import { NotFoundError } from '@/lib/errors';
import * as repo from '../repositories/customer-subscriptions.repository';
import type { GrantSubscriptionInput } from '../schemas/customer-subscriptions.schemas';

export async function grantSubscription(grantedById: string, input: GrantSubscriptionInput) {
  const account = await repo.findAccountByPhone(input.customerPhone);
  if (!account) throw new NotFoundError('Customer account', input.customerPhone);

  return repo.createSubscription({
    customerAccountId: account.id,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    grantedById,
    notes: input.notes,
  });
}

export async function listSubscriptions() {
  const subs = await repo.listAll();
  const now = new Date();
  return subs.map((s) => ({
    ...s,
    isActive: s.status === 'ACTIVE' && new Date(s.startsAt) <= now && new Date(s.endsAt) >= now,
  }));
}

export async function cancelSubscription(id: string) {
  const result = await repo.cancelSubscription(id);
  if (result.count === 0) throw new NotFoundError('Subscription');
}

/** Whether a checkout for this CustomerAccount should waive its delivery fee. */
export function hasActiveDeliveryPerk(customerAccountId: string): Promise<boolean> {
  return repo.hasActive(customerAccountId);
}
