/** Billing follows the saved business market, never browser location or currency. */
export function paymentProviderForMarket(market: string | null | undefined): 'PAYMOB' | 'STRIPE' {
  return market === 'SA' ? 'PAYMOB' : 'STRIPE';
}
