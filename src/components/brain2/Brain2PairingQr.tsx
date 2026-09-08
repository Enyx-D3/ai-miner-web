"use client";
import { useMemo } from "react";
import { makeQrMatrix } from "@/lib/brain2/qrCode";

export function Brain2PairingQr({value,size=320}:{value:string;size?:number}){
  const qr=useMemo(()=>makeQrMatrix(value),[value]);const quiet=6;const full=qr.size+quiet*2;const cells:string[]=[];
  for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)if(qr.modules[y][x])cells.push(`M${x+quiet} ${y+quiet}h1v1h-1z`);
  return <svg role="img" aria-label="Brain2 device pairing QR code" width={size} height={size} viewBox={`0 0 ${full} ${full}`} className="bg-white shadow-sm" shapeRendering="crispEdges"><rect width={full} height={full} fill="white"/><path d={cells.join("")} fill="#000"/></svg>;
}
