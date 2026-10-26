import { CONSENT_VERSION } from '../lib/auth-validation';

export default function PicsStatement() {
  return (
    <section aria-labelledby="pics-heading" className="rounded-lg border border-slate-300 bg-slate-50 p-5">
      <h2 className="text-base font-bold text-slate-950" id="pics-heading">Personal Information Collection Statement</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
        <p>BootPulse collects your email address and password, and the business figures you choose to enter, such as cash balances, revenue, expenses, scenarios, milestones and decisions. Please enter fictional or non-sensitive figures only: this is a university assignment demo.</p>
        <p>Sign-in is handled by Supabase Auth, which stores a hashed password and sends confirmation and recovery emails. Your planning data is stored in a hosted PostgreSQL database. We keep a copy of your email address so that business owners can share a business with an existing account. The time and version of this statement are recorded when you accept it.</p>
        <p>Plans are an assignment demo. No payment card, bank or billing details are collected or processed.</p>
        <p>To request deletion of your account and data, use the delete account controls in <strong>Settings</strong> after signing in. Deletion removes your account and the businesses you own.</p>
        <p className="font-medium text-slate-900">Statement version: {CONSENT_VERSION}</p>
      </div>
    </section>
  );
}
