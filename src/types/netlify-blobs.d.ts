declare module "@netlify/blobs" {
  export function getStore(options: string | { name: string; consistency?: "strong" | "eventual" }): any;
}
