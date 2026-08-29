import { NextResponse } from "next/server";
import { createPairingToken } from "@/server/brain2/syncServer";
export const runtime="nodejs";
export async function POST(request:Request){try{const body=await request.json();const token=request.headers.get("x-brain2-device-token")||String(body.deviceToken||"");return NextResponse.json(await createPairingToken(String(body.deviceId||""),token),{status:201});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:400});}}
