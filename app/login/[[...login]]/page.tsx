import AuthForm from '../../../components/AuthForm';
import { requestPasswordReset, signIn } from '../../auth-actions';

type LoginPageProps = { searchParams: Promise<{ mode?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { mode } = await searchParams;
  if (mode === 'reset') {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">BootPulse</p>
        <h1 className="text-3xl font-bold text-slate-950">Reset your password</h1>
        <p className="mt-3 text-slate-700">Password-reset email delivery is not configured in this local demo. No reset token will be displayed and no email will be sent.</p>
        <AuthForm action={requestPasswordReset} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="reset-email">Email address</label>
            <input className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-blue-800" id="reset-email" name="email" type="email" autoComplete="email" maxLength={254} required />
          </div>
          <button className="min-h-11 w-full rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800" type="submit">Send reset instructions</button>
        </AuthForm>
        <a className="mt-6 text-sm font-semibold text-blue-900 underline" href="/login">Back to sign in</a>
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">BootPulse</p>
      <h1 className="text-3xl font-bold text-slate-950">Sign in</h1>
      <p className="mt-3 text-slate-700">Use your BootPulse email and password to continue.</p>
      <AuthForm action={signIn} className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="email">Email address</label>
          <input className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-blue-800" id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="password">Password</label>
          <input className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-blue-800" id="password" name="password" type="password" autoComplete="current-password" maxLength={128} required />
        </div>
        <button className="min-h-11 w-full rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800" type="submit">Sign in</button>
      </AuthForm>
      <a className="mt-6 text-sm font-semibold text-blue-900 underline" href="/login?mode=reset">Forgot your password?</a>
      <p className="mt-8 text-sm text-slate-700">Need an account? <a className="font-semibold text-blue-900 underline" href="/sign-up">Create one</a></p>
    </main>
  );
}
