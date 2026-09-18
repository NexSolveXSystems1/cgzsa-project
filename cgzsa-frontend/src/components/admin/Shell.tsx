import Link from "next/link";
import { signOut } from "@/lib/actions";
import type { Actor } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { siteLogoUrl } from "@/components/siteLogo";

const NAV: [string, { href: string; label: string; count?: string | number; perm?: string }[]][] = [
  ["Overview", [{ href: "/admin/dashboard", label: "Dashboard" }]],
  ["Conversations", [
    { href: "/admin/chat", label: "Live chat", perm: "chat.answer" },
    { href: "/admin/chat/assistant", label: "AI assistant", perm: "assistant.configure" },
    { href: "/admin/chat/knowledge", label: "Knowledge base", perm: "knowledge.edit" },
  ]],
  ["Content", [
    { href: "/admin/pages", label: "Pages", perm: "content.create" },
    { href: "/admin/content-blocks", label: "Content blocks", perm: "content.create" },
    { href: "/admin/news", label: "News", perm: "content.create" },
    { href: "/admin/programmes", label: "Programmes", perm: "content.create" },
    { href: "/admin/projects", label: "Projects", perm: "content.create" },
    { href: "/admin/events", label: "Events", perm: "content.create" },
    { href: "/admin/publications", label: "Publications", perm: "content.create" },
    { href: "/admin/faqs", label: "FAQs", perm: "content.create" },
  ]],
  ["Assets", [
    { href: "/admin/media", label: "Media library", perm: "media.upload" },
  ]],
  ["People", [
    { href: "/admin/team", label: "Team & departments", perm: "team.manage" },
    { href: "/admin/messages", label: "Contact messages", perm: "messages.read" },
    { href: "/admin/volunteers", label: "Volunteer applications", perm: "messages.read" },
  ]],
  ["Administration", [
    { href: "/admin/users", label: "Users & roles", perm: "users.manage" },
    { href: "/admin/audit", label: "Audit log", perm: "audit.read" },
    { href: "/admin/settings", label: "Settings", perm: "settings.manage" },
  ]],
];

export async function Shell({
  actor, active, title, actions, counts, children,
}: {
  actor: Actor;
  active: string;
  title: string;
  actions?: React.ReactNode;
  counts?: Record<string, number>;
  children: React.ReactNode;
}) {
  const s = await getSiteSettings();
  const logoUrl = await siteLogoUrl(s.logoId);

  return (
    <div className="grid min-h-screen lg:grid-cols-[246px_minmax(0,1fr)]">
      <aside className="bg-[#0C1610] text-[#A9BEB2] p-3 lg:sticky lg:top-0 lg:h-screen lg:overflow-auto">
        <div className="flex items-center gap-2.5 px-2 pb-4 border-b border-white/10 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={s.orgName} className="h-[34px] w-auto max-w-[42px] object-contain shrink-0 rounded" />
          <div className="min-w-0">
            <b className="block text-white text-[0.86rem] font-sans truncate">{actor.name}</b>
            <span className="text-[0.7rem] text-[#7E9488]">{actor.roleLabel}</span>
          </div>
        </div>

        {NAV.map(([group, items]) => {
          const visible = items.filter((i) => !i.perm || actor.permissions.has(i.perm));
          if (!visible.length) return null;
          return (
            <div key={group}>
              <p className="font-mono text-[0.62rem] tracking-[0.15em] uppercase text-[#63796D] mx-2 mt-4 mb-1.5">{group}</p>
              {visible.map((i) => {
                const on = active === i.href;
                const n = counts?.[i.href];
                return (
                  <Link key={i.href} href={i.href}
                    aria-current={on ? "page" : undefined}
                    className={"flex items-center gap-2.5 px-2.5 py-2 rounded-[5px] no-underline text-[0.855rem] " +
                      (on ? "bg-[var(--color-brand-2)] text-[#06120B] font-semibold" : "text-[#A9BEB2] hover:bg-white/5 hover:text-white")}>
                    <span>{i.label}</span>
                    {n !== undefined && n > 0 && (
                      <span className={"ml-auto font-mono text-[0.68rem] px-1.5 rounded-full " + (on ? "bg-black/15" : "bg-white/10")}>{n}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}

        <p className="font-mono text-[0.62rem] tracking-[0.15em] uppercase text-[#63796D] mx-2 mt-4 mb-1.5">Session</p>
        <Link href="/admin/account" className="block px-2.5 py-2 rounded-[5px] no-underline text-[0.855rem] text-[#A9BEB2] hover:bg-white/5 hover:text-white">Your account</Link>
        <Link href="/" className="block px-2.5 py-2 rounded-[5px] no-underline text-[0.855rem] text-[#A9BEB2] hover:bg-white/5 hover:text-white">View public site</Link>
        <form action={signOut}>
          <button type="submit" data-testid="sign-out" className="w-full text-left px-2.5 py-2 rounded-[5px] text-[0.855rem] text-[#A9BEB2] hover:bg-white/5 hover:text-white">Sign out</button>
        </form>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-30 bg-white border-b border-[var(--color-line)] px-6 min-h-[62px] flex items-center gap-4">
          <h1 className="font-sans text-[1.16rem] font-bold tracking-[-0.01em]">{title}</h1>
          <div className="flex-1" />
          {actions}
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
