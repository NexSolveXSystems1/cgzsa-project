import { GET as GETImpl } from "@/api/chat/stream/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(...args: Parameters<typeof GETImpl>) {
  return GETImpl(...args);
}
