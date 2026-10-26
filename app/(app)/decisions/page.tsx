import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getActiveBusiness, requireBusinessAccess } from '../../../lib/access';
import { getOrCreateUser } from '../../../lib/auth';
import { db } from '../../../db';
import { decisions, notes } from '../../../db/schema';
import ActionForm from '../../../components/ActionForm';
import { calendarDateSchema, entityIdSchema, monthFilterSchema } from '../../../lib/validation';

const decisionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  decidedOn: calendarDateSchema,
  expectedImpact: z.string().trim().min(1).max(1000),
  actualOutcome: z.string().trim().max(1000),
  note: z.string().trim().max(500),
});

const decisionFilterSchema = z.object({
  q: z.string().trim().max(1000).optional().default(''),
  month: z.union([z.literal(''), monthFilterSchema]).optional().default(''),
}).strict();

function formValue(formData: FormData, name: string): unknown {
  const values = formData.getAll(name);
  if (values.length === 0) return undefined;
  return values.length === 1 ? values[0] : values;
}

type DecisionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DecisionsPage({ searchParams }: DecisionsPageProps) {
  const user = await getOrCreateUser();
  const business = await getActiveBusiness(user.id);
  const parsedFilters = decisionFilterSchema.safeParse((await searchParams) ?? {});
  if (!parsedFilters.success) redirect('/decisions');
  const filters = parsedFilters.data;
  const query = filters.q.toLowerCase();
  const month = filters.month;
  const allDecisions = db.select().from(decisions).where(eq(decisions.businessId, business.id)).all();
  const decisionRows = allDecisions.filter((decision) => {
    const matchesQuery = !query || [decision.title, decision.expectedImpact, decision.actualOutcome ?? ''].some((value) => value.toLowerCase().includes(query));
    const matchesMonth = !month || decision.decidedOn.startsWith(month);
    return matchesQuery && matchesMonth;
  });
  const noteRows = db.select().from(notes).where(eq(notes.businessId, business.id)).all();
  const notesByDecision = new Map<string, typeof noteRows>();
  for (const note of noteRows) {
    if (!note.decisionId) continue;
    const current = notesByDecision.get(note.decisionId) ?? [];
    current.push(note);
    notesByDecision.set(note.decisionId, current);
  }

  async function saveDecision(formData: FormData) {
    'use server';
    const parsed = decisionSchema.safeParse({
      title: formValue(formData, 'title'),
      decidedOn: formValue(formData, 'decidedOn'),
      expectedImpact: formValue(formData, 'expectedImpact'),
      actualOutcome: formValue(formData, 'actualOutcome'),
      note: formValue(formData, 'note'),
    });
    const parsedDecisionId = entityIdSchema.optional().safeParse(formValue(formData, 'decisionId'));
    if (!parsed.success || !parsedDecisionId.success) throw new Error('Check the decision fields and identifier.');
    const currentUser = await getOrCreateUser();
    requireBusinessAccess(currentUser.id, business.id);
    const decision = parsed.data;
    const decisionId = parsedDecisionId.data;
    const saved = decisionId
      ? db
          .update(decisions)
          .set({ title: decision.title, decidedOn: decision.decidedOn, expectedImpact: decision.expectedImpact, actualOutcome: decision.actualOutcome || null })
          .where(and(eq(decisions.id, decisionId), eq(decisions.businessId, business.id)))
          .returning()
          .get()
      : db
          .insert(decisions)
          .values({ businessId: business.id, title: decision.title, decidedOn: decision.decidedOn, expectedImpact: decision.expectedImpact, actualOutcome: decision.actualOutcome || null })
          .returning()
          .get();
    if (!saved) redirect('/decisions');
    if (decision.note) {
      db.insert(notes).values({ businessId: business.id, decisionId: saved.id, body: decision.note }).run();
    }
    redirect('/decisions');
  }

  async function deleteDecision(formData: FormData) {
    'use server';
    const parsedDecisionId = entityIdSchema.safeParse(formValue(formData, 'decisionId'));
    if (!parsedDecisionId.success) throw new Error('Invalid decision identifier.');
    const currentUser = await getOrCreateUser();
    requireBusinessAccess(currentUser.id, business.id);
    db.delete(decisions).where(and(eq(decisions.id, parsedDecisionId.data), eq(decisions.businessId, business.id))).run();
    redirect('/decisions');
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">{business.name}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Decision log</h1>
        <p className="mt-3 text-slate-700">Record important decisions and capture what happened afterward.</p>
      </header>

      <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-3" method="get">
        <label className="flex flex-col gap-1 font-semibold text-slate-800 md:col-span-2">Search decisions<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={filters.q ?? ''} name="q" placeholder="Search title, impact or outcome" /></label>
        <label className="flex flex-col gap-1 font-semibold text-slate-800">Filter by month<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={month} name="month" type="month" /></label>
        <button className="min-h-11 w-fit rounded-md border border-slate-300 px-4 font-semibold text-slate-900 hover:bg-slate-100" type="submit">Apply filters</button>
      </form>

      <ActionForm action={saveDecision} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
        <h2 className="text-xl font-bold text-slate-950 md:col-span-2">Add decision</h2>
        <label className="flex flex-col gap-1 font-semibold text-slate-800">Title<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" name="title" required /></label>
        <label className="flex flex-col gap-1 font-semibold text-slate-800">Date<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" name="decidedOn" required type="date" /></label>
        <label className="flex flex-col gap-1 font-semibold text-slate-800 md:col-span-2">Expected impact<textarea className="rounded-md border border-slate-300 px-3 py-2 font-normal" name="expectedImpact" required rows={3} /></label>
        <label className="flex flex-col gap-1 font-semibold text-slate-800 md:col-span-2">Actual outcome (add later)<textarea className="rounded-md border border-slate-300 px-3 py-2 font-normal" name="actualOutcome" rows={3} /></label>
        <label className="flex flex-col gap-1 font-semibold text-slate-800 md:col-span-2">Optional note<textarea className="rounded-md border border-slate-300 px-3 py-2 font-normal" name="note" rows={2} /></label>
        <button className="min-h-11 w-fit rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800" type="submit">Add decision</button>
      </ActionForm>

      <section aria-labelledby="decision-list-heading">
        <h2 className="text-2xl font-bold text-slate-950" id="decision-list-heading">Your decisions</h2>
        <div className="mt-4 space-y-5">
          {decisionRows.length === 0 ? <p className="rounded-md border border-dashed border-slate-300 p-6 text-slate-700">No decisions match these filters.</p> : null}
          {decisionRows.map((decision) => (
            <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" key={decision.id}>
              <ActionForm action={saveDecision} className="grid gap-4 md:grid-cols-2">
                <input name="decisionId" type="hidden" value={decision.id} />
                <label className="flex flex-col gap-1 font-semibold text-slate-800">Title<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={decision.title} name="title" required /></label>
                <label className="flex flex-col gap-1 font-semibold text-slate-800">Date<input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" defaultValue={decision.decidedOn} name="decidedOn" required type="date" /></label>
                <label className="flex flex-col gap-1 font-semibold text-slate-800 md:col-span-2">Expected impact<textarea className="rounded-md border border-slate-300 px-3 py-2 font-normal" defaultValue={decision.expectedImpact} name="expectedImpact" required rows={3} /></label>
                <label className="flex flex-col gap-1 font-semibold text-slate-800 md:col-span-2">Actual outcome<textarea className="rounded-md border border-slate-300 px-3 py-2 font-normal" defaultValue={decision.actualOutcome ?? ''} name="actualOutcome" rows={3} /></label>
                <label className="flex flex-col gap-1 font-semibold text-slate-800 md:col-span-2">Add optional note<textarea className="rounded-md border border-slate-300 px-3 py-2 font-normal" name="note" rows={2} /></label>
                <div className="flex flex-wrap gap-3 md:col-span-2"><button className="min-h-10 rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800" type="submit">Save changes</button></div>
              </ActionForm>
              {notesByDecision.get(decision.id)?.length ? <div className="mt-5 border-t border-slate-200 pt-4"><h3 className="font-semibold text-slate-900">Notes</h3><ul className="mt-2 space-y-2 text-sm text-slate-700">{notesByDecision.get(decision.id)?.map((note) => <li className="rounded-md bg-slate-50 p-3" key={note.id}>{note.body}</li>)}</ul></div> : null}
              <ActionForm action={deleteDecision} className="mt-4"><input name="decisionId" type="hidden" value={decision.id} /><button className="min-h-10 rounded-md border border-red-300 px-3 font-semibold text-red-800 hover:bg-red-50" type="submit">Delete decision</button></ActionForm>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
