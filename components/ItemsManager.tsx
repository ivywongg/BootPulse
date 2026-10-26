'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, type FormEvent } from 'react';
import {
  addExpenseItem,
  addRevenueItem,
  deleteExpenseItem,
  deleteRevenueItem,
  updateExpenseItem,
  updateRevenueItem,
  type ItemInput,
  type ItemKind,
} from '../lib/item-actions';
import { formatMoney } from '../lib/calc/types';

export type ManagerItem = {
  id: string;
  name: string;
  amountCents: number;
  categoryId: string | null;
  frequency: 'monthly' | 'one_off';
  startMonth: string;
};

export type ManagerCategory = {
  id: string;
  name: string;
};

type ItemsManagerProps = {
  businessId: string;
  kind: ItemKind;
  items: readonly ManagerItem[];
  categories: readonly ManagerCategory[];
  currency?: string;
};

type FormState = {
  name: string;
  amount: string;
  categoryId: string;
  frequency: 'monthly' | 'one_off';
  startMonth: string;
};

const emptyForm: FormState = {
  name: '',
  amount: '',
  categoryId: '',
  frequency: 'monthly',
  startMonth: new Date().toISOString().slice(0, 10),
};

export default function ItemsManager({
  businessId,
  kind,
  items,
  categories,
  currency = 'USD',
}: ItemsManagerProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !query || item.name.toLowerCase().includes(query);
      const matchesMonth = !monthFilter || item.startMonth.startsWith(monthFilter);
      const matchesCategory = !categoryFilter || item.categoryId === categoryFilter;
      return matchesSearch && matchesMonth && matchesCategory;
    });
  }, [categoryFilter, items, monthFilter, search]);

  const title = kind === 'revenue' ? 'Revenue items' : 'Expense items';
  const submitLabel = editingId ? 'Save changes' : `Add ${kind} item`;

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function beginEdit(item: ManagerItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      amount: (item.amountCents / 100).toFixed(2),
      categoryId: item.categoryId ?? '',
      frequency: item.frequency,
      startMonth: item.startMonth,
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const input: ItemInput = {
      businessId,
      name: form.name,
      amount: form.amount,
      categoryId: form.categoryId || null,
      frequency: form.frequency,
      startMonth: form.startMonth,
    };

    startTransition(async () => {
      try {
        let result;
        if (editingId) {
          if (kind === 'revenue') result = await updateRevenueItem(editingId, input);
          else result = await updateExpenseItem(editingId, input);
        } else if (kind === 'revenue') {
          result = await addRevenueItem(input);
        } else {
          result = await addExpenseItem(input);
        }
        if ('error' in result) {
          setError(result.error);
          return;
        }
        resetForm();
        router.refresh();
      } catch (actionError) {
        setError('Unable to save this item. Check the values and your access, then try again.');
      }
    });
  }

  function handleDelete(itemId: string) {
    setError(null);
    startTransition(async () => {
      try {
        if (kind === 'revenue') await deleteRevenueItem(itemId, businessId);
        else await deleteExpenseItem(itemId, businessId);
        setConfirmingDeleteId(null);
        router.refresh();
      } catch (actionError) {
        setError('Unable to delete this item. Try again.');
      }
    });
  }

  return (
    <section aria-labelledby="items-manager-heading" className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-950" id="items-manager-heading">{title}</h1>
        <p className="mt-2 text-slate-700">Manage recurring and one-off {kind} items.</p>
      </div>

      <form className="card grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <h2 className="md:col-span-2 text-xl font-semibold text-slate-950">{editingId ? 'Edit item' : 'Add an item'}</h2>
        <label className="field">
          Name
          <input className="input" onChange={(event) => updateField('name', event.target.value)} required value={form.name} />
        </label>
        <label className="field">
          Amount
          <input className="input" inputMode="decimal" onChange={(event) => updateField('amount', event.target.value)} placeholder="0.00" required value={form.amount} />
        </label>
        <label className="field">
          Frequency
          <select className="input" onChange={(event) => updateField('frequency', event.target.value as FormState['frequency'])} value={form.frequency}>
            <option value="monthly">Monthly</option>
            <option value="one_off">One-off</option>
          </select>
        </label>
        <label className="field">
          Start month
          <input className="input" onChange={(event) => updateField('startMonth', event.target.value)} required type="date" value={form.startMonth} />
        </label>
        <label className="field">
          Category
          <select className="input" onChange={(event) => updateField('categoryId', event.target.value)} value={form.categoryId}>
            <option value="">No category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-3 md:col-span-2">
          <button className="btn btn-primary" disabled={isPending} type="submit">{isPending ? 'Saving…' : submitLabel}</button>
          {editingId ? <button className="btn btn-secondary" onClick={resetForm} type="button">Cancel</button> : null}
        </div>
        {error ? <p className="md:col-span-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
      </form>

      <div className="card grid gap-4 md:grid-cols-3">
        <label className="field">
          Search by name
          <input className="input" onChange={(event) => setSearch(event.target.value)} placeholder="Search" value={search} />
        </label>
        <label className="field">
          Filter by month
          <input className="input" onChange={(event) => setMonthFilter(event.target.value)} type="month" value={monthFilter} />
        </label>
        <label className="field">
          Filter by category
          <select className="input" onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
      </div>

      <ul className="space-y-3" aria-label={`${title} list`}>
        {visibleItems.length === 0 ? <li className="empty">{items.length === 0 ? `No ${kind} items yet. Add your first one above.` : 'No items match these filters.'}</li> : null}
        {visibleItems.map((item) => (
          <li className="card card-sm flex flex-wrap items-center justify-between gap-4" key={item.id}>
            <div>
              <h2 className="font-semibold text-slate-950">{item.name}</h2>
              <p className="text-sm text-slate-700">{formatMoney(item.amountCents, currency)} · {item.frequency.replace('_', ' ')} · {item.startMonth}{item.categoryId ? ` · ${categoryNames.get(item.categoryId) ?? 'Category'}` : ''}</p>
            </div>
            <div className="flex gap-2">
              {confirmingDeleteId === item.id ? (
                <>
                  <button className="btn btn-danger" disabled={isPending} onClick={() => handleDelete(item.id)} type="button">Confirm delete</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setConfirmingDeleteId(null)} type="button">Keep</button>
                </>
              ) : (
                <>
                  <button aria-label={`Edit ${item.name}`} className="btn btn-secondary btn-sm" onClick={() => beginEdit(item)} type="button">Edit</button>
                  <button aria-label={`Delete ${item.name}`} className="btn btn-danger-outline btn-sm" onClick={() => setConfirmingDeleteId(item.id)} type="button">Delete</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
