import AuthForm from '../../components/AuthForm';
import AuthShell from '../../components/AuthShell';
import PicsStatement from '../../components/PicsStatement';
import { CONSENT_VERSION } from '../../lib/auth-validation';
import { acceptConsent, signOut } from '../auth-actions';

export const metadata = { title: 'Accept statement' };

// Reached when a signed-in account has no recorded consent. The proxy requires a session for this route.
export default function ConsentPage() {
  return (
    <AuthShell
      description="Your account has no recorded consent to the statement below. Please read and accept it to continue."
      title="One more step"
      width="wide"
    >
      <PicsStatement />
      <AuthForm action={acceptConsent} className="mt-6 space-y-5">
        <input name="consentVersion" type="hidden" value={CONSENT_VERSION} />
        <label className="check">
          <input name="consent" required type="checkbox" value="accepted" />
          <span>I have read and consent to the Personal Information Collection Statement.</span>
        </label>
        <button className="btn btn-primary w-full sm:w-auto" type="submit">Accept and continue</button>
      </AuthForm>
      <form action={signOut} className="mt-3">
        <button className="btn btn-ghost" type="submit">Decline and sign out</button>
      </form>
    </AuthShell>
  );
}
