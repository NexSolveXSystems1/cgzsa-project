import { POST as POSTImpl } from "@/api/assistant/test/route";

export const runtime = "nodejs";

export async function POST(...args: Parameters<typeof POSTImpl>) {
  return POSTImpl(...args);
}
