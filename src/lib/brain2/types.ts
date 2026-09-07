export type Brain2Provider = "chatgpt" | "claude" | "gemini" | "generic";
export type AtomKind = "decision" | "constraint" | "question" | "idea" | "fact" | "task" | "statement";
export type TruthStatus = "CURRENT" | "SUPERSEDED" | "HISTORICAL" | "CONFLICTING" | "UNKNOWN" | "PENDING_REVIEW";
export type TruthRelation = "SAME" | "REFINES" | "SUPERSEDES" | "CONTRADICTS" | "DIFFERENT_SCOPE" | "UNCERTAIN" | "NEW";
export type TickStatus = "OPEN" | "RESOLVED" | "DEFERRED";
export type ExperimentStatus = "READY" | "RUNNING" | "COMPLETED" | "FAILED" | "BLOCKED";
export type MissionStatus = "READY" | "RUNNING" | "BLOCKED" | "COMPLETED" | "FAILED";
export type TimestampSource = "provider" | "archive" | "dom" | "capture" | "unknown";
export type JournalStatus = "RECEIVED" | "NORMALIZED" | "COMMITTING" | "COMMITTED" | "DERIVED" | "FAILED";
export type PatternMaturity = "L0_FRAGMENT" | "L1_OBSERVATION" | "L2_CANDIDATE" | "L3_HYPOTHESIS" | "L4_SUPPORTED" | "L5_REPLICATED" | "L6_GENERALIZED" | "L7_PORTABLE_EXPERTISE" | "L8_CANON";

export type SourceRecord = {
  id: string;
  provider: Brain2Provider;
  label: string;
  sourceType: string;
  createdAt: string;
  lastSeenAt: string;
  schemaVersion?: number;
};

export type ConversationRecord = {
  id: string;
  sourceId: string;
  provider: Brain2Provider;
  externalId: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  projectId: string;
  messageCount: number;
  wordCount: number;
  selectedBranchId?: string;
  branchIds?: string[];
  projectResolutionConfidence?: number;
  schemaVersion?: number;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  sourceId: string;
  provider: Brain2Provider;
  externalId: string;
  role: string;
  text: string;
  /** Compatibility timestamp. V5 treats this as occurredAt when known. */
  createdAt?: string;
  occurredAt?: string;
  capturedAt?: string;
  timestampSource?: TimestampSource;
  sequence?: number;
  providerMessageId?: string;
  providerNodeId?: string;
  parentProviderNodeId?: string;
  branchId?: string;
  hash: string;
  wordCount: number;
  captureId?: string;
  captureUrl?: string;
  captureConnectorId?: string;
  schemaVersion?: number;
};

export type AtomRecord = {
  id: string;
  messageId: string;
  conversationId: string;
  projectId: string;
  sourceId: string;
  kind: AtomKind;
  subject: string;
  canonicalSubject?: string;
  value?: string;
  polarity?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  scope?: string;
  sourceStart?: number;
  sourceEnd?: number;
  semanticSubtype?: string;
  ruleTrace?: string[];
  relationSafe?: boolean;
  atomizationArm?: "G_ADAPTIVE_HETEROGENEOUS";
  boundarySignals?: string[];
  hierarchyRole?: "PARENT" | "CHILD" | "LEAF";
  parentAtomId?: string;
  sequenceIndex?: number;
  cohesionType?: "PROCEDURE" | "NARRATIVE" | "CAUSAL" | "NONE";
  intrinsicSufficiency?: number;
  fallbackPolicy?: "B_250_CHUNK";
  truthStatus?: TruthStatus;
  truthRelation?: TruthRelation;
  truthRecordId?: string;
  supersedesTruthId?: string;
  validFrom?: string;
  validTo?: string;
  text: string;
  createdAt?: string;
  confidence: number;
  provenance: string[];
  keywords: string[];
  hash: string;
  extractionVersion?: string;
  schemaVersion?: number;
};

export type TruthRecord = {
  id: string;
  key: string;
  projectId: string;
  conversationId?: string;
  sourceId?: string;
  atomId: string;
  text: string;
  kind: AtomKind;
  status: TruthStatus;
  confidence: number;
  createdAt?: string;
  supersedes?: string;
  updatedAt: string;
  relation?: TruthRelation;
  relatedTruthIds?: string[];
  evidenceAtomIds?: string[];
  canonicalSubject?: string;
  value?: string;
  polarity?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  scope?: string;
  strictTruthRootKey?: string;
  reconciliationVersion?: string;
  schemaVersion?: number;
};

