# Assisted sales and negotiated checkout

Business merchants can turn a WhatsApp agreement into a priced offer and a guest checkout link. The merchant workspace is `/dashboard/sales`; the private customer page is `/pay/<token>`. Prices in the public catalog remain unchanged.

## Availability and team policy

The additive migration `20261126120000_assisted_sales` enables `assistedSales` on `SA_BUSINESS` and `BUSINESS` when present, and leaves other plans disabled. Platform operators can change the feature through the existing plan and merchant override editors. Staff seats still follow the plan limit.

Every staff operation rechecks active merchant membership, the current role and the merchant's sales policy. A staff member normally sees their own offers. The owner can grant visibility of all offers, approval authority, individual discount limits, or revoke sales access. Creating and approving offers also requires order creation permission. Only the owner changes the policy.

Discount checks apply to each line against its catalog price. Increasing another line's price cannot conceal an excessive discount. An offer above the staff limit needs approval by a different authorized person. Approval does not extend the offer's expiry. Revising an offer rotates its token, invalidates the old link and re-evaluates approval. A pending offer has no shareable token in the save response.

## Customer flow and payment

1. Staff selects products and quantities, enters the agreed unit prices and shipping charge, and chooses online payment or COD.
2. The workspace prepares a WhatsApp message using the merchant's template. Staff explicitly sends it; this feature does not automatically message customers.
3. The customer reviews the agreement without creating an account and enters the delivery city, district and address, or confirms the offer's pickup option.
4. Checkout validates current availability, locks the offer and creates one order through the existing inventory-aware order repository in the same database transaction.
5. Online checkout uses the existing market gateway and merchant eligibility checks. Payment completion is derived from the verified provider callback, never from the browser's return URL. A verified payment adds a deduplicated audit event and an in-app notification.
6. Repeated checkout requests reuse the same order and the gateway's existing payment attempt. The public page displays confirmed payment, cancellation, failure or refund states without opening a second charge.

The owner customizes the heading, offer terms, expiry, default shipping fee, available delivery/payment options and WhatsApp template. Supported placeholders are `{customer}`, `{store}`, `{total}`, `{currency}` and `{link}`. A link placeholder is required. Terms are snapshotted into each offer. The customer page uses the merchant's name, logo and primary color.

Prices entered here are final prices, including any applicable tax. This flow does not calculate tax or add a tax rate automatically; detailed tax invoicing is outside this change. Staff attribution is recorded, but automatic sales commission calculation or payout is not implemented.

## Locked amounts, stock and expiry

- Sending an offer does not reserve stock. Checkout checks and deducts tracked inventory atomically with order creation. Insufficient stock rolls back the order.
- Once an order exists, the agreed subtotal, shipping fee, discount, tax and total are immutable. Both application checks and a database trigger protect them, including writes from older shipping and order paths.
- Offer expiry limits when checkout can start. After order creation, the provider controls the payment session lifetime. An uncertain or expired provider attempt is not automatically recreated or cancelled, and stock is not automatically released while payment could still arrive. Use the existing order cancellation and payment reconciliation procedures.
- An unpaid online order cannot proceed to preparation or shipping. Its carrier COD amount is zero after online payment.
- Staff can switch an assisted COD order to online payment on the same order only while it is new, unpaid and has no shipment or provider shipping reference. Existing fulfilled, shipped or collected orders cannot be converted.
- Disabling the feature or losing the plan blocks new offers and unconverted checkout. Already-created orders remain payable at their locked amount.
- Public tokens use 32 random bytes. Public pages are excluded from indexing and caching and use a no-referrer policy. Treat the link as private access to that agreement.

## Phone usability

The employee flow is deliberately short: customer, products and agreed price, save, WhatsApp. Product buttons add a line in one tap, with search for larger catalogs. Optional expiry and notes are collapsed. Fields use 16px text and numeric input hints, and primary touch controls are at least 44px high. The total and save action remain visible in the dashboard's scroll container. Focusing an input scrolls it clear of that action bar. The successful save response immediately presents the correct WhatsApp link, even before the filtered offer list refreshes.

Actual components were exercised with synthetic data at 320×640, 360×800, 390×844, 430×932, 844×390 and 1440×1000, including product selection, negotiated total, delivery changes, preserved optional fields, settings and immediate sharing. A reduced 390×500 viewport checked that the focused price remains above the action bar. These browser simulations do not prove behavior of every physical mobile keyboard or that an installed WhatsApp app opens successfully.

Quote and settings forms save directly through their explicit save buttons. They opt out of the dashboard's generic submit-confirmation replay, which otherwise consumes the first submission. Destructive quote cancellation and COD conversion retain their separate confirmations. Server validation and role/price checks still run on every save.

## Release and verification

### Recipient details and delivery pin

The public `/pay/[token]` link lets the recipient review or correct the full name and international phone number before the order is created. Delivery fields include region/state, city, district, street/building and optional arrival instructions. These values and optional latitude/longitude are passed to the existing order repository, which persists the address in the delivery record. Price, shipping charge, products and currency remain locked to the seller's quote. Existing customer records are not renamed by a guest; recipient details are stored on the order. Once an order exists, revisiting the link resumes that order and cannot replace its contact details or delivery pin.

Location access starts only after the recipient presses the location button. The browser requests GPS permission and makes a client-side, no-credentials/no-referrer call to BigDataCloud's free reverse-geocode endpoint, as disclosed beside the button. Only coordinates are sent to that service, with the visitor's IP implicit in the connection; the private sale token, recipient name and phone are not sent. Region/city/locality can populate blank fields only. This provider returns locality information, not a guaranteed street/building address; missing district or street information must be entered and reviewed manually. No IP-based location fallback is accepted as the delivery pin. GPS denial keeps manual entry available; reverse-geocoding failure retains the pin while asking for manual address entry. The pin has a Google Maps review link and a removal action. No new API key or schema migration is required.

Provider reference: https://www.bigdatacloud.com/docs/free-api/free-reverse-geocode-to-city-api . Regression tests validate finite paired coordinates and contact normalization, assert order-repository forwarding, and check real database persistence with immutable details on retry. Run these and mobile/desktop browser acceptance before promotion; implementation in source alone does not mean this addition is live.

The schema change is additive: three tables, indexes, plan entitlement updates and an order amount guard. It does not change subscription prices, gateway secrets, merchant identity decisions or carrier configuration. Apply it once through the explicit migration process before the candidate receives traffic; web instances do not migrate on startup.

Keep assisted sales pages, checkout APIs and fulfillment on the compatible financial implementation when routing older browser versions. Preserve the previous immutable web image and the existing authentication/encryption keys. Rolling back the UI must not restore a database snapshot or discard newer orders. The financial pin must continue serving the implementation that understands assisted orders and their payment links.

Unit tests cover price boundaries, role and tenant isolation, approvals, token rotation, expiry, gateway readiness, retry identity and COD conversion. `checkout.integration.test.ts` requires a separate migrated `wasla_*test` database and synthetic accounts. It exercises simultaneous checkout, one order/stock deduction, immutable totals, expired links and revised tokens. Gateway calls are mocked; no real charge or customer message is required. Run the full existing unit, integration, lint, build and immutable-image acceptance gates before promotion. Record production release identity and actual validation separately in the private operations evidence.
