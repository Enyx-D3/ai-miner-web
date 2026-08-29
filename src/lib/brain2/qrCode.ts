/**
 * Dependency-free QR encoder for Brain2 pairing invitations.
 * Byte mode, error correction L, versions 1-10. Pairing URLs are intentionally short.
 */
const ALIGNMENT: Record<number, number[]> = {
  1: [], 2: [6,18], 3: [6,22], 4: [6,26], 5: [6,30], 6: [6,34],
  7: [6,22,38], 8: [6,24,42], 9: [6,26,46], 10: [6,28,50],
};
const BLOCKS: Record<number,{data:number[];ecc:number}> = {
  1:{data:[19],ecc:7}, 2:{data:[34],ecc:10}, 3:{data:[55],ecc:15}, 4:{data:[80],ecc:20}, 5:{data:[108],ecc:26},
  6:{data:[68,68],ecc:18}, 7:{data:[78,78],ecc:20}, 8:{data:[97,97],ecc:24}, 9:{data:[116,116],ecc:30}, 10:{data:[68,68,69,69],ecc:18},
};

type BitMatrix = { modules:boolean[][]; size:number };

function appendBits(out:number[], value:number, length:number){for(let i=length-1;i>=0;i--)out.push((value>>>i)&1);}
function gfMultiply(x:number,y:number){let z=0;for(let i=7;i>=0;i--){z=(z<<1)^(((z>>>7)&1)*0x11d);if(((y>>>i)&1)!==0)z^=x;}return z&0xff;}
function rsDivisor(degree:number){const result=new Array<number>(degree).fill(0);result[degree-1]=1;let root=1;for(let i=0;i<degree;i++){for(let j=0;j<degree;j++){result[j]=gfMultiply(result[j],root);if(j+1<degree)result[j]^=result[j+1];}root=gfMultiply(root,2);}return result;}
function rsRemainder(data:number[],divisor:number[]){const result=new Array<number>(divisor.length).fill(0);for(const b of data){const factor=b^result[0];result.shift();result.push(0);for(let i=0;i<result.length;i++)result[i]^=gfMultiply(divisor[i],factor);}return result;}

function chooseVersion(byteLength:number){for(let version=1;version<=10;version++){const capacity=BLOCKS[version].data.reduce((a,b)=>a+b,0);const countBits=version<=9?8:16;const needed=4+countBits+byteLength*8;if(needed<=capacity*8)return version;}throw new Error("Brain2 QR pairing invitation is too large.");}
function dataCodewords(text:string,version:number){const bytes=[...new TextEncoder().encode(text)];const config=BLOCKS[version];const capacity=config.data.reduce((a,b)=>a+b,0);const bits:number[]=[];appendBits(bits,0b0100,4);appendBits(bits,bytes.length,version<=9?8:16);for(const b of bytes)appendBits(bits,b,8);const capBits=capacity*8;for(let i=0;i<Math.min(4,capBits-bits.length);i++)bits.push(0);while(bits.length%8)bits.push(0);const out:number[]=[];for(let i=0;i<bits.length;i+=8){let b=0;for(let j=0;j<8;j++)b=(b<<1)|(bits[i+j]??0);out.push(b);}for(let pad=0;out.length<capacity;pad++)out.push(pad%2===0?0xec:0x11);return out;}
function interleave(text:string,version:number){const config=BLOCKS[version];const data=dataCodewords(text,version);const blocks:number[][]=[];let offset=0;for(const len of config.data){blocks.push(data.slice(offset,offset+len));offset+=len;}const divisor=rsDivisor(config.ecc);const ecc=blocks.map((block)=>rsRemainder(block,divisor));const out:number[]=[];const maxData=Math.max(...config.data);for(let i=0;i<maxData;i++)for(const block of blocks)if(i<block.length)out.push(block[i]);for(let i=0;i<config.ecc;i++)for(const block of ecc)out.push(block[i]);return out;}
function bchRemainder(value:number,poly:number){let x=value;const polyDegree=31-Math.clz32(poly);while((31-Math.clz32(x))>=polyDegree)x^=poly<<((31-Math.clz32(x))-polyDegree);return x;}
function formatBits(mask:number){const data=(1<<3)|mask;return ((data<<10)|bchRemainder(data<<10,0x537))^0x5412;}
function versionBits(version:number){return (version<<12)|bchRemainder(version<<12,0x1f25);}
function maskBit(mask:number,x:number,y:number){switch(mask){case 0:return (x+y)%2===0;case 1:return y%2===0;case 2:return x%3===0;case 3:return (x+y)%3===0;case 4:return (Math.floor(y/2)+Math.floor(x/3))%2===0;case 5:return (x*y)%2+(x*y)%3===0;case 6:return ((x*y)%2+(x*y)%3)%2===0;default:return ((x+y)%2+(x*y)%3)%2===0;}}