export type ProjectRecord = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  conversationIds: string[];
  atomIds: string[];
  openTickIds: string[];
  tags: string[];
  aliases?: string[];
  entityTerms?: string[];
  resolutionConfidence?: number;
  atomCount?: number;
  recentAtomIds?: string[];
  schemaVersion?: number;
};

export type TickRecord = { id: string; projectId?: string; title: string; detail: string; status: TickStatus; priority: "LOW" | "MEDIUM" | "HIGH"; createdAt: string; updatedAt: string; resolution?: string; wakeCondition?: string; evidenceAtomIds: string[] };
export type DecisionRecord = { id: string; projectId: string; atomId: string; title: string; status: TruthStatus; createdAt?: string; evidenceAtomIds: string[] };
export type PatternRecord = {
  id: string;
  label: string;
  status: "OBSERVED" | "CANDIDATE" | "TESTING" | "VERIFIED";
  strength: number;
  projectIds: string[];
  atomIds: string[];
  evidenceCount: number;
  counterexamples: number;
  updatedAt: string;
  patternKey?: string;
  hypothesis?: string;
  counterexampleAtomIds?: string[];
  boundaryConditions?: string[];
  verificationStatus?: "UNTESTED" | "NEEDS_TRANSFER_TEST" | "COUNTEREXAMPLE_FOUND" | "VERIFIED_EXTERNAL";
  patternVersion?: string;
  maturity?: PatternMaturity;
  transferTestIds?: string[];
  falsificationStatus?: "UNTESTED" | "ACTIVE" | "SURVIVED" | "FAILED";
  mechanism?: string;
  predictions?: string[];
};

export type PatternTestRecord = {
  id: string;
  patternId: string;
  kind: "COUNTEREXAMPLE" | "TRANSFER" | "FALSIFICATION" | "REPLICATION";
  projectId?: string;
  domain?: string;
  status: "PASS" | "FAIL" | "INCONCLUSIVE";
  hypothesis: string;
  result: string;
  evidenceAtomIds: string[];
  createdAt: string;
  verifier?: string;
  hash: string;
  schemaVersion?: number;
};

export type PortableExpertiseRecord = {
  id: string;
  patternId: string;
  title: string;
  triggerConditions: string[];
  operatingBoundaries: string[];
  counterexamples: string[];
  procedure: string[];
  verifier: string;
  provenanceAtomIds: string[];
  transferDomains: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
  version: number;
  hash: string;
};

export type CapabilityVerificationState = "CANDIDATE" | "REPLAY_VERIFIED" | "TRANSFER_VERIFIED" | "VERIFIED" | "REJECTED" | "DEPRECATED";

export type CompiledCapabilityRecord = {
  id: string;
  registryKey: string;
  title: string;
  projectId?: string;
  sourcePatternId?: string;
  sourceTrajectoryId?: string;
  version: number;
  stageOrigin: "BRANCH_ZERO" | "CAPABILITY_LOOKUP" | "PATTERN_MEMORY" | "COGNITIVE_R1" | "TRACE_RPVM" | "TINY_SPECIALIST" | "WEB_MRS_MODEL" | "REPAIR";
  preconditions: string[];
  inputShape: string[];
  outputShape: string[];
  dependencies: string[];
  procedure: string[];
  boundaryConditions: string[];
  repairHints: string[];
  evidenceIds: string[];
  verificationState: CapabilityVerificationState;
  successfulRuns: number;
  failedRuns: number;
  lastUsedAt?: string;
  lastVerifiedAt?: string;
  deprecatedAt?: string;
  deprecatedReason?: string;
  rollbackCapabilityId?: string;
  hash: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion?: number;
};

