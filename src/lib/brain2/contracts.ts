import type { Brain2Provider, TimestampSource } from "./types";

export const BRAIN2_SCHEMA_VERSION = 9;
export const BRAIN2_IDENTITY_VERSION = "B2_ID_V9_ASIF_READER";
export const BRAIN2_ATOM_VERSION = "B2_ATOM_V9_GFIB250";
export const BRAIN2_TRUTH_VERSION = "B2_TRUTH_V7";
export const BRAIN2_PATTERN_VERSION = "B2_PATTERN_V7";
export const BRAIN2_DATABOX_VERSION = "B2_DATABOX_V1";
export const BRAIN2_REASONING_VERSION = "B2_REASONING_V1";
export const BRAIN2_INTELLIGENCE_VERSION = "B2_INTELLIGENCE_V1";
export const BRAIN2_STORAGE_VERSION = "B2_STORAGE_V9_ASIF_READER_BOUNDED_HOT_SET";
export const BRAIN2_SEARCH_INDEX_VERSION = "ASIF_READER_SEARCH_DOC_V2";
export const BRAIN2_EVIDENCE_BLOCK_VERSION = "ASIF_READER_VERIFIED_BLOCK_V2";
export const BRAIN2_RETRIEVAL_VERSION = "ASIF_READER_RAPIDRETRIEVE_V9";
export const CONTEXTVAULT_ADAPTER_VERSION = "CONTEXTVAULT_BROWSER_DIGEST_V2";

export type NormalizedMessageInput = {
  externalId: string;
  providerMessageId?: string;
  providerNodeId?: string;
  parentProviderNodeId?: string;
  branchId?: string;
  sequence: number;
  role: string;
  text: string;
  occurredAt?: string;
  capturedAt?: string;
  timestampSource?: TimestampSource;
  captureId?: string;
  captureUrl?: string;
  captureConnectorId?: string;
};

export type NormalizedConversationInput = {
  provider: Brain2Provider;
  sourceLabel: string;
  sourceType: string;
  externalId: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  selectedBranchId?: string;
  branchIds?: string[];
  messages: NormalizedMessageInput[];
  deferDerivedPatterns?: boolean;
};

export type SourceEnvelope = {
  format: "B2_SOURCE_ENVELOPE";
  version: 2;
  provider: Brain2Provider;
  sourceLabel: string;
  sourceType: string;
  conversationExternalId: string;
  conversationTitle: string;
  selectedBranchId?: string;
  messages: NormalizedMessageInput[];
};

export type RetrievalRoute = "B_250_CHUNK" | "F_TEMPORAL_TRUTH" | "G_ADAPTIVE_HETEROGENEOUS";
