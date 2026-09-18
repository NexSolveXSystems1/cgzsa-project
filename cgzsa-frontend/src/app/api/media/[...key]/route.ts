import { GET as GETImpl } from "@/api/media/[...key]/route";

export const runtime = "nodejs";

export async function GET(...args: Parameters<typeof GETImpl>) {
  return GETImpl(...args);
}