export type ReasoningTrajectoryRecord = {
  id: string;
  trajectoryKey: string;
  question: string;
  projectId?: string;
  databoxId: string;
  databoxHash: string;
  stageTrace: string[];
  operationSequence: string[];
  evidenceIds: string[];
  capabilityId?: string;
  successPatternIds: string[];
  failureMemoryIds: string[];
  boundaryConditions: string[];
  verificationStatus: "PASS" | "FAIL" | "PENDING";
  outcome: "SUCCESS" | "FAILURE" | "REPAIR";
  usedMRS: boolean;
  terminatedBy: "BRANCH_ZERO" | "TINY_SPECIALIST" | "MRS_MODEL" | "REPAIR";
  residualCount: number;
  repairApplied: boolean;
  failureSignature?: string;
  createdAt: string;
  updatedAt: string;
  hash: string;
  schemaVersion?: number;
};

export type FailureMemoryRecord = {
  id: string;
  failureSignature: string;
  title: string;
  projectId?: string;
  trajectoryId: string;
  failedStage: string;
  cause: string;
  knownBadOperation?: string;
  stageTrace: string[];
  evidenceIds: string[];
  boundaryConditions: string[];
  repairThatWorked?: string;
  repairNotApplicableWhen: string[];
  occurrenceCount: number;
  lastSeenAt: string;
  createdAt: string;
  hash: string;
  schemaVersion?: number;
};

export type DerivedArtifactState = "DETERMINISTIC_READY" | "MRS_PENDING" | "MRS_REFINING" | "MRS_READY" | "ERROR";
export type DerivedArtifactMRSRuntime = "DEFERRED" | "CONNECTED" | "ERROR" | "NOT_REQUIRED";

export type DerivedArtifactRecord = {
  id: string;
  kind: "PROJECT_INTELLIGENCE";
  cacheKey: string;
  projectId?: string;
  sourceVersion: string;
  state: DerivedArtifactState;
  mrsRuntime: DerivedArtifactMRSRuntime;
  payloadJson: string;
  createdAt: string;
  updatedAt: string;
  lastMRSAttemptAt?: string;
  lastMRSError?: string;
  schemaVersion?: number;
};

export type PersistentSearchDocument = {
  id: string;
  kind: "message" | "atom" | "truth";
  recordId: string;
  terms: string[];
  text: string;
  projectId?: string;
  sourceId?: string;
  conversationId?: string;
  messageId?: string;
  blockId?: string;
  sourceStart?: number;
  sourceEnd?: number;
  createdAt?: string;
  status?: TruthStatus;
  atomKind?: AtomKind;
  confidence?: number;
  role?: string;
  hasAtom?: boolean;
  schemaVersion?: number;
};

export type EvidenceBlockRecord = {
  id: string;
  conversationId: string;
  projectId: string;
  sourceId: string;
  blockNumber: number;
  firstSequence: number;
  lastSequence: number;
  messageIds: string[];
  atomIds: string[];
  byteEstimate: number;
  hash: string;
  updatedAt: string;
  schemaVersion?: number;
};

export type Brain2StorageState = {
  totalMessages: number;
  totalAtoms: number;
  totalTruths: number;
  totalConversations: number;
  totalEvidenceBlocks: number;
  indexedDocuments: number;
  hotMessages: number;
  hotAtoms: number;
  retrievalIndexStatus: "READY" | "BUILDING" | "PARTIAL" | "ERROR" | "EMPTY";
  retrievalIndexProgress: number;
  bootMode: "BOUNDED_HOT_SET" | "FULL_LEGACY";
  lastVerifiedAt?: string;
  lastError?: string;
};

export type DataboxEvidence = {
  id: string;
  type: "truth" | "atom" | "message";
  text: string;
  projectId?: string;
  sourceId?: string;
  conversationId?: string;
  messageId?: string;
  sourceStart?: number;
  sourceEnd?: number;
  blockId?: string;
  truthStatus?: TruthRecord["status"];
  createdAt?: string;
  score: number;
};

export type DataboxRecord = {
  id: string;
  format: "B2DATABOX";
  version: 1;
  query: string;
  projectId?: string;
  memoryRoot: string;
  retrievalRoute: string;
  evidence: DataboxEvidence[];
  evidenceHash: string;
  sourceCount: number;
  evidenceBlockCount?: number;
  currentTruthCount: number;
  conflictCount: number;
  createdAt: string;
  hash: string;
};

