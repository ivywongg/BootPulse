import AuthForm from '../../../components/AuthForm';
import { signIn } from '../../auth-actions';
import { safeNextPath } from '../../../lib/site-url';

export const metadata = { title: 'Sign in' };

type LoginPageProps = { searchParams: Promise<{ error?: string; from?: string; reset?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, from } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <a className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-900" href="/">BootPulse</a>
      <h1 className="text-3xl font-bold text-slate-950">Sign in</h1>
      <p className="mt-3 text-slate-700">Use your BootPulse email and password to continue.</p>
      {error === 'link' ? (
        <p className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900" role="alert">
          That email link is invalid or has expired. Sign in, or request a new password-recovery email.
        </p>
      ) : null}
      <AuthForm action={signIn} className="mt-8 space-y-5">
        <input name="from" type="hidden" value={safeNextPath(from)} />
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="email">Email address</label>
          <input className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950" id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="password">Password</label>
          <input className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950" id="password" name="password" type="password" autoComplete="current-password" maxLength={128} required />
        </div>
        <button className="min-h-11 w-full rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-60" type="submit">Sign in</button>
      </AuthForm>
      <a className="mt-6 text-sm font-semibold text-blue-900 underline" href="/forgot-password">Forgot your password?</a>
      <p className="mt-8 text-sm text-slate-700">Need an account? <a className="font-semibold text-blue-900 underline" href="/sign-up">Create one</a></p>
    </main>
  );
}
