import Link from "next/link";
import { ResetRequestForm } from "@/components/admin/ResetForms";

export const metadata = { title: "Reset your password", robots: { index: false } };

export default function ResetRequest() {
  return (
    <div className="min-h-screen grid place-items-center px-5 py-10" style={{ background: "linear-gradient(158deg,#004526,#005B32 55%,#00733E)" }}>
      <div className="w-full max-w-[404px] rounded-2xl bg-white p-8 shadow-2xl border border-[var(--color-line)]">
        <h1 className="text-center text-[1.2rem] mb-1.5">Reset your password</h1>
        <p className="text-center text-[var(--color-ink-3)] text-[0.84rem] mb-6">
          We will email a link that works for one hour.
        </p>
        <ResetRequestForm />
        <div className="mt-5 pt-4 border-t border-[var(--color-line)] text-center">
          <Link href="/admin" className="text-[0.82rem]">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
