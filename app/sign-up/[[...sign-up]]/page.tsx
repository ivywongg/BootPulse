'use client';

import { useState } from 'react';
import AuthForm from '../../../components/AuthForm';
import { signUp } from '../../auth-actions';
import { CONSENT_VERSION } from '../../../lib/auth-constants';

export default function SignUpPage() {
  const [consented, setConsented] = useState(false);
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">BootPulse</p>
      <h1 className="text-3xl font-bold text-slate-950">Create your account</h1>
      <section className="mt-6 rounded-lg border border-slate-300 bg-slate-50 p-5" aria-labelledby="pics-heading">
        <h2 className="text-xl font-semibold text-slate-950" id="pics-heading">Personal Information Collection Statement</h2>
        <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
          <p>BootPulse collects your email address, a password hash for local sign-in, a local session identifier, and the business figures you enter, such as cash balances, revenue, expenses, scenarios, milestones, and decisions. Your password is not stored in plain text.</p>
          <p>We use this information to provide cash-flow, runway, projection, and planning features. Payment card details are not collected by this local demo.</p>
          <p>To request deletion of your account and data, use the account deletion controls in <a className="ml-1 font-semibold text-blue-900 underline" href="/settings">Settings</a>.</p>
          <p className="font-medium text-slate-900">Statement version: {CONSENT_VERSION}</p>
        </div>
      </section>
      <label className="mt-6 flex items-start gap-3 text-sm text-slate-900" htmlFor="consent">
        <input className="mt-1 h-5 w-5 shrink-0 accent-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800" id="consent" name="consent" type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />
        <span>I have read and consent to the Personal Information Collection Statement.</span>
      </label>
      {consented ? (
        <AuthForm action={signUp} className="mt-8 space-y-5">
          <h2 className="text-xl font-semibold text-slate-950">Account details</h2>
          <input name="consent" type="hidden" value="accepted" />
          <input name="consentVersion" type="hidden" value={CONSENT_VERSION} />
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="email">Email address</label>
            <input className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-blue-800" id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="password">Password</label>
            <input className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-blue-800" id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
          </div>
          <button className="min-h-11 w-full rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800" type="submit">Create account</button>
        </AuthForm>
      ) : <p className="mt-6 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">Please read the statement and tick the consent box to continue.</p>}
      <p className="mt-8 text-sm text-slate-700">Already have an account? <a className="font-semibold text-blue-900 underline" href="/login">Sign in</a></p>
    </main>
  );
}
