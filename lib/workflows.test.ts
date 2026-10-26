import { and, eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { businesses, expenseItems, revenueItems, scenarios, subscriptions, teamMembers, users } from '../db/schema';
import { createCustomScenario, updateScenarioAssumptions } from '../app/(app)/scenarios/actions';
import { addMember, createTestDb, makeDemoFor, makeUser } from '../test/db';
import { deleteAccount, setDemoPlan } from './account-actions';
import { addCollaborator, createBusiness, deleteBusiness, removeCollaborator, renameBusiness, updateCashSettings } from './business-actions';
import { addItem, deleteItem, updateItem } from './item-actions';
import { loadForecast } from './forecast';
import { getBusinessPlan, getUserPlan } from './plans';

const session = vi.hoisted(() => ({ user: null as null | { id: string; email: string } }));
const deleted = vi.hoisted(() => ({ ids: [] as string[] }));

vi.mock('./auth', () => ({
  getAuthenticatedUser: async () => session.user,
  getOrCreateUser: async () => {
    if (!session.user) throw new Error('not signed in');
    return session.user;
  },
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));
vi.mock('./supabase/server', () => ({ createClient: async () => ({ auth: { signOut: async () => ({}) } }) }));
vi.mock('./supabase/admin', () => ({
  adminConfigured: () => true,
  createAdminClient: () => ({ auth: { admin: { deleteUser: async (id: string) => { deleted.ids.push(id); return { error: null }; } } } }),
}));

type User = Awaited<ReturnType<typeof makeUser>>;
const signInAs = (user: User) => { session.user = user; };

describe('owner, collaborator and plan workflows', () => {
  let owner: User;
  let collaborator: User;
  let stranger: User;
  let businessId: string;

  beforeAll(async () => {
    await createTestDb();
  });

  beforeEach(async () => {
    await db.delete(users);
    owner = await makeUser('owner@example.test');
    collaborator = await makeUser('collab@example.test', 'adviser');
    stranger = await makeUser('stranger@example.test');
    businessId = (await makeDemoFor(owner.id)).id;
    signInAs(owner);
  });

  it('keeps one owner per business and lets only the owner invite and revoke collaborators', async () => {
    await addCollaborator(businessId, 'COLLAB@example.test');
    expect((await db.select().from(teamMembers).where(eq(teamMembers.businessId, businessId))).map((m) => m.role).sort()).toEqual(['collaborator', 'owner']);
    await expect(addCollaborator(businessId, 'collab@example.test')).rejects.toThrow('already has access');
    await expect(addCollaborator(businessId, 'nobody@example.test')).rejects.toThrow('No registered');
    await expect(addCollaborator(businessId, 'owner@example.test')).rejects.toThrow('already own');

    signInAs(collaborator);
    await expect(addCollaborator(businessId, 'stranger@example.test')).rejects.toThrow('Only the business owner');
    await expect(removeCollaborator(businessId, collaborator.id)).rejects.toThrow('Only the business owner');
    await expect(deleteBusiness(businessId, 'delete')).rejects.toThrow('Only the business owner');

    signInAs(owner);
    await removeCollaborator(businessId, collaborator.id);
    signInAs(collaborator);
    await expect(renameBusiness(businessId, 'Nope')).rejects.toThrow();
  });

  it('lets a collaborator edit planning data but not another business', async () => {
    await addMember(businessId, collaborator.id, 'collaborator');
    signInAs(collaborator);
    await renameBusiness(businessId, 'Renamed by collaborator');
    await updateCashSettings(businessId, '1234.56', '2026-03-15');
    const [row] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    expect(row).toMatchObject({ name: 'Renamed by collaborator', cashBalanceCents: 123456, cashStartMonth: '2026-03-01' });

    const created = await addItem('revenue', { businessId, name: 'Consulting', amount: '250.00', frequency: 'one_off', startMonth: '2026-04-20' });
    expect(created).toMatchObject({ amountCents: 25000, startMonth: '2026-04-01' });
    await deleteItem('revenue', (created as { id: string }).id, businessId);

    signInAs(stranger);
    await expect(addItem('expense', { businessId, name: 'x', amount: '1', frequency: 'monthly', startMonth: '2026-01-01' })).rejects.toThrow();
    await expect(updateCashSettings(businessId, '1', '2026-01-01')).rejects.toThrow();
    await expect(loadForecast(businessId)).rejects.toThrow();
  });

  it('rejects items that point at another business’s category and negative or oversized amounts', async () => {
    const other = await makeDemoFor(owner.id);
    const [foreign] = await db.query.categories.findMany({ where: (c, { eq: equals }) => equals(c.businessId, other.id), limit: 1 });
    await expect(addItem('expense', { businessId, name: 'x', amount: '5', categoryId: foreign.id, frequency: 'monthly', startMonth: '2026-01-01' })).rejects.toThrow('Category');
    expect(await addItem('expense', { businessId, name: 'x', amount: '-5', frequency: 'monthly', startMonth: '2026-01-01' })).toHaveProperty('error');
    expect(await addItem('expense', { businessId, name: 'x', amount: '99999999999', frequency: 'monthly', startMonth: '2026-01-01' })).toHaveProperty('error');
  });

  it('persists edits and updates the forecast', async () => {
    const before = await loadForecast(businessId);
    expect(before.headlineNumbers).toMatchObject({ netBurnCents: 200_000, runway: 5 });
    const [item] = await db.select().from(expenseItems).where(eq(expenseItems.businessId, businessId)).limit(1);
    await updateItem('expense', item.id, { businessId, name: item.name, amount: '0.00', frequency: 'monthly', startMonth: item.startMonth });
    const after = await loadForecast(businessId);
    expect(after.headlineNumbers.netBurnCents).toBeLessThan(200_000);
  });

  it('enforces the owned-business limit per plan', async () => {
    await expect(createBusiness('Second', '0', '2026-01-01')).rejects.toThrow('limit');
    await setDemoPlan('adviser');
    for (let i = 0; i < 9; i += 1) await createBusiness(`Client ${i}`, '100.00', '2026-01-01');
    await expect(createBusiness('One too many', '0', '2026-01-01')).rejects.toThrow('limit');
    const created = await db.select().from(businesses).where(eq(businesses.name, 'Client 0'));
    const presets = await db.select().from(scenarios).where(eq(scenarios.businessId, created[0].id));
    expect(presets.map((s) => s.kind).sort()).toEqual(['base', 'cautious', 'growth']);
  });

  it('switches Free → Founder → Adviser → Free without deleting data', async () => {
    const countData = async () => [
      (await db.select().from(revenueItems).where(eq(revenueItems.businessId, businessId))).length,
      (await db.select().from(scenarios).where(eq(scenarios.businessId, businessId))).length,
    ];
    const baseline = await countData();
    expect((await loadForecast(businessId)).rows).toHaveLength(6);
    await setDemoPlan('founder');
    expect((await loadForecast(businessId)).rows).toHaveLength(24);
    await setDemoPlan('adviser');
    expect(await getUserPlan(owner.id)).toBe('adviser');
    await setDemoPlan('free');
    expect((await loadForecast(businessId)).rows).toHaveLength(6);
    expect(await countData()).toEqual(baseline);
    await expect(setDemoPlan('platinum')).rejects.toThrow('Unknown plan');
    expect(await db.select().from(subscriptions).where(eq(subscriptions.userId, owner.id))).toHaveLength(1);
  });

  it('applies the owner’s plan to shared businesses, never the collaborator’s', async () => {
    await addMember(businessId, collaborator.id, 'collaborator'); // collaborator is on the Adviser demo plan
    expect(await getBusinessPlan(businessId)).toBe('free');
    signInAs(collaborator);
    expect((await loadForecast(businessId)).rows).toHaveLength(6);
    await expect(createCustomScenario(businessId, 'Hire', {})).rejects.toThrow();
    await expect(createCustomScenario(businessId, 'Hire', {
      revenueGrowthPct: '0', priceChangePct: '0', revenueLossPct: '0', extraRecurringCost: '0', extraOneOffCost: '0',
    })).rejects.toThrow('Founder or Adviser');

    signInAs(owner);
    await setDemoPlan('founder');
    signInAs(collaborator);
    expect((await loadForecast(businessId)).rows).toHaveLength(24);
    const custom = await createCustomScenario(businessId, 'Hire freelancer', {
      revenueGrowthPct: '0', priceChangePct: '0', revenueLossPct: '0', extraRecurringCost: '1500.00', extraOneOffCost: '0',
    });
    expect(custom.extraRecurringCostCents).toBe(150_000);

    signInAs(owner);
    await setDemoPlan('free');
    await expect(loadForecast(businessId, custom.id)).rejects.toThrow('Founder or Adviser');
    await expect(updateScenarioAssumptions(businessId, custom.id, {
      revenueGrowthPct: '0', priceChangePct: '0', revenueLossPct: '0', extraRecurringCost: '0', extraOneOffCost: '0',
    })).rejects.toThrow('Founder or Adviser');
  });

  it('edits preset assumptions with hundredths only', async () => {
    const [cautious] = await db.select().from(scenarios).where(and(eq(scenarios.businessId, businessId), eq(scenarios.kind, 'cautious')));
    const base = { revenueGrowthPct: '1.25', priceChangePct: '0', revenueLossPct: '12.5', extraRecurringCost: '200.00', extraOneOffCost: '0', extraOneOffMonth: '2026-06-09' };
    const updated = await updateScenarioAssumptions(businessId, cautious.id, base);
    expect(updated).toMatchObject({ revenueGrowthPct: 1.25, revenueLossPct: 12.5, extraOneOffMonth: '2026-06-01' });
    await expect(updateScenarioAssumptions(businessId, cautious.id, { ...base, revenueGrowthPct: '1.255' })).rejects.toThrow();
  });

  it('deletes an account with its owned businesses but keeps businesses shared with others', async () => {
    const shared = await makeDemoFor(collaborator.id);
    await addMember(shared.id, owner.id, 'collaborator');
    await addMember(businessId, collaborator.id, 'collaborator');

    await deleteAccount('delete');
    expect(deleted.ids).toContain(owner.id);
    expect(await db.select().from(businesses).where(eq(businesses.id, businessId))).toHaveLength(0);
    expect(await db.select().from(businesses).where(eq(businesses.id, shared.id))).toHaveLength(1);
    expect(await db.select().from(teamMembers).where(eq(teamMembers.userId, owner.id))).toHaveLength(0);
    expect(await db.select().from(users).where(eq(users.id, owner.id))).toHaveLength(0);
    await expect(deleteAccount('yes')).rejects.toThrow();
  });

  it('refuses to delete the only accessible business', async () => {
    await expect(deleteBusiness(businessId, 'delete')).rejects.toThrow('only business');
    await setDemoPlan('adviser');
    await createBusiness('Second', '0', '2026-01-01');
    await deleteBusiness(businessId, 'delete');
    expect(await db.select().from(businesses).where(eq(businesses.id, businessId))).toHaveLength(0);
  });
});
