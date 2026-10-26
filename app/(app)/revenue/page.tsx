import { and, asc, eq } from 'drizzle-orm';
import DesktopOnly from '../../../components/DesktopOnly';
import ItemsManager from '../../../components/ItemsManager';
import { getActiveBusiness } from '../../../lib/access';
import { getOrCreateUser } from '../../../lib/auth';
import { db } from '../../../db';
import { categories, revenueItems } from '../../../db/schema';

export const metadata = { title: 'Revenue' };

export default async function RevenuePage() {
  const user = await getOrCreateUser();
  const business = await getActiveBusiness(user.id);
  const [items, categoryRows] = await Promise.all([
    db.select().from(revenueItems).where(eq(revenueItems.businessId, business.id)).orderBy(asc(revenueItems.startMonth), asc(revenueItems.name)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(eq(categories.businessId, business.id), eq(categories.kind, 'revenue'))),
  ]);

  return (
    <DesktopOnly>
      <ItemsManager
        businessId={business.id}
        categories={categoryRows}
        currency={business.currency}
        items={items}
        kind="revenue"
      />
    </DesktopOnly>
  );
}
