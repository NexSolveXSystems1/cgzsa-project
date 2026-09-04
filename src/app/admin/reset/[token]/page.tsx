import { ResetCompleteForm } from "@/components/admin/ResetForms";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetComplete({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="min-h-screen grid place-items-center px-5 py-10" style={{ background: "linear-gradient(158deg,#004526,#005B32 55%,#00733E)" }}>
      <div className="w-full max-w-[404px] rounded-2xl bg-white p-8 shadow-2xl border border-[var(--color-line)]">
        <h1 className="text-center text-[1.2rem] mb-1.5">Choose a new password</h1>
        <p className="text-center text-[var(--color-ink-3)] text-[0.84rem] mb-6">
          At least twelve characters. Every other session will be signed out.
        </p>
        <ResetCompleteForm token={token} />
      </div>
    </div>
  );
}
