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
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
      } catch (actionError) {
        unstable_rethrow(actionError);
        // Production server errors must not expose internal details.
        setError('Unable to submit this form. Check the entered values and your plan limits, then try again.');
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
      {children}
      {error ? (
        <p className="col-span-full text-sm font-semibold text-red-800" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