function makeBase(version:number){const size=version*4+17;const modules=Array.from({length:size},()=>Array<boolean>(size).fill(false));const func=Array.from({length:size},()=>Array<boolean>(size).fill(false));const set=(x:number,y:number,dark:boolean)=>{if(x>=0&&y>=0&&x<size&&y<size){modules[y][x]=dark;func[y][x]=true;}};
  const finder=(cx:number,cy:number)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const dist=Math.max(Math.abs(dx),Math.abs(dy));set(cx+dx,cy+dy,dist!==2&&dist!==4);}};
  finder(3,3);finder(size-4,3);finder(3,size-4);
  for(let i=8;i<size-8;i++){set(6,i,i%2===0);set(i,6,i%2===0);}
  for(const y of ALIGNMENT[version])for(const x of ALIGNMENT[version]){if(func[y]?.[x])continue;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(x+dx,y+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);}
  // Reserve/write format information using mask 0 initially. It remains functional during data placement.
  const f=formatBits(0);for(let i=0;i<=5;i++)set(8,i,((f>>>i)&1)!==0);set(8,7,((f>>>6)&1)!==0);set(8,8,((f>>>7)&1)!==0);set(7,8,((f>>>8)&1)!==0);for(let i=9;i<15;i++)set(14-i,8,((f>>>i)&1)!==0);
  for(let i=0;i<8;i++)set(size-1-i,8,((f>>>i)&1)!==0);for(let i=8;i<15;i++)set(8,size-15+i,((f>>>i)&1)!==0);set(8,size-8,true);
  if(version>=7){const v=versionBits(version);for(let i=0;i<18;i++){const bit=((v>>>i)&1)!==0;const a=size-11+(i%3),b=Math.floor(i/3);set(a,b,bit);set(b,a,bit);}}
  return {modules,func,size};
}
function drawFormat(modules:boolean[][],mask:number){const size=modules.length;const f=formatBits(mask);for(let i=0;i<=5;i++)modules[i][8]=((f>>>i)&1)!==0;modules[7][8]=((f>>>6)&1)!==0;modules[8][8]=((f>>>7)&1)!==0;modules[8][7]=((f>>>8)&1)!==0;for(let i=9;i<15;i++)modules[8][14-i]=((f>>>i)&1)!==0;for(let i=0;i<8;i++)modules[8][size-1-i]=((f>>>i)&1)!==0;for(let i=8;i<15;i++)modules[size-15+i][8]=((f>>>i)&1)!==0;modules[size-8][8]=true;}
function penalty(m:boolean[][]){const n=m.length;let score=0;for(let y=0;y<n;y++){let run=1;for(let x=1;x<n;x++){if(m[y][x]===m[y][x-1])run++;else{if(run>=5)score+=run-2;run=1;}}if(run>=5)score+=run-2;}for(let x=0;x<n;x++){let run=1;for(let y=1;y<n;y++){if(m[y][x]===m[y-1][x])run++;else{if(run>=5)score+=run-2;run=1;}}if(run>=5)score+=run-2;}for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){const c=m[y][x];if(m[y][x+1]===c&&m[y+1][x]===c&&m[y+1][x+1]===c)score+=3;}const pattern=[true,false,true,true,true,false,true,false,false,false,false];for(let y=0;y<n;y++)for(let x=0;x<=n-11;x++){let ok=true;for(let k=0;k<11;k++)if(m[y][x+k]!==pattern[k]){ok=false;break;}if(ok)score+=40;}for(let x=0;x<n;x++)for(let y=0;y<=n-11;y++){let ok=true;for(let k=0;k<11;k++)if(m[y+k][x]!==pattern[k]){ok=false;break;}if(ok)score+=40;}let dark=0;for(const row of m)for(const b of row)if(b)dark++;const pct=dark*100/(n*n);score+=Math.floor(Math.abs(pct-50)/5)*10;return score;}
function place(version:number,codewords:number[],mask:number){const base=makeBase(version);const modules=base.modules.map((r)=>r.slice());const bits:number[]=[];for(const b of codewords)appendBits(bits,b,8);let bitIndex=0;for(let right=base.size-1;right>=1;right-=2){if(right===6)right--;const upward=((right+1)&2)===0;for(let vert=0;vert<base.size;vert++){const y=upward?base.size-1-vert:vert;for(let j=0;j<2;j++){const x=right-j;if(base.func[y][x])continue;let bit=bitIndex<bits.length?bits[bitIndex]!==0:false;bitIndex++;if(maskBit(mask,x,y))bit=!bit;modules[y][x]=bit;}}}drawFormat(modules,mask);return modules;}

export function makeQrMatrix(text:string):BitMatrix{const bytes=new TextEncoder().encode(text);const version=chooseVersion(bytes.length);const codewords=interleave(text,version);let best=place(version,codewords,0),bestScore=penalty(best);for(let mask=1;mask<8;mask++){const candidate=place(version,codewords,mask);const score=penalty(candidate);if(score<bestScore){best=candidate;bestScore=score;}}return{modules:best,size:best.length};}
