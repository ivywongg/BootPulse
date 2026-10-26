import { createHash, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { businesses, localCredentials, localSessions, teamMembers, users } from '../db/schema';
import { CONSENT_VERSION } from './auth-constants';
import { signupSchema } from './auth-validation';
import { authenticateLocalAccount, findSessionUser, hashPassword, registerLocalAccount, revokeLocalSession, verifyPassword } from './local-auth';
import { calendarDateSchema, entityIdSchema, moneyCentsSchema } from './validation';

const accounts: string[] = [];
const password = 'Fictional-Audit-Password-42';
function signupInput() {
  return { email: `audit-${randomUUID()}@bootpulse.invalid`, password, consent: 'accepted', consentVersion: CONSENT_VERSION };
}
async function account() {
  const input = signupInput();
  const result = await registerLocalAccount(input);
  accounts.push(result.user.id);
  return { ...result, input };
}

afterEach(() => {
  for (const userId of accounts.splice(0)) {
    const owned = db.select().from(teamMembers).where(eq(teamMembers.userId, userId)).all();
    for (const member of owned) db.delete(businesses).where(eq(businesses.id, member.businessId)).run();
    db.delete(users).where(eq(users.id, userId)).run();
  }
});

describe('task 6.14 local authentication', () => {
  it('requires explicit current-version consent and bounded credentials', async () => {
    const input = signupInput();
    expect(signupSchema.safeParse({ ...input, consent: undefined }).success).toBe(false);
    expect(signupSchema.safeParse({ ...input, consentVersion: 'unapproved' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...input, password: 'short' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...input, password: 'x'.repeat(129) }).success).toBe(false);
    await expect(registerLocalAccount({ ...input, consent: 'no' })).rejects.toThrow();
    expect(db.select().from(localCredentials).where(eq(localCredentials.email, input.email)).get()).toBeUndefined();
  });

  it('uses salted password hashes and verifies the submitted password', async () => {
    const a = await hashPassword(password), b = await hashPassword(password);
    expect(a).not.toBe(b);
    expect(a).not.toContain(password);
    expect(await verifyPassword(password, a)).toBe(true);
    expect(await verifyPassword('Wrong-Fictional-Password', a)).toBe(false);
  });

  it('records signup consent and authenticates using normalized email', async () => {
    const before = Date.now();
    const a = await account();
    expect(a.user.consentVersion).toBe(CONSENT_VERSION);
    expect(a.user.privacyConsentAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(a.user.privacyConsentAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(await authenticateLocalAccount({ email: a.input.email.toUpperCase(), password })).toMatchObject({ user: { id: a.user.id } });
    expect(await authenticateLocalAccount({ email: a.input.email, password: 'Wrong-Fictional-Password' })).toBeNull();
  });

  it('stores only a session-token hash and rejects raw identifiers and tampering', async () => {
    const a = await account();
    expect(a.token).toMatch(/^[a-f0-9]{64}$/);
    expect(findSessionUser(a.token)?.id).toBe(a.user.id);
    expect(findSessionUser(a.user.clerkUserId)).toBeNull();
    expect(findSessionUser(a.user.id)).toBeNull();
    const hash = createHash('sha256').update(a.token).digest('hex');
    expect(db.select().from(localSessions).where(eq(localSessions.tokenHash, hash)).get()?.userId).toBe(a.user.id);
    expect(db.select().from(localSessions).where(eq(localSessions.tokenHash, a.token)).get()).toBeUndefined();
    expect(findSessionUser((a.token[0] === 'a' ? 'b' : 'a') + a.token.slice(1))).toBeNull();
    revokeLocalSession(a.token);
    expect(findSessionUser(a.token)).toBeNull();
  });

  it('rejects expired sessions and invalid stored consent', async () => {
    const a = await account();
    const hash = createHash('sha256').update(a.token).digest('hex');
    db.update(localSessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(localSessions.tokenHash, hash)).run();
    expect(findSessionUser(a.token)).toBeNull();
    const b = await account();
    db.update(users).set({ consentVersion: 'unapproved' }).where(eq(users.id, b.user.id)).run();
    expect(findSessionUser(b.token)).toBeNull();
  });

  it('cascades credentials and all sessions when the local user is deleted', async () => {
    const a = await account();
    const owned = db.select().from(teamMembers).where(eq(teamMembers.userId, a.user.id)).all();
    for (const member of owned) db.delete(businesses).where(eq(businesses.id, member.businessId)).run();
    db.delete(users).where(eq(users.id, a.user.id)).run();
    expect(db.select().from(localCredentials).where(eq(localCredentials.userId, a.user.id)).get()).toBeUndefined();
    expect(db.select().from(localSessions).where(eq(localSessions.userId, a.user.id)).all()).toHaveLength(0);
    expect(findSessionUser(a.token)).toBeNull();
  });
});

describe('task 6.14 shared input boundaries', () => {
  it('rejects malformed identifiers, impossible dates, unsafe/sub-cent money', () => {
    expect(entityIdSchema.safeParse('not-an-id').success).toBe(false);
    expect(calendarDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(moneyCentsSchema.safeParse('0.001').success).toBe(false);
    expect(moneyCentsSchema.safeParse('999999999999999999999').success).toBe(false);
    expect(moneyCentsSchema.parse('120.50')).toBe(12050);
    expect(moneyCentsSchema.parse(250)).toBe(25000);
  });
});
