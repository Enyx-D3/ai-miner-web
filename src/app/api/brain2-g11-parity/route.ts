import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { verifyG11GoldenParity } from "@/lib/brain2/g11Parity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await readFile(path.join(process.cwd(), "spec/v1/golden-graph-fixture.json"), "utf8");
    const report = await verifyG11GoldenParity(JSON.parse(raw));
    return NextResponse.json(report, {
      status: report.pass ? 200 : 409,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({
      format: "B2_G11_PARITY_REPORT",
      version: 1,
      surface: "WEB",
      pass: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
