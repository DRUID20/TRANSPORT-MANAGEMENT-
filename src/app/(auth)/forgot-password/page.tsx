import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ForgotPasswordForm } from "./forgot-form";

/**
 * Forgot password — requests a 6-digit OTP delivered to the user's email.
 * The form always shows the same success message regardless of whether
 * the email exists, to avoid leaking which addresses are registered.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37,99,235,0.20), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(15,76,129,0.20), transparent 60%)",
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="glass animate-content-in rounded-xl p-8 shadow-modal">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Logo variant="horizontal" />
          </div>
          <h1 className="mb-1 text-center text-xl font-semibold tracking-tight text-fg-primary">
            Reset your password
          </h1>
          <p className="mb-6 text-center text-sm text-fg-secondary">
            We&apos;ll email you a one-time 6-digit code. It expires in 15 minutes.
          </p>
          <ForgotPasswordForm />
          <p className="mt-6 text-center text-xs text-fg-tertiary">
            <Link href="/login" className="text-brand-blue hover:underline">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
