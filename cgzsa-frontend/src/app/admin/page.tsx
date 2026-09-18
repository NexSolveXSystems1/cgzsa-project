import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { SignInForm } from "@/components/admin/SignInForm";
import { getSiteSettings } from "@/lib/settings";
import { siteLogoUrl } from "@/components/siteLogo";

export const dynamic = "force-dynamic";

export default async function SignIn() {
  const actor = await getActor();
  if (actor) redirect("/admin/dashboard");

  const s = await getSiteSettings();
  const logoUrl = await siteLogoUrl(s.logoId);

  return (
    <div className="min-h-screen grid place-items-center px-5 py-10" style={{ background: "linear-gradient(158deg,#004526,#005B32 55%,#00733E)" }}>
      <div className="w-full max-w-[404px] rounded-2xl bg-white p-8 shadow-2xl border border-[var(--color-line)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={s.orgName} className="h-20 w-auto max-w-[180px] object-contain mx-auto mb-4" />
        <h1 className="text-center text-[1.3rem] mb-1">CGZSA Content System</h1>
        <p className="text-center text-[var(--color-ink-3)] text-[0.84rem] mb-6">Authorised staff only</p>
        <SignInForm />
        <div className="mt-5 pt-4 border-t border-[var(--color-line)] text-center">
          <a href="/admin/reset" className="text-[0.82rem]">Forgotten your password?</a>
          <p className="text-[0.76rem] text-[var(--color-ink-3)] mt-2.5 m-0">
            Failed attempts are rate-limited and recorded.<br />Sessions expire after 30 minutes of inactivity.
          </p>
        </div>
      </div>
    </div>
  );
}
