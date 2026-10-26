import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { and, eq, gt, lte } from 'drizzle-orm';
import { db } from '../db';
import { localCredentials, localSessions, users } from '../db/schema';
import { createDemoBusiness } from '../db/seed';
import { CONSENT_VERSION, SESSION_MAX_AGE_SECONDS } from './auth-constants';
import { loginSchema, signupSchema } from './auth-validation';
import { entityIdSchema } from './validation';

function hasValidConsent(user: typeof users.$inferSelect): boolean {
  const time = user.privacyConsentAt.getTime();
  return user.consentVersion === CONSENT_VERSION && Number.isFinite(time) && time > 0 && time <= Date.now();
}

function derivePassword(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await derivePassword(password, salt);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored)) return false;
  const [, salt, expected] = stored.split('$');
  const actual = await derivePassword(password, salt);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

function tokenHash(token: string): string | null {
  return /^[a-f0-9]{64}$/.test(token) ? createHash('sha256').update(token).digest('hex') : null;
}

export function createLocalSession(userId: string): string {
  entityIdSchema.parse(userId);
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || !hasValidConsent(user)) {
    throw new Error('Verified account consent is required.');
  }
  db.delete(localSessions).where(lte(localSessions.expiresAt, new Date())).run();
  const token = randomBytes(32).toString('hex');
  db.insert(localSessions).values({
    tokenHash: tokenHash(token)!,
    userId,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
  }).run();
  return token;
}

export function findSessionUser(token: string | undefined) {
  if (!token) return null;
  const hash = tokenHash(token);
  if (!hash) return null;
  const row = db.select({ user: users }).from(localSessions)
    .innerJoin(users, eq(users.id, localSessions.userId))
    .where(and(eq(localSessions.tokenHash, hash), gt(localSessions.expiresAt, new Date())))
    .get();
  if (!row || !hasValidConsent(row.user)) return null;
  return row.user;
}

export function revokeLocalSession(token: string | undefined) {
  const hash = token ? tokenHash(token) : null;
  if (hash) db.delete(localSessions).where(eq(localSessions.tokenHash, hash)).run();
}

export async function registerLocalAccount(input: unknown) {
  const parsed = signupSchema.parse(input);
  const passwordHash = await hashPassword(parsed.password);
  return db.transaction((tx) => {
    const user = tx.insert(users).values({
      clerkUserId: `local:${randomUUID()}`,
      privacyConsentAt: new Date(),
      consentVersion: parsed.consentVersion,
    }).returning().get();
    tx.insert(localCredentials).values({ userId: user.id, email: parsed.email, passwordHash }).run();
    createDemoBusiness(user.clerkUserId);
    return { user, token: createLocalSession(user.id) };
  });
}

export async function authenticateLocalAccount(input: unknown) {
  const parsed = loginSchema.parse(input);
  const credential = db.select().from(localCredentials).where(eq(localCredentials.email, parsed.email)).get();
  if (!credential) {
    // Do comparable password work without disclosing whether the email exists.
    await derivePassword(parsed.password, randomBytes(16).toString('hex'));
    return null;
  }
  if (!(await verifyPassword(parsed.password, credential.passwordHash))) return null;
  const user = db.select().from(users).where(eq(users.id, credential.userId)).get();
  if (!user || !hasValidConsent(user)) return null;
  return { user, token: createLocalSession(user.id) };
}
