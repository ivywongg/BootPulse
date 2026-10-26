import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { db } from '../db';
import { businesses, teamMembers, users } from '../db/schema';
import { requireBusinessAccess } from './access';

describe('business ownership access', () => {
  it('allows the owner and rejects another user for reads and writes', () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ownerClerkUserId = `access-test-owner-${suffix}`;
    const otherClerkUserId = `access-test-other-${suffix}`;

    const seeded = db.transaction((tx) => {
      const owner = tx
        .insert(users)
        .values({
          clerkUserId: ownerClerkUserId,
          privacyConsentAt: new Date(),
          consentVersion: 'PICS-v1',
        })
        .returning()
        .get();
      const otherUser = tx
        .insert(users)
        .values({
          clerkUserId: otherClerkUserId,
          privacyConsentAt: new Date(),
          consentVersion: 'PICS-v1',
        })
        .returning()
        .get();
      const business = tx
        .insert(businesses)
        .values({
          name: `Access test business ${suffix}`,
          currency: 'USD',
          cashStartMonth: '2026-01-01',
          cashBalanceCents: 100_000,
          isDemo: false,
        })
        .returning()
        .get();

      tx.insert(teamMembers)
        .values({ businessId: business.id, userId: owner.id, role: 'owner' })
        .run();

      return { owner, otherUser, business };
    });

    try {
      expect(requireBusinessAccess(seeded.owner.id, seeded.business.id)).toBe(seeded.business.id);

      expect(() => requireBusinessAccess(seeded.otherUser.id, seeded.business.id)).toThrow();

      expect(() => {
        requireBusinessAccess(seeded.otherUser.id, seeded.business.id);
        db.update(businesses).set({ name: 'Unauthorized update' }).where(eq(businesses.id, seeded.business.id)).run();
      }).toThrow();

      const unchanged = db
        .select({ name: businesses.name })
        .from(businesses)
        .where(eq(businesses.id, seeded.business.id))
        .get();
      expect(unchanged?.name).toBe(`Access test business ${suffix}`);
    } finally {
      db.delete(teamMembers).where(eq(teamMembers.businessId, seeded.business.id)).run();
      db.delete(businesses).where(eq(businesses.id, seeded.business.id)).run();
      db.delete(users)
        .where(and(eq(users.id, seeded.owner.id), eq(users.clerkUserId, ownerClerkUserId)))
        .run();
      db.delete(users)
        .where(and(eq(users.id, seeded.otherUser.id), eq(users.clerkUserId, otherClerkUserId)))
        .run();
    }
  });
});
