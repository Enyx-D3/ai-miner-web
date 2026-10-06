import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authContextFromCookieReader } from "@/server/auth/core";

export * from "@/server/auth/core";

export async function requireUser() {
  const context = await authContextFromCookieReader(await cookies());
  if (!context) redirect("/login");
  return context;
}

export async function requirePaidEntitlement() {
  const context = await requireUser();
  if (!context.entitlement.active) redirect("/subscribe");
  return context;
}
