export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

export function slugifyPath(input: string) {
  return input
    .split("/")
    .map((part) => slugify(part))
    .filter(Boolean)
    .join("/")
    .slice(0, 120);
}

export async function uniqueSlug(base: string, exists: (s: string) => Promise<boolean>) {
  const root = slugify(base) || "item";
  let candidate = root;
  let n = 1;
  while (await exists(candidate)) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

export async function uniquePathSlug(base: string, exists: (s: string) => Promise<boolean>) {
  const root = slugifyPath(base) || "item";
  let candidate = root;
  let n = 1;
  while (await exists(candidate)) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}
