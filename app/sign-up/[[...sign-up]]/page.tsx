'use client';

import { useState } from 'react';
import AuthForm from '../../../components/AuthForm';
import AuthShell from '../../../components/AuthShell';
import PicsStatement from '../../../components/PicsStatement';
import { signUp } from '../../auth-actions';
import { CONSENT_VERSION } from '../../../lib/auth-validation';

export default function SignUpPage() {
  const [consented, setConsented] = useState(false);
  return (
    <AuthShell
      description="Read the statement below, accept it, then enter your details."
      footer={<>Already have an account? <a className="font-semibold text-blue-900 underline underline-offset-4" href="/login">Sign in</a></>}
      title="Create your account"
      width="wide"
    >
      <PicsStatement />
      <label className="check mt-6" htmlFor="consent">
        <input checked={consented} id="consent" name="consent" onChange={(event) => setConsented(event.target.checked)} type="checkbox" />
        <span>I have read and consent to the Personal Information Collection Statement.</span>
      </label>
      {consented ? (
        <AuthForm action={signUp} className="mx-auto mt-8 max-w-sm space-y-5 border-t border-slate-200 pt-8">
          <h2 className="section-title">Account details</h2>
          <input name="consent" type="hidden" value="accepted" />
          <input name="consentVersion" type="hidden" value={CONSENT_VERSION} />
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input autoComplete="email" className="input" id="email" maxLength={254} name="email" required type="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input autoComplete="new-password" className="input" id="password" maxLength={128} minLength={8} name="password" required type="password" />
            <p className="hint">At least 8 characters.</p>
          </div>
          <button className="btn btn-primary mt-2 w-full" type="submit">Create account</button>
        </AuthForm>
      ) : (
        <p className="notice mt-6">Tick the box to continue.</p>
      )}
    </AuthShell>
  );
}
