import AuthForm from '../../components/AuthForm';
import AuthShell from '../../components/AuthShell';
import { requestPasswordReset } from '../auth-actions';

export const metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      description="Enter your account email. If an account exists, we will email a link to choose a new password."
      footer={<a className="font-semibold text-blue-900 underline underline-offset-4" href="/login">Back to sign in</a>}
      title="Reset your password"
    >
      <AuthForm action={requestPasswordReset} className="space-y-5">
        <div className="field">
          <label htmlFor="reset-email">Email address</label>
          <input autoComplete="email" className="input" id="reset-email" maxLength={254} name="email" required type="email" />
        </div>
        <button className="btn btn-primary mt-2 w-full" type="submit">Send recovery email</button>
      </AuthForm>
    </AuthShell>
  );
}