export type ReasoningRequestRecord = {
  format: "B2_REASONING_REQUEST";
  version: 1;
  requestId: string;
  task: string;
  databoxId: string;
  effort: "INSTANT" | "QUICK" | "BALANCED" | "DEEP" | "LONG_LOOP" | "MAX_LOOP";
  thinkingAllowed: boolean;
  maxIterations: number;
  maxCandidates: number;
  verificationPolicy: "DETERMINISTIC_THEN_JUDGE";
  memoryWritePolicy: "PROPOSE_ONLY";
};

export type ReasoningResultRecord = {
  format: "B2_REASONING_RESULT";
  version: 1;
  requestId: string;
  answer: string;
  evidenceIds: string[];
  verification: "PASS" | "FAIL" | "PENDING";
  residuals: string[];
  terminationReason: string;
  proposedMemoryMutations: unknown[];
  artifacts: string[];
  createdAt: string;
};

export type RetrievalTelemetryRecord = {
  id: string;
  queryHash: string;
  route: string;
  candidateCount: number;
  returnedCount: number;
  durationMs: number;
  createdAt: string;
  telemetryKind?: "RETRIEVAL" | "RESPONSIVENESS";
  detailJson?: string;
  schemaVersion?: number;
};

export type ExperimentRecord = { id: string; projectId?: string; title: string; hypothesis: string; status: ExperimentStatus; result?: string; createdAt: string; updatedAt: string; evidenceAtomIds: string[]; validationStatus?: "UNVALIDATED" | "PASS" | "FAIL"; validationDetail?: string; validatedAt?: string };
export type MissionRecord = { id: string; projectId?: string; title: string; objective: string; status: MissionStatus; createdAt: string; updatedAt: string; checkpointIds: string[]; tickIds: string[]; runtimeCanon?: string; writerId?: string };
export type CheckpointRecord = { id: string; missionId: string; parentId?: string; state: string; note: string; createdAt: string; hash: string; validationStatus?: "PASS" | "FAIL" | "PENDING"; regressionStatus?: "PASS" | "FAIL" | "PENDING"; commitStatus?: "PREPARED" | "COMMITTED"; reopenedHash?: string };
export type SyncTableName = "sources" | "conversations" | "messages" | "atoms" | "truths" | "projects" | "ticks" | "decisions" | "patterns" | "experiments" | "missions" | "checkpoints" | "verifications" | "transactions" | "patternTests" | "portableExpertise" | "compiledCapabilities" | "reasoningTrajectories" | "failureMemories" | "databoxes" | "evidenceBlocks";
export type MutationDeltaPayload = {
  version: 1;
  operation: "UPSERT" | "UPSERT_BUNDLE" | "DELETE";
  writes: Partial<Record<SyncTableName, Array<{ id: string; [key: string]: unknown }>>>;
  deletes?: Partial<Record<SyncTableName, string[]>>;
  primaryTable?: SyncTableName;
};
export type MutationRecord = {
  id: string; type: string; entityType: string; entityId: string; createdAt: string; deviceId: string; hash: string;
  sequence?: number; parentMutationId?: string; schemaVersion?: number;
  protocolVersion?: number; memoryRoot?: string; originDeviceId?: string; originSequence?: number; parentMutationIds?: string[];
  payload?: MutationDeltaPayload; payloadHash?: string; beforeHash?: string; afterHash?: string;
  replicationStatus?: "LOCAL_COMMITTED" | "REMOTE_APPLIED" | "CONFLICT" | "REJECTED" | "LINEAGE_ONLY";
  receivedAt?: string; appliedAt?: string; sourceTransport?: "LOCAL" | "WEBRTC" | "HTTPS" | "B2_NETWORK" | "B2M";
};
export type DeviceRecord = { id: string; name: string; kind: "web" | "extension" | "mobile" | "other"; status: "SYNCED" | "WAITING" | "OFFLINE" | "NEEDS_ATTENTION"; lastSeenAt: string; memoryRoot: string; pendingDeltas: number; trusted?: boolean; revoked?: boolean; lastSyncAt?: string; transport?: "LOCAL" | "EXTENSION" | "WEBRTC" | "HTTPS" | "B2_NETWORK"; peerDeviceId?: string; connectorInstallId?: string; connectorOrigin?: string; connectorStatus?: "CONNECTED" | "QUEUED" | "DISCONNECTED"; connectorQueueCount?: number; connectorVaultLocked?: boolean; connectorVersion?: string; };
export type SyncPeerRecord = { id:string; deviceId:string; peerDeviceId:string; memoryRoot:string; name?:string; kind?:string; status:"DISCONNECTED"|"SIGNALING"|"CONNECTED"|"SYNCING"|"SYNCED"|"CONFLICT"|"ERROR"; lastSeenAt?:string; lastSyncAt?:string; lastPushedSequence:number; lastAppliedPeerSequence:number; pendingDeltas:number; transport:"WEBRTC"|"HTTPS"|"B2_NETWORK"; lastManifestHash?:string; error?:string; };
export type SyncConflictRecord = { id:string; mutationId:string; peerDeviceId?:string; entityType:string; entityId:string; expectedBeforeHash?:string; localHash?:string; incomingAfterHash?:string; status:"OPEN"|"RESOLVED_LOCAL"|"RESOLVED_REMOTE"|"MERGED"; createdAt:string; detail:string; };
export type VerificationRecord = { id: string; entityType: string; entityId: string; status: "PASS" | "FAIL" | "PENDING"; detail: string; createdAt: string };
export type B2TransactionRecord = {
  id: string;
  type: "B2JOB" | "B2REQUEST" | "B2DELTA" | "B2RESULT" | "B2VERIFY" | "B2REPAIR";
  projectId?: string;
  payload: string;
  createdAt: string;
  hash: string;
  payloadHash?: string;
  parentId?: string;
  sequence?: number;
  protocolVersion?: number;
};

