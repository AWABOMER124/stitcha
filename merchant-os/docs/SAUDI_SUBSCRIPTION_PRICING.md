# Saudi subscription catalog

Owner approved prices on 2026-11-19:

| Plan | Monthly SAR | Yearly SAR |
| --- | ---: | ---: |
| SA_GROWTH | 49 | 490 |
| SA_PRO | 99 | 990 |
| SA_BUSINESS | 199 | 1990 |

FREE remains available in both markets. Growth and Pro reuse the existing supported feature definitions. Business raises supported quotas to 5,000 products, 200 categories, 20 staff, 5 branches, 40 store generations, 1,000 AI store edits, 4,000 merchant chats, 200 image enhancements and 4,000 WhatsApp AI replies monthly. These are software limits, not new fulfillment or support commitments.

## Market selection

Visitors select Sudan or Saudi Arabia on the home pricing section (`/?market=SD#pricing` or `/?market=SA#pricing`). Signup links preserve that choice; the registration form explicitly confirms the business market. The server validates and persists `Merchant.subscriptionMarket`. Phone country, nationality, language, IP address and storefront currency do not choose subscription prices.

Signed-in merchants see their stored business market. Existing merchants default to SD, and their prices, subscriptions and storefront currencies are not rewritten. New Saudi merchants start with SAR storefront currency and Asia/Riyadh timezone, separately from the subscription market. Changing a live merchant's business market is a support operation; query parameters cannot change it.

## Billing

The public catalog and server-side plan-change validation use the same market boundary. New requests persist amount, currency and monthly/yearly interval. Subsequent catalog edits do not change an existing request's terms. Saudi annual checkout charges the yearly total once per year, not the monthly price. Stripe completion must match the locked amount and currency before activation. Provider period end is retained for annual subscriptions.

Saudi subscriptions use online checkout; Sudan-only manual transfer accounts are not offered for SAR and unsupported annual manual payments are rejected. Legacy monthly Sudan transfers remain available. Shipping and COD fees are separate from subscription prices. This change does not introduce new tax calculations or activate Saudi carrier or legal-seller integrations.

## Release

Apply the additive `20261119093000_saudi_subscription_catalog` migration through the explicit migrator before routing traffic to this version. It adds market and quote fields and three Saudi catalog rows. It does not update existing paid plan prices or subscriptions. Keep the previous image available for rollback; the new columns are additive. Use the protected release process for production activation.

Saudi rows use `isMarketPublic` for visibility and keep legacy `isPublic=false`. This prevents the previous application from exposing them to Sudan merchants during the migration window or rollback. The admin editor maps Saudi visibility to the new flag and preserves the legacy flag as false.

Validation includes catalog isolation against PostgreSQL, phone/market independence at signup, monthly and annual amounts, immutable quotes after catalog edits, Stripe yearly payload, rejected mismatched payments, and annual activation. Tests use synthetic data and mocked Stripe responses; they do not prove a live card payment.
