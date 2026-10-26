import AuthForm from '../../components/AuthForm';
import PicsStatement from '../../components/PicsStatement';
import { CONSENT_VERSION } from '../../lib/auth-validation';
import { acceptConsent, signOut } from '../auth-actions';

export const metadata = { title: 'Accept statement' };

// Reached when a signed-in account has no recorded consent. The proxy requires a session for this route.
export default function ConsentPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <a className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-900" href="/">BootPulse</a>
      <h1 className="text-3xl font-bold text-slate-950">One more step</h1>
      <p className="mt-3 text-slate-700">Your account has no recorded consent to the statement below. Please read and accept it to continue.</p>
      <PicsStatement />
      <AuthForm action={acceptConsent} className="mt-6 space-y-5">
        <input name="consentVersion" type="hidden" value={CONSENT_VERSION} />
        <label className="flex items-start gap-3 text-sm text-slate-900">
          <input className="mt-1 h-5 w-5 shrink-0 accent-blue-900" name="consent" required type="checkbox" value="accepted" />
          <span>I have read and consent to the Personal Information Collection Statement.</span>
        </label>
        <button className="min-h-11 w-full rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-60" type="submit">Accept and continue</button>
      </AuthForm>
      <form action={signOut} className="mt-4">
        <button className="min-h-11 rounded-md border border-slate-300 px-4 font-semibold text-slate-900 hover:bg-slate-100" type="submit">Decline and sign out</button>
      </form>
    </main>
  );
}
