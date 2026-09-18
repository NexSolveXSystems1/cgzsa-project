const PATHS: Record<string, string> = {
  waste: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5",
  water: "M12 3s6 6.4 6 10.3A6 6 0 0 1 6 13.3C6 9.4 12 3 12 3z",
  park: "M12 21v-6M8.5 15h7L12 4 8.5 15zM6 21h12",
  bench: "M3 10h18M3 14h18M5 10v8M19 10v8M4 7h16",
  flood: "M2 16c2 0 2-1.6 4-1.6s2 1.6 4 1.6 2-1.6 4-1.6 2 1.6 4 1.6 2-1.6 4-1.6M2 20c2 0 2-1.6 4-1.6s2 1.6 4 1.6 2-1.6 4-1.6 2 1.6 4 1.6 2-1.6 4-1.6M6 11V6l6-3 6 3v5",
};

export function ProgramIcon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name] ?? PATHS.park} />
    </svg>
  );
}
