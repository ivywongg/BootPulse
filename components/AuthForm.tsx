'use client';

import { useActionState, useId, useState, type ReactNode } from 'react';
import type { AuthFormState } from '../lib/auth-validation';

type AuthFormProps = {
  action: (state: AuthFormState, data: FormData) => Promise<AuthFormState>;
  children: ReactNode;
  className?: string;
};

export default function AuthForm({ action, children, className }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [validationError, setValidationError] = useState<string | null>(null);
  const errorId = useId();
  const error = validationError ?? state.error;
  return (
    <form
      action={formAction}
      aria-busy={pending}
      aria-describedby={error ? errorId : undefined}
      className={className}
      onSubmit={() => setValidationError(null)}
      onInvalidCapture={(event) => {
        const field = event.target as HTMLInputElement;
        field.setAttribute('aria-describedby', errorId);
        setValidationError(field.validationMessage || 'Check the entered values.');
      }}
    >
      <fieldset className="contents" disabled={pending}>{children}</fieldset>
      {pending ? <p className="text-sm text-slate-700" role="status">Working…</p> : null}
      {error ? <p className="text-sm font-semibold text-red-800" id={errorId} role="alert">{error}</p> : null}
      {!error && state.message ? <p className="rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900" role="status">{state.message}</p> : null}
    </form>
  );
}
