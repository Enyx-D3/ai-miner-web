import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { webcrypto } from "node:crypto";

globalThis.crypto ??= webcrypto;

const root = process.cwd();
const out = path.join(root, ".v9-project-intelligence-profile-dist");
const tscCli = path.join(root, "node_modules", "typescript", "bin", "tsc");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

execFileSync(
  process.execPath,
  [
    tscCli,
    "--target", "ES2022",
    "--module", "commonjs",
    "--moduleResolution", "node",
    "--skipLibCheck",
    "--esModuleInterop",
    "--outDir", out,
    "src/lib/brain2/contracts.ts",
    "src/lib/brain2/identity.ts",
    "src/lib/brain2/types.ts",
    "src/lib/brain2/transformersRuntime.ts",
    "src/lib/brain2/intelligenceLayer.ts",
  ],
  { stdio: "inherit" },
);

const require = createRequire(import.meta.url);
const { buildDeterministicProjectIntelligence, buildProjectIntelligenceSourceVersion } = require(path.join(out, "intelligenceLayer.js"));

function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function atom(projectId, index, kind = "fact") {
  const createdAt = nowIso(-(index + 1) * 1000);
  const baseKeywords = index % 5 === 0
    ? ["deterministic", "intelligence", "responsiveness", "cached"]
    : index % 7 === 0
      ? ["runtime", "transformers", "wasm", "browser"]
      : ["import", "archive", "project", `topic${index % 13}`];
  const text = kind === "idea"
    ? `Deterministic idea ${index}: keep project intelligence cached on screen open and defer heavy work for project ${projectId}.`
    : kind === "decision"
      ? `Decision ${index}: project ${projectId} uses Transformers.js WASM for the browser runtime.`
      : `Fact ${index}: project ${projectId} import checkpoint ${index % 17} is active.`;
  return {
    id: `atom_${projectId}_${index}`,
    messageId: `msg_${projectId}_${Math.floor(index / 2)}`,
    conversationId: `conv_${projectId}`,
    projectId,
    sourceId: "src_profile",
    kind,
    subject: `subject ${projectId} ${index}`,
    canonicalSubject: `subject ${projectId} ${index}`,
    value: kind === "fact" ? `value ${index % 11}` : kind === "decision" ? "transformers.js wasm" : undefined,
    polarity: "POSITIVE",
    text,
    createdAt,
    confidence: 0.74 + ((index % 7) * 0.02),
    provenance: [`msg_${projectId}_${Math.floor(index / 2)}`],
    keywords: baseKeywords,
    hash: `hash_atom_${projectId}_${index}`,
    truthStatus: kind === "idea" ? "UNKNOWN" : "CURRENT",
  };
}

function truth(projectId, index, atomId, kind = "fact") {
  const updatedAt = nowIso(-(index + 1) * 1000);
  return {
    id: `truth_${projectId}_${index}`,
    key: `key_${projectId}_${index}`,
    projectId,
    atomId,
    text: kind === "decision"
      ? `Current decision ${index}: browser runtime is Transformers.js WASM.`
      : `Current truth ${index}: import checkpoint ${index % 17} remains active.`,
    kind,
    status: "CURRENT",
    confidence: 0.8,
    createdAt: updatedAt,
    updatedAt,
    relation: "NEW",
    evidenceAtomIds: [atomId],
    canonicalSubject: `subject ${projectId} ${index}`,
    value: kind === "decision" ? "transformers.js wasm" : `value ${index % 11}`,
    polarity: "POSITIVE",
  };
}

function pattern(projectId, index, atomIds, strength = 0.3, status = "CANDIDATE") {
  return {
    id: `pattern_${projectId}_${index}`,
    label: `Pattern ${index} for ${projectId}`,
    status,
    strength,
    projectIds: [projectId],
    atomIds: atomIds.slice(0, 6),
    evidenceCount: Math.max(2, atomIds.length),
    counterexamples: index % 2,
    updatedAt: nowIso(-(index + 1) * 5000),
  };
}

function scenarioInput({ projectId, atomCount, truthCount, patternCount }) {
  const atoms = [];
  for (let i = 0; i < atomCount; i += 1) {
    const kind = i % 9 === 0 ? "idea" : i % 6 === 0 ? "decision" : "fact";
    atoms.push(atom(projectId, i, kind));
  }
  const truths = [];
  for (let i = 0; i < truthCount; i += 1) {
    const sourceAtom = atoms[i % atoms.length];
    const kind = sourceAtom.kind === "decision" ? "decision" : "fact";
    truths.push(truth(projectId, i, sourceAtom.id, kind));
  }
  const patterns = [];
  for (let i = 0; i < patternCount; i += 1) {
    patterns.push(pattern(projectId, i, atoms.slice(i, i + 4).map((entry) => entry.id), i % 3 === 0 ? 0.42 : 0.24, i % 4 === 0 ? "VERIFIED" : "CANDIDATE"));
  }
  return {
    project: {
      id: projectId,
      slug: projectId,
      name: `Profile ${projectId}`,
      summary: "Synthetic project intelligence benchmark",
      createdAt: nowIso(-86400000),
      updatedAt: nowIso(-60000),
      conversationIds: [`conv_${projectId}`],
      atomIds: atoms.map((entry) => entry.id).slice(-512),
      recentAtomIds: atoms.map((entry) => entry.id).slice(-256),
      atomCount: atoms.length,
      openTickIds: [],
      tags: ["synthetic", "profile", "intelligence"],
      aliases: [`Profile ${projectId}`],
      entityTerms: ["project intelligence", "transformers"],
      resolutionConfidence: 1,
    },
    atoms,
    truths,
    decisions: [],
    patterns,
    experiments: [],
    ticks: [],
  };
}

async function runScenario(config) {
  const input = scenarioInput(config);
  const sourceStartedAt = performance.now();
  await buildProjectIntelligenceSourceVersion(input);
  const sourceVersionMs = performance.now() - sourceStartedAt;
  const buildStartedAt = performance.now();
  const projection = await buildDeterministicProjectIntelligence(input);
  const buildMs = performance.now() - buildStartedAt;
  return {
    scenario: config.name,
    projectId: config.projectId,
    atoms: input.atoms.length,
    truths: input.truths.length,
    patterns: input.patterns.length,
    sourceVersionMs: Math.round(sourceVersionMs),
    deterministicBuildMs: Math.round(buildMs),
    currentTruth: projection.currentTruth.length,
    importantIdeas: projection.importantIdeas.length,
    connections: projection.connections.length,
    unresolved: projection.unresolved.length,
  };
}

const scenarios = [
  { name: "small_project", projectId: "p_small", atomCount: 120, truthCount: 40, patternCount: 8 },
  { name: "medium_project", projectId: "p_medium", atomCount: 320, truthCount: 120, patternCount: 18 },
  { name: "hot_path_cap", projectId: "p_hot", atomCount: 400, truthCount: 180, patternCount: 28 },
];

const results = [];
for (const scenario of scenarios) {
  results.push(await runScenario(scenario));
}

const output = {
  schema: "B2_V9_PROJECT_INTELLIGENCE_PROFILE_V1",
  generatedAt: new Date().toISOString(),
  scenarios: results,
};

fs.writeFileSync(path.join(root, "PROJECT_INTELLIGENCE_PROFILE_V9.json"), JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
fs.rmSync(out, { recursive: true, force: true });
