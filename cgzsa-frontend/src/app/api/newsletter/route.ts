import { POST as POSTImpl } from "@/api/newsletter/route";

export const runtime = "nodejs";

export async function POST(...args: Parameters<typeof POSTImpl>) {
  return POSTImpl(...args);
}
