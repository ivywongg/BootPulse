import AuthForm from '../../components/AuthForm';
import { requestPasswordReset } from '../auth-actions';

export const metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <a className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-900" href="/">BootPulse</a>
      <h1 className="text-3xl font-bold text-slate-950">Reset your password</h1>
      <p className="mt-3 text-slate-700">Enter your account email. If an account exists, we will email a link to choose a new password.</p>
      <AuthForm action={requestPasswordReset} className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="reset-email">Email address</label>
          <input className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950" id="reset-email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </div>
        <button className="min-h-11 w-full rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-60" type="submit">Send recovery email</button>
      </AuthForm>
      <a className="mt-6 text-sm font-semibold text-blue-900 underline" href="/login">Back to sign in</a>
    </main>
  );
}
