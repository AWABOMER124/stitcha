# Public subscription pricing by country

The landing page renders one catalog only. Priority is the authenticated merchant's
persisted `subscriptionMarket`, then the visitor's supported IP country, then a
saved explicit choice. If none is known, the page asks for the business country
before querying or rendering prices. A `?market=` URL only suggests a selection
in this form; it cannot override location or merchant market.

Saudi visitors see the Saudi catalog automatically, including monthly/yearly
choices when all paid plans support annual billing. Catalog amounts and limits
come from the database. No prices or entitlements are changed by the presentation.
Registration links carry the selected market. Existing subscriptions, merchant
currency, payment quotes and shipping terms remain governed by their services.

## Deployment prerequisite

Set `PRICING_TRUST_PROXY=traefik` only on web containers reached exclusively through
the managed Traefik ingress, with no publicly published application port. Traefik
must strip forwarded headers from untrusted peers and set `X-Real-IP` from its
socket. Do not enable forwarded-header insecure mode. The application ignores
visitor-supplied country headers and `X-Forwarded-For` for this feature. Without
this configuration it falls back to explicit selection, rather than guessing.

`src/lib/pricing/pricing-country-ranges.json` contains only Saudi and Sudanese
IPv4/IPv6 ranges from [IPtoASN](https://iptoasn.com/), retrieved 2026-11-19 under
PDDL-1.0. Lookups run offline on the server. The feature does not request GPS, call
an external service with visitor addresses, or persist visitor IPs. IP country is
approximate and may differ when using VPNs or mobile networks. Update and review
the dataset periodically through a normal tested release; do not download data
at application startup.

Anonymous choices are saved in an HttpOnly, SameSite=Lax country cookie for 180
days through same-origin `POST /api/pricing/market`. Clearing a manual choice
returns to the selection form when location is unknown. A known location or
merchant country cannot be overridden through this endpoint. This cookie is a
display preference, not authorization to change a merchant's billing market.

## Verification

`visitor-market.test.ts`, `pricing-country.test.ts` and the country route tests
cover offline IPv4/IPv6, unknown locations, header trust, origin validation,
cookie clearing, market precedence and fetching only the selected catalog.
Verify the live candidate with proxy trust enabled before promotion. Preserve the
prior release for rollback; this change requires no database migration.