export type IngestionJournalRecord = {
  id: string;
  sourceId?: string;
  conversationExternalId: string;
  conversationId?: string;
  provider: Brain2Provider;
  status: JournalStatus;
  receivedAt: string;
  updatedAt: string;
  payloadHash: string;
  messageCount: number;
  committedMessageIds: string[];
  committedAtomIds: string[];
  error?: string;
  schemaVersion: number;
};

export type ContextVaultRunRecord = {
  id: string;
  sourceName: string;
  provider: Brain2Provider;
  status: "PASS" | "FAIL";
  createdAt: string;
  durationMs: number;
  inputBytes: number;
  paragraphs?: number;
  atoms?: number;
  threads?: number;
  error?: string;
  adapterVersion: string;
};

export type Brain2Snapshot = {
  sources: SourceRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  atoms: AtomRecord[];
  truths: TruthRecord[];
  projects: ProjectRecord[];
  ticks: TickRecord[];
  decisions: DecisionRecord[];
  patterns: PatternRecord[];
  experiments: ExperimentRecord[];
  missions: MissionRecord[];
  checkpoints: CheckpointRecord[];
  mutations: MutationRecord[];
  devices: DeviceRecord[];
  verifications: VerificationRecord[];
  transactions: B2TransactionRecord[];
  journals: IngestionJournalRecord[];
  contextVaultRuns: ContextVaultRunRecord[];
  patternTests: PatternTestRecord[];
  portableExpertise: PortableExpertiseRecord[];
  compiledCapabilities: CompiledCapabilityRecord[];
  reasoningTrajectories: ReasoningTrajectoryRecord[];
  failureMemories: FailureMemoryRecord[];
  derivedArtifacts: DerivedArtifactRecord[];
  databoxes: DataboxRecord[];
  retrievalTelemetry: RetrievalTelemetryRecord[];
  evidenceBlocks: EvidenceBlockRecord[];
  syncPeers: SyncPeerRecord[];
  syncConflicts: SyncConflictRecord[];
  storage: Brain2StorageState;
  memoryRoot: string;
  loaded: boolean;
  version: number;
};

export type ExtensionCapture = {
  id: string;
  provider: Brain2Provider;
  conversationExternalId: string;
  conversationTitle: string;
  messageExternalId?: string;
  providerMessageId?: string;
  providerNodeId?: string;
  parentProviderNodeId?: string;
  branchId?: string;
  sequence?: number;
  role: string;
  text: string;
  url: string;
  /** Legacy field from V4. */
  createdAt?: string;
  occurredAt?: string;
  capturedAt?: string;
  timestampSource?: TimestampSource;
  captureId?: string;
  captureUrl?: string;
  captureConnectorId?: string;
};
