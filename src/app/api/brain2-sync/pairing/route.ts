import { NextResponse } from "next/server";
import { BRAIN2_SYNC_PAIRING_BODY_MAX, readBrain2BoundedJson } from "@/server/brain2/httpSecurity";
import { createPairingToken } from "@/server/brain2/syncServer";
import { requirePaidApi } from "@/server/auth/api";
export const runtime="nodejs";
export async function POST(request:Request){const auth=await requirePaidApi(request,true);if(auth)return auth;try{const body=await readBrain2BoundedJson<Record<string,unknown>>(request,BRAIN2_SYNC_PAIRING_BODY_MAX);const token=request.headers.get("x-brain2-device-token")||String(body.deviceToken||"");return NextResponse.json(await createPairingToken(String(body.deviceId||""),token),{status:201});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:400});}}
