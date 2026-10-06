import { NextResponse } from "next/server";
import { BRAIN2_SYNC_SIGNAL_BODY_MAX, readBrain2BoundedJson } from "@/server/brain2/httpSecurity";
import { postSyncSignal, pullSyncSignals } from "@/server/brain2/syncServer";
import { requirePaidApi } from "@/server/auth/api";
export const runtime="nodejs";
function token(request:Request,fallback?:string){return request.headers.get("x-brain2-device-token")||request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||fallback||"";}
export async function GET(request:Request){const auth=await requirePaidApi(request);if(auth)return auth;try{const url=new URL(request.url);const deviceId=url.searchParams.get("deviceId")||"";return NextResponse.json({signals:await pullSyncSignals({deviceId,deviceToken:token(request),consume:url.searchParams.get("consume")!=="0",limit:Number(url.searchParams.get("limit")||100)})});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:400});}}
export async function POST(request:Request){const auth=await requirePaidApi(request,true);if(auth)return auth;try{const body=await readBrain2BoundedJson<Record<string,unknown>>(request,BRAIN2_SYNC_SIGNAL_BODY_MAX);return NextResponse.json({signal:await postSyncSignal({fromDeviceId:String(body.fromDeviceId||""),deviceToken:token(request),toDeviceId:String(body.toDeviceId||""),kind:String(body.kind||""),payload:body.payload,ttlSeconds:Number(body.ttlSeconds||120)})},{status:201});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:400});}}
