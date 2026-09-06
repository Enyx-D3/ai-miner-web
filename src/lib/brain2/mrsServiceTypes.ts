export type Brain2MRSServiceSelfTest = {
  ok: boolean;
  text: string;
  at: string;
};

export type Brain2MRSServiceHealth = {
  ok: boolean;
  backend: "service";
  modelId?: string;
  detail?: string;
  lastReadyAt?: string;
  lastSelfTest?: Brain2MRSServiceSelfTest;
};

export type Brain2MRSReviewRequest = {
  project: { id: string; name: string };
  candidates: Array<{
    id: string;
    kind: string;
    statement: string;
    evidenceIds: string[];
    importance: number;
    novelty: number;
    truthConfidence: number;
  }>;
};

export type Brain2MRSReviewResponse = {
  proposals: Array<{
    candidateId: string;
    importance?: number;
    novelty?: number;
    classification?: string;
    rationale?: string;
    evidenceIds?: string[];
  }>;
};

export type Brain2MRSHardResidualRequest = {
  task: string;
  context: string;
  maxTokens?: number;
};

export type Brain2MRSHardResidualResponse = {
  text: string;
};

export type Brain2MRSResidualRequest = {
  task: string;
  context: string;
  evidence: Array<{
    id: string;
    type: string;
    text: string;
    score: number;
    truthStatus?: string;
  }>;
  maxTokens?: number;
};

export type Brain2MRSResidualResponse = {
  answer: string;
  evidenceIds: string[];
  confidence: number;
  residuals: string[];
  terminationReason: string;
};

export type Brain2MRSSelfTestResponse = {
  ok: boolean;
  text: string;
  at: string;
};
