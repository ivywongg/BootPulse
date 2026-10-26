import { beforeAll, describe, expect, it, vi } from 'vitest';
import { addMember, createTestDb, makeDemoFor, makeUser } from '../test/db';
import { getBusinessRole, listUserBusinesses, requireBusinessAccess, requireBusinessOwner } from './access';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

describe('business access roles', () => {
  let owner: Awaited<ReturnType<typeof makeUser>>;
  let collaborator: Awaited<ReturnType<typeof makeUser>>;
  let stranger: Awaited<ReturnType<typeof makeUser>>;
  let businessId: string;

  beforeAll(async () => {
    await createTestDb();
    owner = await makeUser('owner@example.test');
    collaborator = await makeUser('collab@example.test');
    stranger = await makeUser('stranger@example.test');
    businessId = (await makeDemoFor(owner.id)).id;
    await addMember(businessId, collaborator.id, 'collaborator');
  });

  it('reports the role of each user', async () => {
    expect(await getBusinessRole(owner.id, businessId)).toBe('owner');
    expect(await getBusinessRole(collaborator.id, businessId)).toBe('collaborator');
    expect(await getBusinessRole(stranger.id, businessId)).toBeNull();
  });

  it('lets owners and collaborators read and edit but hides the business from strangers', async () => {
    await expect(requireBusinessAccess(owner.id, businessId)).resolves.toBe(businessId);
    await expect(requireBusinessAccess(collaborator.id, businessId)).resolves.toBe(businessId);
    await expect(requireBusinessAccess(stranger.id, businessId)).rejects.toThrow();
    expect(await listUserBusinesses(stranger.id)).toEqual([]);
  });

  it('reserves owner-only actions for the owner', async () => {
    await expect(requireBusinessOwner(owner.id, businessId)).resolves.toBe(businessId);
    await expect(requireBusinessOwner(collaborator.id, businessId)).rejects.toThrow('Only the business owner');
    await expect(requireBusinessOwner(stranger.id, businessId)).rejects.toThrow();
  });

  it('rejects malformed identifiers without querying', async () => {
    expect(await getBusinessRole('not-a-uuid', businessId)).toBeNull();
    await expect(requireBusinessAccess(owner.id, "x'; drop table users;--")).rejects.toThrow();
  });
});
