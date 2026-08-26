# Direct merchant, freemium, and delivery strategy

Updated: 2026-08-26

## Product decision

WASLA is transitioning from a distributor-led commerce model to a direct
merchant SaaS. A merchant can publish a useful store for free, pay monthly for
professional growth tools, and request delivery from platform-contracted
partners without needing a distributor intermediary.

| Plan | Reference price | Positioning |
|---|---:|---|
| Basic | Free | Storefront, essential orders, one branch, two seats, and up to 100 active products |
| Pro | USD 10/month equivalent | Growth, automation, advanced analytics, up to three branches and five seats |

The billed local-currency price must be displayed and locked for each billing
period. Delivery is available to both plans and monetized separately from the
merchant's sales value.

## Safe migration rules

1. Do not delete distributor data before every merchant, delivery, finance,
   and staff reference has been backfilled and verified.
2. Existing merchants are grandfathered on Pro at zero charge during the
   transition; new direct registrations start on Basic.
3. Real delivery operators become platform-owned `DeliveryPartner` records. A
   distributor record is never blindly converted.
4. SaaS invoices and delivery/COD settlements use separate ledgers.
5. Distributor registration is disabled before routes, roles, and tables are
   removed. Database removal happens in a later reversible release.

## Delivery target model

- `DeliveryPartner`: contracted company managed by platform operations.
- `DeliveryPartnerUser`: partner staff access.
- `Courier`: partner courier or independently contracted courier.
- `ServiceArea` and `DeliveryPricingRule`: coverage, capacity, and price.
- `DeliveryQuote`: expiring price/ETA snapshot accepted at checkout.
- `Shipment` and `DeliveryEvent`: fulfillment and immutable status history.
- `ProofOfDelivery` and `CODCollection`: evidence and cash custody.
- `DeliverySettlement`: partner-only settlement, separate from SaaS billing.

Provider selection starts as an auditable rules engine based on coverage,
vehicle, capacity, price, ETA, success rate, and SLA. AI may optimize later but
must not fabricate availability, price, or ETA.

### Implementation status

The first delivery-separation migration now creates platform-owned partners,
provider configuration, service areas, pricing rules, and couriers. It copies
legacy delivery companies and their integration credentials into shadow
records, but does not alter the live dispatch path. Only drivers already linked
to a delivery company are copied automatically; distributor-fleet drivers stay
unclassified until operations confirms their contractual owner. Migrated active
companies remain pending and COD support stays disabled until platform review.
A deterministic fee calculator is available for future quotes and rejects
uncovered distances.

The operational layer now includes expiring quotes, shipments, immutable
events, proof, COD custody, and partner settlements. Customer quote APIs derive
distance from stored pickup and destination coordinates, require ownership,
and remain fail-closed until `PLATFORM_DELIVERY_ENABLED=true`. Platform owners
can approve or suspend partners and explicitly enable COD. Distributor signup
is retired and the legacy portal defaults off. Production cutover still requires
record-count and balance reconciliation, a city pilot, and verified external
provider credentials; legacy tables remain intact as the rollback boundary.

## Delivery roadmap

### Phase 1 — SaaS foundation

- Add plans, subscriptions, status/grace fields, and typed entitlements.
- Seed Basic and Pro and backfill existing merchants safely.
- Assign Basic atomically during every merchant creation path.

### Phase 2 — Merchant experience

- Add current-plan, plan-comparison, and upgrade-request screens.
- Enforce limits in shared server guards, then mirror them in the UI.
- Add guided store launch and catalogue import.

### Phase 3 — Delivery separation

- Add delivery partner, service-area, quote, shipment, COD, and settlement models.
- Backfill verified operators and couriers from distributor-owned data.
- Cut delivery APIs and dispatch screens over to partner ownership.

### Phase 4 — Distributor retirement

- Stop distributor registration and onboarding.
- Redirect or retire distributor routes after verified cutover.
- Remove distributor roles and session context.
- Archive and then drop obsolete commission and settlement structures.

### Phase 5 — Billing and pilot

- Connect one licensed payment provider and implement upgrade, renewal, grace,
  cancellation, and safe downgrade.
- Pilot one vertical in one city with 20–30 merchants and at least two delivery
  partners before marketplace expansion.

## Release metrics

- Merchant publishes within 15 minutes of signup.
- At least 60% of signups publish a store.
- At least 25% of activated merchants fulfill an order weekly.
- Free-to-Pro conversion reaches 5–10% during the first three months.
- Delivery success is at least 95%, with at least 90% on time.
- Delivery contribution margin remains positive after support and compensation.
