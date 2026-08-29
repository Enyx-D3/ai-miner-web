import type { NormalizedMessageInput } from "./contracts";

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function stringValue(value: unknown): string { return typeof value === "string" ? value : ""; }
function dateValue(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value * 1000).toISOString();
  if (typeof value === "string" && value) {
    const numeric=Number(value); if(Number.isFinite(numeric)&&numeric>1000000000)return new Date(numeric*1000).toISOString();
    const parsed=Date.parse(value); return Number.isFinite(parsed)?new Date(parsed).toISOString():undefined;
  }
  return undefined;
}
function messageText(message: Record<string, unknown>): string {
  const content=isRecord(message.content)?message.content:null; if(!content)return "";
  if(Array.isArray(content.parts))return content.parts.filter((part):part is string=>typeof part === "string").join("\n").trim();
  if(typeof content.text === "string")return content.text.trim(); return "";
}

type MappingNode={id:string;parent?:string;children:string[];message?:Record<string,unknown>};
function mappingNodes(mapping:Record<string,unknown>):Map<string,MappingNode>{
  const nodes=new Map<string,MappingNode>();
  for(const [nodeId,value] of Object.entries(mapping)){
    if(!isRecord(value))continue;
    nodes.set(nodeId,{id:nodeId,parent:stringValue(value.parent)||undefined,children:Array.isArray(value.children)?value.children.filter((item):item is string=>typeof item === "string"):[],message:isRecord(value.message)?value.message:undefined});
  }
  return nodes;
}
function chooseActiveLeaf(value:Record<string,unknown>,nodes:Map<string,MappingNode>):string|undefined{
  const current=stringValue(value.current_node); if(current&&nodes.has(current))return current;
  const leaves=[...nodes.values()].filter((node)=>node.children.length===0&&node.message);
  leaves.sort((a,b)=>{const at=dateValue(a.message?.create_time)??"";const bt=dateValue(b.message?.create_time)??"";return bt.localeCompare(at)||b.id.localeCompare(a.id);});
  return leaves[0]?.id;
}
function activeLineage(value:Record<string,unknown>):{leaf?:string;branchIds:string[];nodes:MappingNode[]}{
  if(!isRecord(value.mapping))return{branchIds:[],nodes:[]};
  const nodes=mappingNodes(value.mapping);const leaf=chooseActiveLeaf(value,nodes);if(!leaf)return{branchIds:[],nodes:[]};
  const chain:MappingNode[]=[];const visited=new Set<string>();let cursor:string|undefined=leaf;
  while(cursor&&nodes.has(cursor)&&!visited.has(cursor)){visited.add(cursor);const currentNode:MappingNode=nodes.get(cursor)!;chain.push(currentNode);cursor=currentNode.parent;}
  chain.reverse();const branchIds=[...nodes.values()].filter((node)=>node.children.length===0).map((node)=>node.id);return{leaf,branchIds,nodes:chain};
}

export type NormalizedArchiveConversation={externalId:string;title:string;createdAt?:string;updatedAt?:string;selectedBranchId?:string;branchIds:string[];messages:NormalizedMessageInput[]};

export function normalizeArchiveConversation(value:unknown,index:number):NormalizedArchiveConversation|null{
  if(!isRecord(value))return null;
  const title=stringValue(value.title)||`Conversation ${index+1}`;const externalId=stringValue(value.id)||stringValue(value.conversation_id)||`conversation-${index+1}`;const messages:NormalizedMessageInput[]=[];let selectedBranchId:string|undefined;let branchIds:string[]=[];
  if(isRecord(value.mapping)){
    const lineage=activeLineage(value);selectedBranchId=lineage.leaf;branchIds=lineage.branchIds;let sequence=0;
    for(const node of lineage.nodes){const message=node.message;if(!message)continue;const text=messageText(message);if(!text)continue;const author=isRecord(message.author)?message.author:{};const providerMessageId=stringValue(message.id)||undefined;messages.push({externalId:providerMessageId||node.id,providerMessageId,providerNodeId:node.id,parentProviderNodeId:node.parent,branchId:selectedBranchId,sequence:sequence++,role:stringValue(author.role)||"unknown",text,occurredAt:dateValue(message.create_time),timestampSource:"archive"});}
  } else if(Array.isArray(value.messages)){
    for(let messageIndex=0;messageIndex<value.messages.length;messageIndex+=1){const wrapper=value.messages[messageIndex];const message=isRecord(wrapper)&&isRecord(wrapper.message)?wrapper.message:isRecord(wrapper)?wrapper:null;if(!message)continue;const text=messageText(message);if(!text)continue;const author=isRecord(message.author)?message.author:{};const providerMessageId=stringValue(message.id)||undefined;messages.push({externalId:providerMessageId||`${externalId}-message-${messageIndex+1}`,providerMessageId,sequence:messages.length,role:stringValue(author.role)||"unknown",text,occurredAt:dateValue(message.create_time),timestampSource:"archive"});}
  }
  if(!messages.length)return null;return{externalId,title,createdAt:dateValue(value.create_time),updatedAt:dateValue(value.update_time),selectedBranchId,branchIds,messages};
}
