import type { CodeRecord } from "./codeRegistry";

export type RegistryFile = { name: string; path: string; records: CodeRecord[] };
export type RegistryFolder = { name: string; folders: RegistryFolder[]; files: RegistryFile[] };
export type RegistryProject = { key: string; name: string; count: number; root: RegistryFolder };

function stableSegment(value: string): string {
  return value.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "unknown";
}

/** Original relative paths are preserved. Unknown historical names are never invented. */
export function codeRecordTreePath(record: Pick<CodeRecord, "origin" | "sourcePath" | "fileName" | "conversationExternalId" | "sourceMessageId" | "id">): string {
  if (record.sourcePath) {
    return record.sourcePath.replace(/\\/g, "/").replace(/^([^/:]+\.zip):/i, "$1/");
  }
  if (record.origin !== "CHAT_FENCE") return record.fileName;
  const oldOrdinal = record.fileName.match(/^snippet-(\d+)(\.[a-z\d]+)$/i);
  const fileName = oldOrdinal ? `unnamed-${oldOrdinal[1]}${oldOrdinal[2]}` : record.fileName;
  return `Unidentified/${stableSegment(record.conversationExternalId)}/${stableSegment(record.sourceMessageId || record.id.slice(0, 12))}/${fileName}`;
}

type MutableFolder = { name: string; folders: Map<string, MutableFolder>; files: Map<string, RegistryFile> };
function folder(name: string): MutableFolder { return { name, folders: new Map(), files: new Map() }; }
function orderedFolder(value: MutableFolder): RegistryFolder {
  return {
    name: value.name,
    folders: [...value.folders.values()].sort((a, b) => a.name.localeCompare(b.name)).map(orderedFolder),
    files: [...value.files.values()].sort((a, b) => a.name.localeCompare(b.name))
      .map((file) => ({ ...file, records: file.records.sort((a, b) => a.id.localeCompare(b.id)) })),
  };
}

export function groupCodeByProject(records: CodeRecord[]): RegistryProject[] {
  const groups = new Map<string, { key: string; name: string; count: number; root: MutableFolder }>();
  for (const record of [...records].sort((a, b) => a.id.localeCompare(b.id))) {
    const key = record.projectId ? `id:${record.projectId}` : `name:${record.projectName}`;
    let project = groups.get(key);
    if (!project) {
      project = { key, name: record.projectName || "Unresolved", count: 0, root: folder("") };
      groups.set(key, project);
    }
    project.count++;
    const segments = codeRecordTreePath(record).split("/").filter(Boolean);
    let directory = project.root;
    for (const segment of segments.slice(0, -1)) {
      if (!directory.folders.has(segment)) directory.folders.set(segment, folder(segment));
      directory = directory.folders.get(segment)!;
    }
    const name = segments.at(-1) || record.fileName;
    const path = segments.join("/");
    if (!directory.files.has(name)) directory.files.set(name, { name, path, records: [] });
    directory.files.get(name)!.records.push(record);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key))
    .map((value) => ({ key: value.key, name: value.name, count: value.count, root: orderedFolder(value.root) }));
}
