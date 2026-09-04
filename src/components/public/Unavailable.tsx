/**
 * Shown in place of a list when the data behind it could not be loaded.
 *
 * Server-rendered, so it appears in the first bytes of HTML rather than after
 * JavaScript has loaded and hydrated — which matters on the connections this
 * site is built for. The rest of the page (header, navigation, search) is still
 * usable, so a visitor is not stranded.
 */
export function Unavailable({ what }: { what: string }) {
  return (
    <div
      role="status"
      className="rounded-r-lg border border-l-[3px] border-[var(--color-line)] border-l-[var(--color-signal)] bg-[var(--color-surface)] px-6 py-6"
    >
      <p className="font-semibold text-[0.95rem] m-0 mb-1.5">{what} cannot be loaded right now</p>
      <p className="m-0 text-[0.9rem] text-[var(--color-ink-2)] max-w-[52ch]">
        This is a temporary fault at our end. Please try again in a few minutes — the rest of the site is working
        normally.
      </p>
    </div>
  );
}
