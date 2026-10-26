'use client';

import { useId, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { unstable_rethrow } from 'next/navigation';

type ActionFormProps = {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  className?: string;
};

export default function ActionForm({ action, children, className }: ActionFormProps) {
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await action(formData);
        setSaved(true);
      } catch (actionError) {
        unstable_rethrow(actionError);
        // Production server errors are masked, so show a recovery hint instead of internals.
        setError('This could not be saved. Check the values, your access and your plan limits, then try again.');
      }
    });
  }

  return (
    <form
      aria-busy={pending}
      aria-describedby={error ? errorId : undefined}
      className={className}
      onSubmit={handleSubmit}
      onInvalidCapture={(event) => {
        const field = event.target as HTMLInputElement;
        field.setAttribute('aria-describedby', errorId);
        setError(field.validationMessage || 'Check the highlighted field and try again.');
      }}
    >
      {/* Disabling the fieldset blocks double submits and shows the pending state on every button. */}
      <fieldset className="contents" disabled={pending}>{children}</fieldset>
      {pending ? <p className="col-span-full text-sm text-slate-700" role="status">Saving…</p> : null}
      {saved && !pending && !error ? <p className="col-span-full text-sm font-semibold text-green-900" role="status">Saved.</p> : null}
      {error ? (
        <p className="col-span-full text-sm font-semibold text-red-800" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
