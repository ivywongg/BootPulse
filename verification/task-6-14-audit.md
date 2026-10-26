# BootPulse — Task 6.14 privacy/security audit

## Passed

The final focused browser/API smoke test passed, all 22 Vitest tests passed, and the production build completed without errors. Only task 6.14 is marked complete by this audit; later gates are separate.

## Repairs

- Implemented the missing local email/password handlers. Passwords are salted and hashed with Node scrypt, never stored in plaintext.
- Added two additive SQLite auth tables: credentials and hashed, expiring session tokens. Existing business tables and data were not rewritten. Logout revokes sessions; account deletion cascades through credentials and sessions.
- Replaced raw user-ID cookie trust with server-side session lookup. Client consent cookies cannot establish identity or override the stored consent record.
- Signup requires an explicit acceptance of `PICS-v1`; the server stores its time and version. The PICS appears before account fields and accurately describes local authentication data.
- Completed bounded identifier, date, money, filter, and request validation across item, scenario, milestone, decision, settings, export, and checkout boundaries. Ownership checks use the verified current user. Money remains integer cents; forecast formulas and plan rules were not changed.
- Rejected cross-origin checkout and caller-selected identity payloads. Correct same-origin demo upgrades remain repeat-safe. CSV text is protected against formula injection; numeric cent values are unchanged.
- Retained the earlier page-local/footer disclaimers and database/environment ignore protections.

## Verification

The smoke test confirmed real signup/login, stored consent, HttpOnly opaque cookies, rejection of forged identities and invalid stored consent, export query validation, cross-user read/write rejection, checkout origin protection and idempotency, logout replay rejection, and confirmed account deletion. Only fictional disposable accounts and planning data were used. Fixtures were removed and original user rows preserved.

A source-pattern scan found no hardcoded-secret matches. Environment values were not printed. There is no local Git repository yet, so no Git-index/history audit is claimed.

## Existing demo limitation

Password-reset email delivery is not configured. The existing reset screen now reports this honestly; no reset token, insecure recovery bypass, or external email service was added. Legacy raw demo identifiers no longer sign in: use the validated signup/login flow.

Evidence: `verification/audit-6-14-results.json`; repeatable test: `verification/audit-6-14.cjs`. Unit command: `npm test`. Build command: `npm run build`.
