import AuthForm from '../../components/AuthForm';
import { updatePassword } from '../auth-actions';

export const metadata = { title: 'New password' };

// Reached from the recovery email via /auth/confirm, which establishes a short-lived session.
// The proxy redirects visitors without a session to /login.
export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <a className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-900" href="/">BootPulse</a>
      <h1 className="text-3xl font-bold text-slate-950">Choose a new password</h1>
      <AuthForm action={updatePassword} className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="password">New password</label>
          <input className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950" id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="confirmPassword">Confirm new password</label>
          <input className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950" id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
        </div>
        <button className="min-h-11 w-full rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-60" type="submit">Update password</button>
      </AuthForm>
    </main>
  );
}
