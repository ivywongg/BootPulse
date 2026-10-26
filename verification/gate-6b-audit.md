# BootPulse — Gate 6B verification

## Status: blocked — Gate 6B remains unchecked

The approved replacement is local SQLite billing with no real payment provider. Local upgrade behavior works, but the HTTP path does not establish a verified authenticated identity. Gate 6B cannot be marked as a security pass.

## Local-server verification

All requests used two disposable fictional accounts and businesses. No existing user account or subscription was modified.

| Check | Result | Evidence |
|---|---|---|
| Checkout without a session cookie | Pass | HTTP 401; neither subscription changed. |
| Pricing-page demo upgrade | Pass, functional only | The UI changed the fixture subscription to `founder` / `active`. Stripe customer and subscription identifiers remained null. This exercised the current demo-cookie path, not a verified login. |
| Repeat upgrade | Pass | HTTP 303; the subscription row remained identical and its row count stayed at one. |
| Cancellation-state simulation | Pass, limited | Directly setting the fixture row to `free` / `canceled` was reflected on the pricing page. No application cancellation endpoint or webhook was tested. |
| Subscription scope | Pass, limited | A payload naming the other fixture user did not redirect the mutation to that user. The scope is only as trustworthy as the cookie identity. |
| Forged raw session identifier | **Fail** | A fresh HTTP client supplied the fixture identifier as `bp_session`, performed no login, received HTTP 303, and changed that subscription to Founder. |
| Cross-origin checkout | **Fail** | A request with an unrelated Origin and cross-site fetch metadata received HTTP 303 and changed the fixture subscription. No server-side origin rejection occurred. This direct HTTP test does not claim to bypass browser SameSite behavior. |
| Unapproved consent cookie | **Fail** | Checkout accepted a non-empty, unrecognized consent version with the raw cookie identity and changed the fixture subscription. This does not establish trustworthy consent validation. |

The verified-identity and consent weaknesses overlap the blockers already recorded for task 6.14. Authentication and checkout authorization safeguards must be repaired before Gate 6B can pass.

## Approved external-service substitutions

- Stripe key-prefix validation and the fake live-key startup test: **not applicable**; no Stripe client is initialized by the local billing flow. No key was read, printed, or replaced.
- Stripe CLI, test-card checkout, and dashboard cancellation: **not applicable**. The local UI upgrade and explicitly manual SQLite cancellation-state simulation were checked instead.
- Webhook signature rejection and duplicate webhook delivery: **not applicable**; there is no Stripe webhook endpoint. Repeat local upgrade requests were tested, without claiming webhook verification.

No Stripe service, payment, external checkout session, or new cancellation feature was introduced.

## Secrets check

A filesystem scan of 59 source/document/configuration files found **zero matches** for the tested secret-key and private-key patterns. Environment values, including `.env.local`, dependencies, compiled output, and local database files were excluded. Credential values were never printed.

There is no Git repository in this workspace, so `git grep` and a Git-index/history audit were unavailable and are not claimed as passed.

## Cleanup and scope

Both temporary plans were restored to their original Free/active state, then all fixture users, subscriptions, businesses, memberships, and scenarios were deleted. Cleanup was verified.

No application code, authentication design, schema, calculation rule, or plan limit was changed. No production rebuild was run because application code was unchanged. Task 6.14 and later tasks were not advanced.

Evidence: [billing and security results](/home/ubuntu/projects/bootpulse-24f1c2c0/verification/gate-6b-results.json) and [source secret scan](/home/ubuntu/projects/bootpulse-24f1c2c0/verification/gate-6b-secrets.json).
