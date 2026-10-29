-- Existing marketer accounts predate mandatory email verification. Grandfather
-- them once so the rollout does not lock active users out. Accounts created
-- after this migration must complete the email OTP flow before signing in.
UPDATE "users"
SET "emailVerified" = CURRENT_TIMESTAMP
WHERE "role" = 'MARKETER' AND "emailVerified" IS NULL;
