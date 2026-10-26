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
    <form action={formAction} aria-busy={pending} aria-describedby={error ? errorId : undefined} className={className}
      onSubmit={() => setValidationError(null)}
      onInvalidCapture={(event) => {
        const field = event.target as HTMLInputElement;
        field.setAttribute('aria-describedby', errorId);
        setValidationError(field.validationMessage || 'Check the entered values.');
      }}>
      <fieldset className="contents" disabled={pending}>{children}</fieldset>
      {error ? <p className="text-sm font-semibold text-red-800" id={errorId} role="alert">{error}</p> : null}
    </form>
  );
}
