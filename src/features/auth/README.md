# auth (core)

Email one-time codes. `otp.ts` generates a 6-digit code (crypto.randomInt), stores only an HMAC, enforces 10-minute expiry, 5 attempts and 5 sends per 15 minutes, and sends via Resend when `RESEND_API_KEY` is set. Without a key the code is shown on screen and sessions are labelled "simulated".

`actions.ts`: request code (campus domain checked server-side first), verify code, demo-student sign-in, sign-out. Sessions are signed cookies (`src/lib/auth/session.ts`).
