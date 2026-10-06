import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Local password login has been retired. Use Google sign-in." },
    { status: 410 },
  );
}
