import { POST as POSTImpl } from "@/api/upload/route";

export const runtime = "nodejs";

export async function POST(...args: Parameters<typeof POSTImpl>) {
  return POSTImpl(...args);
}
