# WhatsApp account verification

WASLA keeps a newly registered merchant in `PENDING` state until the owner
confirms a six-digit code delivered by the platform's dedicated WhatsApp
Business number. Successful verification activates the merchant and permits
the first login.

## Meta prerequisites

1. Create or select the WASLA Meta Business portfolio and Meta app.
2. Add the WhatsApp product and register the dedicated business number.
3. Create a permanent System User access token with the minimum WhatsApp
   messaging permissions required by Meta. Never commit this token.
4. In WhatsApp Manager, create an **Authentication** template with an OTP
   **Copy code** button, Arabic language, and a 10-minute expiry. A suggested
   template name is `wasla_account_verification`.
5. Wait until the template status is `APPROVED` before enabling signup OTP in
   production.

## Temporary Evolution API bridge

While Meta onboarding is pending, the platform number may send signup OTP and
platform notifications through a dedicated Evolution API instance. This is an
outbound bridge only: merchant WhatsApp inboxes, ordering bots and AI agents
continue to use each merchant's Meta configuration. This boundary makes the
later switch back to Meta a one-variable change and avoids storing temporary
Evolution credentials in merchant records.

Evolution uses a linked-device session and is not equivalent to Meta's official
Cloud API. Keep it temporary, monitor disconnects, never expose the manager or
API key publicly, and keep signup verification disabled until a real send test
from `+249915970000` succeeds.

Add these values to Dokploy:

```dotenv
PLATFORM_WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=https://<private-evolution-host>
EVOLUTION_API_KEY=<strong-api-key>
EVOLUTION_INSTANCE_NAME=wasla-main
EVOLUTION_SEND_PAYLOAD_STYLE=textMessage
PHONE_OTP_SECRET=<independent-random-secret>
WHATSAPP_SIGNUP_VERIFICATION_ENABLED=false
```

Create/connect the `wasla-main` instance, scan its QR from the WhatsApp Business
app on `+249915970000`, and send a test message. Only then change
`WHATSAPP_SIGNUP_VERIFICATION_ENABLED=true`. If the installed Evolution release
expects the newer flat body `{ number, text }`, set
`EVOLUTION_SEND_PAYLOAD_STYLE=flat` and retest. Do not enable automatic payload
fallback because retrying an ambiguous provider error can duplicate OTP
messages.

To move to Meta later, configure the Meta variables below and set:

```dotenv
PLATFORM_WHATSAPP_PROVIDER=meta
```

## Dokploy environment

Add these values to the `merchant-os` application environment and redeploy.
Keep the feature flag off until a real-number send test passes; the default
preserves the existing signup flow during setup:

```dotenv
WHATSAPP_CLOUD_API_TOKEN=<permanent-system-user-token>
WHATSAPP_PHONE_NUMBER_ID=<meta-phone-number-id>
WHATSAPP_GRAPH_API_VERSION=<current-version-shown-by-meta>
WHATSAPP_OTP_TEMPLATE_NAME=wasla_account_verification
WHATSAPP_OTP_TEMPLATE_LANGUAGE=ar
PHONE_OTP_SECRET=<independent-random-secret>
WHATSAPP_SIGNUP_VERIFICATION_ENABLED=true
```

Generate `PHONE_OTP_SECRET` with a cryptographically secure random generator.
If it is omitted the application uses `AUTH_SECRET`, but an independent secret
is preferred. Do not put any secret in Git, screenshots, support tickets, or
client-side variables.

## Application flow

1. `POST /api/auth/register` creates the merchant on the free plan with status
   `PENDING`, normalises the Sudanese number to E.164, and sends the first OTP.
2. `POST /api/auth/verify-phone/request` resends the OTP after the cooldown.
3. `POST /api/auth/verify-phone` verifies the HMAC-protected code, marks the
   user's phone as verified, activates the merchant, and invalidates the
   registration token.
4. Credentials login rejects merchants that are not `ACTIVE`.

Controls: 10-minute code lifetime, five verification attempts, one-minute
resend cooldown, hourly send limits, IP/token rate limits, single-use
registration token, and timing-safe code comparison.

## Production acceptance test

- Register with a real Sudanese WhatsApp number in each accepted input form
  (`09...`, `9...`, and `+249...`).
- Confirm the message is sent from the WASLA business identity and the Copy
  code button contains the same six digits.
- Verify that a wrong code is rejected and increments the attempt count.
- Verify resend is blocked for one minute and works afterwards.
- Verify the merchant cannot sign in before confirmation and can sign in
  immediately after confirmation.
- Confirm the merchant becomes `ACTIVE`, `phoneVerifiedAt` is populated, and
  the registration token is cleared.

No new database migration is required: the existing `PhoneVerification`,
`User.phoneVerifiedAt`, `Merchant.status`, and registration-token fields are
used.
