import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authContextFromCookieReader, localDevDemoContext } from "@/server/auth/core";

export * from "@/server/auth/core";

export async function requireUser() {
  const demo = localDevDemoContext((await headers()).get("host"));
  if (demo) return demo;
  const context = await authContextFromCookieReader(await cookies());
  if (!context) redirect("/login");
  return context;
}

export async function requirePaidEntitlement() {
  const context = await requireUser();
  if (!context.entitlement.active) redirect("/subscribe");
  return context;
}
