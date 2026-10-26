import AuthForm from '../../../components/AuthForm';
import AuthShell from '../../../components/AuthShell';
import { signIn } from '../../auth-actions';
import { safeNextPath } from '../../../lib/site-url';

export const metadata = { title: 'Sign in' };

type LoginPageProps = { searchParams: Promise<{ error?: string; from?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, from } = await searchParams;
  return (
    <AuthShell
      description="Use your BootPulse email and password to continue."
      footer={<>New to BootPulse? <a className="font-semibold text-blue-900 underline underline-offset-4" href="/sign-up">Create an account</a></>}
      title="Sign in"
    >
      {error === 'link' ? (
        <p className="alert mb-5" role="alert">
          That email link is invalid or has expired. Sign in, or request a new password-recovery email.
        </p>
      ) : null}
      <AuthForm action={signIn} className="space-y-5">
        <input name="from" type="hidden" value={safeNextPath(from)} />
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input autoComplete="email" className="input" id="email" maxLength={254} name="email" required type="email" />
        </div>
        <div className="field">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password">Password</label>
            <a className="text-sm font-semibold text-blue-900 underline underline-offset-4" href="/forgot-password">Forgot password?</a>
          </div>
          <input autoComplete="current-password" className="input" id="password" maxLength={128} name="password" required type="password" />
        </div>
        <button className="btn btn-primary mt-2 w-full" type="submit">Sign in</button>
      </AuthForm>
    </AuthShell>
  );
}
