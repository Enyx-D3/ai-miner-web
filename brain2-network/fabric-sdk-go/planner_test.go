package fabric

import "testing"

func safe(method TransferMethod, payload int64, cpu float64) CandidateProfile {
	return CandidateProfile{
		Method: method, PayloadBytes: payload, CPUMS: cpu,
		Exact: true, Authorized: true, ProvenanceOK: true, Recoverable: true,
		PeerAvailability: 1,
	}
}

func TestPlannerRejectsCheapUnsafeCandidate(t *testing.T) {
	unsafe := safe(MethodSemanticDelta, 1, 0)
	unsafe.Exact = false
	safeRaw := safe(MethodFullRaw, 1<<20, 1)
	got, _, ok := ChooseTransferPlan([]CandidateProfile{unsafe, safeRaw}, PlanningContext{BandwidthMBps: 10}, CostWeights{PerWireByte: 1, MaxFalseNegativeRisk: 0})
	if !ok || got.Method != MethodFullRaw {
		t.Fatalf("unsafe candidate must never win: %+v", got)
	}
}

func TestPlannerChangesChoiceWithResourceWeights(t *testing.T) {
	fixed := safe(MethodFixedChunkReuse, 4096, 16)
	cdc := safe(MethodCDCReuse, 6158, 40)
	// CPU-sensitive/local-fast case: fixed wins despite a modest byte difference.
	got, _, ok := ChooseTransferPlan([]CandidateProfile{fixed, cdc}, PlanningContext{BandwidthMBps: 500, RTTMS: 1}, CostWeights{PerWireByte: 0.000001, PerCPUMS: 1, MaxFalseNegativeRisk: 0})
	if !ok || got.Method != MethodFixedChunkReuse {
		t.Fatalf("expected fixed in CPU-sensitive case, got %s", got.Method)
	}
	// Byte-sensitive constrained-link case: CDC wins when it avoids a large shifted rewrite.
	fixed.PayloadBytes = 4 << 20
	got, _, ok = ChooseTransferPlan([]CandidateProfile{fixed, cdc}, PlanningContext{BandwidthMBps: 2, RTTMS: 80}, CostWeights{PerWireByte: 0.001, PerCPUMS: 0.01, PerLatencyMS: 1, MaxFalseNegativeRisk: 0})
	if !ok || got.Method != MethodCDCReuse {
		t.Fatalf("expected CDC in byte/latency-sensitive case, got %s", got.Method)
	}
}

func TestPlannerAccountsForOverheadRetryAndPeerFallback(t *testing.T) {
	peer := safe(MethodRollingDelta, 1000, 2)
	peer.SignatureBytes = 6000
	peer.DescriptorBytes = 2000
	peer.NegotiationRounds = 2
	peer.RetryProbability = .2
	peer.PeerAvailability = .5
	peer.FallbackBytes = 1 << 20
	peer.FallbackLatencyMS = 40
	full := safe(MethodFullCompression, 100000, 5)
	got, cost, ok := ChooseTransferPlan([]CandidateProfile{peer, full}, PlanningContext{BandwidthMBps: 20, RTTMS: 20}, CostWeights{PerWireByte: .0001, PerLatencyMS: 1, PerCPUMS: .1, MaxFalseNegativeRisk: 0})
	if !ok || got.Method != MethodFullCompression {
		t.Fatalf("fallback risk should make full compression win, got %s cost=%+v", got.Method, cost)
	}
}
