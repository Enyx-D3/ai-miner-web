import { NextResponse } from "next/server";
import { publicPlans } from "@/server/billing/core";

export async function GET() {
  return NextResponse.json({ plans: publicPlans() }, { headers: { "cache-control": "no-store" } });
}
