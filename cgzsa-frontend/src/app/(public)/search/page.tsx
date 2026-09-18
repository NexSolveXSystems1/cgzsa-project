import Link from "next/link";
import { searchSite } from "@/lib/knowledge";
import { PageHead } from "@/components/public/PageHead";
import { CmsBody, cmsImage, cmsMetadata, getPublishedCmsPage } from "@/components/public/CmsPage";
import { STORY_IMAGES } from "@/components/public/storyImages";
import { Unavailable } from "@/components/public/Unavailable";
import { tryRead } from "@/lib/degrade";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return cmsMetadata("search", {
    path: "/search",
    title: "Search",
    description: "Search CGZSA pages, programmes, publications and frequently asked questions.",
    image: STORY_IMAGES.publicSpace,
  });
}

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const cmsPage = await getPublishedCmsPage("search");
  const image = cmsImage(cmsPage, STORY_IMAGES.publicSpace);
  // A search index that is briefly unreachable should not blank the page: the
  // header, the search box and the suggestions below are still useful.
  const search = q
    ? await tryRead("search", () => searchSite(q), [] as Awaited<ReturnType<typeof searchSite>>)
    : { data: [] as Awaited<ReturnType<typeof searchSite>>, ok: true as const };
  const results = search.data;

  return (
    <>
      <PageHead
        crumbs={[["Home", "/"], ["Search"]]}
        eyebrow={cmsPage?.section ?? "Search"}
        title={cmsPage?.title ?? "Search the site"}
        lede={cmsPage?.excerpt ?? "One query across pages, programmes, publications and frequently asked questions."}
        image={image}
      />
      <CmsBody page={cmsPage} className="pt-10 pb-0" wrapClassName="wrap prose-cg max-w-[78ch]" />
      <section className="py-14"><div className="wrap max-w-[820px]">
        <form action="/search" method="get" className="flex gap-2.5 mb-7">
          <input name="q" defaultValue={q ?? ""} placeholder="Try: water, waste, volunteer, governance" aria-label="Search" className="input flex-1" />
          <button className="btn btn-primary">Search</button>
        </form>

        {!q && (
          <p className="text-[var(--color-ink-3)] text-[0.9rem]">
            Enter a term to search. Results are ranked with the title weighted above the body text.
          </p>
        )}

        {q && !search.ok && <Unavailable what="Search" />}

        {q && search.ok && results.length === 0 && (
          <p className="text-[var(--color-ink-3)] text-[0.9rem]">
            No results for &ldquo;{q}&rdquo;. Try: water, waste, park, volunteer, governance, bylaws.
          </p>
        )}

        {results.length > 0 && (
          <>
            <p className="font-mono text-[0.75rem] tracking-[0.1em] uppercase text-[var(--color-ink-3)] mb-3.5">
              {results.length} result{results.length > 1 ? "s" : ""}
            </p>
            <div className="card divide-y divide-[var(--color-line)]">
              {results.map((r) => (
                <Link key={r.url + r.title} href={r.url} className="block px-5 py-4 no-underline text-inherit hover:bg-[var(--color-brand-soft)]">
                  <b className="block text-[0.95rem] font-semibold">{r.title}</b>
                  <small className="text-[var(--color-ink-3)] text-[0.79rem]">{r.label}</small>
                  <p className="m-0 mt-1.5 text-[0.865rem] text-[var(--color-ink-2)]">{r.body}…</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div></section>
    </>
  );
}
