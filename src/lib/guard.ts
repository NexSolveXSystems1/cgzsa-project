import { redirect } from "next/navigation";
import { getActor, type Actor } from "./auth";

/**
 * Every admin screen starts here. An unauthenticated visitor goes to sign-in;
 * an authenticated one without the permission goes back to the dashboard rather
 * than seeing a screen they cannot use.
 */
export async function guard(permission?: string): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/admin");
  if (permission && !actor.permissions.has(permission)) redirect("/admin/dashboard");
  return actor;
}
