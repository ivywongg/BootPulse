import { and, eq } from 'drizzle-orm';
import DesktopOnly from '../../../components/DesktopOnly';
import ItemsManager from '../../../components/ItemsManager';
import { getActiveBusiness } from '../../../lib/access';
import { getOrCreateUser } from '../../../lib/auth';
import { db } from '../../../db';
import { categories, expenseItems } from '../../../db/schema';

export default async function ExpensesPage() {
  const user = await getOrCreateUser();
  const business = await getActiveBusiness(user.id);
  const [items, categoryRows] = [
    db.select().from(expenseItems).where(eq(expenseItems.businessId, business.id)).all(),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(eq(categories.businessId, business.id), eq(categories.kind, 'expense')))
      .all(),
  ];

  return (
    <DesktopOnly>
      <ItemsManager
        businessId={business.id}
        categories={categoryRows}
        currency={business.currency}
        items={items}
        kind="expense"
      />
    </DesktopOnly>
  );
}
