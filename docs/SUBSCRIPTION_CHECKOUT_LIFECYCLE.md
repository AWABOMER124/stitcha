# Subscription payment lifecycle

The selected plan opens a dedicated checkout with two explicit methods: online payment with automatic activation, or bank transfer with private evidence and administrator verification. Transfer accounts are filtered by quote currency. SAR quotes stay in SAR; Sudan USD quotes retain the configured SDG conversion. Monthly and annual quotes retain their selected duration.

The authenticated checkout status endpoint owns all transitions. Provider return parameters never establish payment success. Signed callbacks remain the primary activation path. Authenticated provider inquiries recover missed confirmations, using the same amount, currency, market, integration, mode, ownership and idempotency checks. The private worker also checks pending subscriptions after the browser closes. The browser polls every 15 seconds while visible, and displays explicit status, manual refresh, and support when confirmation is delayed.

| State | Merchant experience |
| --- | --- |
| Choose | Explicit online / bank transfer selection |
| Awaiting payment | Continue the existing hosted payment page |
| Declined, hosted page still live | Explain that payment did not complete; retry the same hosted page |
| Checking | Automatically verify; do not allow another payment method concurrently |
| Manual review | Receipt received, waiting for administrator to verify bank receipt |
| Active | Payment confirmed and plan activated; dashboard link |
| Final decline or expired session | Clear non-completion message and explicit retry |

Retry creates a fresh plan request and preserves the previous attempt and receipt history. Merchant-level locks prevent concurrent online and manual paths. A browser cancellation or elapsed time alone cannot release an identifiable payment attempt. A narrowly scoped exception closes an expired *undelivered* Paymob creation: status UNKNOWN, no stored provider identity, no transaction, no encrypted checkout secret, expiration plus grace elapsed, and authenticated inquiry returns not-found. Creation cannot return a checkout URL unless READY was persisted. READY or identifiable attempts remain protected until resolved.

Bank transfer evidence is private, size/type validated, and cannot activate a plan. Authorized administrators review the receipt and bank receipt before approving. Duplicate approval is rejected. Approval activates the quoted interval and currency, with month-end date clamping and support for extending an existing manual subscription. Rejection records the reason and permits an explicit fresh attempt.

No provider names appear in the merchant payment controls. The Saudi legal beneficiary remains visible where relevant. Real beneficiary banking details belong only in protected production configuration, never this repository or fixtures. Tests use synthetic accounts and cannot charge a live card or change a production subscription.
