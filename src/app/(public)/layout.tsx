import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { ChatWidget } from "@/components/public/ChatWidget";
import { getAssistantSettings } from "@/lib/settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const a = await getAssistantSettings();
  return (
    <>
      <a href="#main" className="skip-link sr-only focus:not-sr-only focus:absolute focus:left-0 focus:top-0 focus:z-[999] focus:bg-[var(--color-brand)] focus:text-white focus:px-4 focus:py-2.5">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      {a.enabled && <ChatWidget assistantName={a.assistantName} greeting={a.greeting} />}
    </>
  );
}
