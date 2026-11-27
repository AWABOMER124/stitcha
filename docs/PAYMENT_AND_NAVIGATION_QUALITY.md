# Payment and navigation quality

Store online payments require an effective paid-tier subscription as well as the existing merchant verification and payout requirements. FREE is denied even when custom feature overrides exist. Expired subscriptions fall back to FREE through the existing plan snapshot. Zero-price negotiated/grandfathered paid tiers retain their paid-tier classification. The subscription-upgrade checkout is deliberately separate and remains available to free merchants.

The storefront, direct order checkout and assisted-sale payment routes use this policy. Cash payments and manual transfers are unaffected. Provider callbacks for existing payments remain enabled; a downgrade must never discard an incoming payment confirmation or refund event.

Customer-facing payment controls use WASLA wording. Keep the legal seller, currency, exchange-rate explanation and confirmation rules visible. Do not describe the redirect back from a provider as proof of payment. Network failures show localized instructions without automatically replaying a payment request. Unconfirmed attempts block an additional online checkout or transfer until reconciled.

A production trace showed a route fetch failing with `net::ERR_QUIC_PROTOCOL_ERROR.QUIC_TOO_MANY_RTOS` over h3 after response headers arrived. WASLA responds with `Alt-Svc: clear`, invalidating alternative-service advertisements for its origins, without disabling TLS or changing other services. Both the application headers and WASLA release routing retain this policy. See [RFC 7838](https://www.rfc-editor.org/rfc/rfc7838#section-3).

Sidebar links disable automatic bulk prefetch and show a fixed-size pending indicator. The app shell stays mounted while the selected route loads. Do not retry mutations to compensate for a network outage.

Validate the policy against an isolated database, including a verified free merchant, paid merchant, expired subscription and free-to-paid subscription checkout. Browser acceptance must use one click per link and inspect both navigation completion and network failures. A 200 response alone does not prove a streamed route body arrived.

Provider reconciliation follows the [official transaction inquiry reference](https://developers.paymob.com/paymob-docs/developers/transaction-inquiry-apis/transaction-inquiry/by-order-id-or-reference). An inquiry that finds no transaction is not sufficient evidence by itself to retry an ambiguous intention. Preserve the original attempt and references for investigation.
