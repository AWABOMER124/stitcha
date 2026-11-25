# Subscription checkout and dashboard notifications

## Merchant journey

Every available paid plan has a Subscribe now button. After selecting a billing period, the button prepares a locked plan-change quote and navigates directly to `/dashboard/subscription/checkout?request=<id>`. Preparing a quote does not charge the merchant or activate a plan. The checkout shows the selected plan, period, currency, total and available payment methods. The plans screen retains a Continue to checkout link for unfinished selections.

Online payment activates only after the existing verified provider callback. A bank transfer still requires a private receipt and review. A pending transfer blocks duplicate checkout. Payment history remains on the subscription screen; AI usage streams separately so it does not hold up the plan catalog.

The merchant's persisted business market selects the gateway: Saudi Arabia uses Paymob in SAR; other supported markets use Stripe. An unavailable Paymob gateway never falls back to Stripe. Saudi prepaid renewals do not enable automatic renewal charges. Provider setup and a real financial acceptance test are separate from this UI change.

The exact quote ID travels through checkout and manual transfer submissions. Every lookup also includes the authenticated merchant and an open request status. Opening another plan in a different tab cannot silently change the plan charged from an earlier checkout. Legacy open tabs sending no quote ID keep their previous latest-open-request behavior. Only store owners and administrators can prepare or start payment.

## Notification delivery and navigation

Both dashboard topbars use `/api/notifications/summary` for a private, non-cacheable JSON summary. Visible pages refresh every five seconds; hidden pages pause polling and resume when visible. One in-flight summary request is allowed, with a ten-second timeout. Read-state updates use PATCH and do not hold up opening a notification destination.

The API derives merchant and user scope from the authenticated session. Staff retain the existing notification permission requirement. Platform notification permissions are checked independently. Marking merchant messages remains scoped by both merchant and personal recipient; client-supplied tenant overrides are rejected. Read-only polling does not use the sequential Server Action queue or re-render the current route.

Keep the deployment guard and financial route protections enabled. This change does not introduce cross-user page caching or relax authentication. Measure production navigation separately from a development server's first compilation.

## Verification

- Unit coverage includes anonymous/staff denial, tenant scope, same-origin updates, strict selections, direct redirect and legacy checkout requests.
- Database integration coverage verifies an older selected quote remains bound after a newer selection, and rejects using another merchant's quote.
- Browser checks cover desktop/mobile checkout and the absence of periodic notification Server Action requests.
- No real subscription purchase or charge is needed for these checks. Use an isolated database and synthetic accounts; do not configure real provider secrets in the test environment.

No database migration is required. Deploy through the protected immutable-image release workflow, validate the candidate, then switch traffic and retain the previous image for rollback. Record actual browser measurements and release IDs in the private deployment evidence.

## Navigation identity regression

A production-image browser trace exposed a second cause of full page loads: initial Flight data used a generated build ID while navigation responses identified the same image with APP_RELEASE. Next.js correctly treated those different identifiers as version skew and fell back to document navigation.

The build now explicitly generates its build ID from APP_RELEASE, matching deploymentId. The Docker build assertion refuses an image whose `.next/BUILD_ID` differs from its declared release. Development/unnamed builds keep the framework default. This preserves version-skew checks, the deployment notice and action replay protection. Acceptance must inspect network request types: successful HTTP responses alone do not prove client navigation; ordinary dashboard links must not generate Document requests.
