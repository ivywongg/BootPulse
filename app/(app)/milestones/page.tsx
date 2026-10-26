import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getActiveBusiness, requireBusinessAccess } from '../../../lib/access';
import { getAuthenticatedUser, getOrCreateUser } from '../../../lib/auth';
import { db } from '../../../db';
import { milestones, notes } from '../../../db/schema';
import ActionForm from '../../../components/ActionForm';
import { calendarDateSchema, entityIdSchema } from '../../../lib/validation';

export const metadata = { title: 'Milestones' };

const milestoneSchema = z.object({
  milestoneId: z.string().trim().transform((value) => value || undefined).pipe(entityIdSchema.optional()),
  title: z.string().trim().min(1).max(160),
  targetDate: calendarDateSchema,
  status: z.enum(['planned', 'done']),
  note: z.string().trim().max(500),
});

function formValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? '');
}

export default async function MilestonesPage() {
  const user = await getOrCreateUser();
  const business = await getActiveBusiness(user.id);
  const [milestoneRows, noteRows] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.businessId, business.id)).orderBy(milestones.targetDate),
    db.select().from(notes).where(eq(notes.businessId, business.id)),
  ]);
  const notesByMilestone = new Map<string, typeof noteRows>();
  for (const note of noteRows) {
    if (!note.milestoneId) continue;
    const current = notesByMilestone.get(note.milestoneId) ?? [];
    current.push(note);
    notesByMilestone.set(note.milestoneId, current);
  }

  async function saveMilestone(formData: FormData) {
    'use server';
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) redirect('/login');
    const businessId = await requireBusinessAccess(currentUser.id, business.id);
    const parsed = milestoneSchema.parse({
      milestoneId: formValue(formData, 'milestoneId'),
      title: formValue(formData, 'title'),
      targetDate: formValue(formData, 'targetDate'),
      status: formValue(formData, 'status'),
      note: formValue(formData, 'note'),
    });
    const [saved] = parsed.milestoneId
      ? await db
          .update(milestones)
          .set({ title: parsed.title, targetDate: parsed.targetDate, status: parsed.status })
          .where(and(eq(milestones.id, parsed.milestoneId), eq(milestones.businessId, businessId)))
          .returning()
      : await db
          .insert(milestones)
          .values({ businessId, title: parsed.title, targetDate: parsed.targetDate, status: parsed.status })
          .returning();
    if (!saved) throw new Error('Milestone not found.');
    if (parsed.note) {
      await db.insert(notes).values({ businessId, milestoneId: saved.id, body: parsed.note });
    }
    redirect('/milestones');
  }

  async function deleteMilestone(formData: FormData) {
    'use server';
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) redirect('/login');
    const businessId = await requireBusinessAccess(currentUser.id, business.id);
    const milestoneId = entityIdSchema.parse(formValue(formData, 'milestoneId'));
    await db.delete(milestones).where(and(eq(milestones.id, milestoneId), eq(milestones.businessId, businessId)));
    redirect('/milestones');
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">{business.name}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Milestones</h1>
        <p className="mt-3 text-slate-700">Track important goals and the dates they should be completed.</p>
      </header>

      <ActionForm action={saveMilestone} className="card grid gap-4 md:grid-cols-4">
        <h2 className="text-xl font-bold text-slate-950 md:col-span-4">Add milestone</h2>
        <label className="field md:col-span-2">Title<input className="input" name="title" required /></label>
        <label className="field">Target date<input className="input" name="targetDate" required type="date" /></label>
        <label className="field">Status<select className="input" defaultValue="planned" name="status"><option value="planned">Planned</option><option value="done">Done</option></select></label>
        <label className="field md:col-span-4">Optional note<textarea className="input" name="note" rows={2} /></label>
        <button className="btn btn-primary w-fit" type="submit">Add milestone</button>
      </ActionForm>

      <section aria-labelledby="milestone-list-heading">
        <h2 className="text-2xl font-bold text-slate-950" id="milestone-list-heading">Your milestones</h2>
        <div className="mt-4 space-y-5">
          {milestoneRows.length === 0 ? <p className="empty">No milestones yet.</p> : null}
          {milestoneRows.map((milestone) => (
            <article className="card" key={milestone.id}>
              <ActionForm action={saveMilestone} className="grid gap-4 md:grid-cols-4">
                <input name="milestoneId" type="hidden" value={milestone.id} />
                <label className="field md:col-span-2">Title<input className="input" defaultValue={milestone.title} name="title" required /></label>
                <label className="field">Target date<input className="input" defaultValue={milestone.targetDate} name="targetDate" required type="date" /></label>
                <label className="field">Status<select className="input" defaultValue={milestone.status} name="status"><option value="planned">Planned</option><option value="done">Done</option></select></label>
                <label className="field md:col-span-4">Add optional note<textarea className="input" name="note" rows={2} /></label>
                <div className="flex flex-wrap gap-3 md:col-span-4"><button className="btn btn-primary btn-sm" type="submit">Save changes</button></div>
              </ActionForm>
              {notesByMilestone.get(milestone.id)?.length ? <div className="mt-5 border-t border-slate-200 pt-4"><h3 className="font-semibold text-slate-900">Notes</h3><ul className="mt-2 space-y-2 text-sm text-slate-700">{notesByMilestone.get(milestone.id)?.map((note) => <li className="rounded-md bg-slate-50 p-3" key={note.id}>{note.body}</li>)}</ul></div> : null}
              <ActionForm action={deleteMilestone} className="mt-4"><input name="milestoneId" type="hidden" value={milestone.id} /><button className="btn btn-danger-outline btn-sm" type="submit">Delete milestone</button></ActionForm>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
