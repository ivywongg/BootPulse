import AuthForm from '../../components/AuthForm';
import AuthShell from '../../components/AuthShell';
import { updatePassword } from '../auth-actions';

export const metadata = { title: 'New password' };

// Reached from the recovery email via /auth/confirm, which establishes a short-lived session.
// The proxy redirects visitors without a session to /login.
export default function ResetPasswordPage() {
  return (
    <AuthShell description="Use at least 8 characters." title="Choose a new password">
      <AuthForm action={updatePassword} className="space-y-5">
        <div className="field">
          <label htmlFor="password">New password</label>
          <input autoComplete="new-password" className="input" id="password" maxLength={128} minLength={8} name="password" required type="password" />
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input autoComplete="new-password" className="input" id="confirmPassword" maxLength={128} minLength={8} name="confirmPassword" required type="password" />
        </div>
        <button className="btn btn-primary mt-2 w-full" type="submit">Update password</button>
      </AuthForm>
    </AuthShell>
  );
}
