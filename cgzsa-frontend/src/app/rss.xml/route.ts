import { GET as GETImpl } from "@/api/rss.xml/route";

export const revalidate = 600;

export async function GET(...args: Parameters<typeof GETImpl>) {
  return GETImpl(...args);
}
