package fabric

import "math"

// TransferMethod is a reconstruction/transfer lane the adaptive B2 Network
// planner may evaluate. No method is a universal default.
type TransferMethod string

const (
	MethodSemanticDelta   TransferMethod = "semantic_delta"
	MethodRollingDelta    TransferMethod = "rolling_delta"
	MethodFixedChunkReuse TransferMethod = "fixed_chunk_reuse"
	MethodCDCReuse        TransferMethod = "cdc_content_addressed_reuse"
	MethodFullCompression TransferMethod = "full_compression"
	MethodFullRaw         TransferMethod = "full_raw"
)

// PlanningContext contains measured conditions that are external to a method.
type PlanningContext struct {
	BandwidthMBps float64
	RTTMS         float64
}

// CandidateProfile is a calibrated estimate for one transfer lane before
// network conditions are folded in. Byte fields deliberately include the
// costs commonly omitted by simplistic "compressed bytes" comparisons.
type CandidateProfile struct {
	Method  TransferMethod
	Variant string // codec/chunker/delta implementation identifier for evidence lineage

	PayloadBytes        int64
	SignatureBytes      int64
	DescriptorBytes     int64
	NegotiationBytes    int64
	CryptoOverheadBytes int64

	CPUMS              float64
	EnergyJ            float64
	MonetaryCost       float64
	RecoveryStoreBytes int64
	HumanAttention     float64

	NegotiationRounds float64
	RetryProbability  float64
	RetryLatencyMS    float64
	PeerAvailability  float64

	FallbackBytes     int64
	FallbackCPUMS     float64
	FallbackLatencyMS float64

	Exact        bool
	Authorized   bool
	ProvenanceOK bool
	Recoverable  bool

	// Predictive or approximate lanes must explicitly declare their measured
	// false-negative risk. A planner may reject any candidate above its gate.
	FalseNegativeRisk float64
}

// CostWeights converts unlike resources into caller-selected cost units.
// The planner intentionally does not bake in universal economic preferences.
type CostWeights struct {
	PerWireByte          float64
	PerCPUMS             float64
	PerLatencyMS         float64
	PerEnergyJ           float64
	PerMonetaryUnit      float64
	PerRecoveryByte      float64
	PerHumanAttention    float64
	MaxFalseNegativeRisk float64
}

// ExpectedCostBreakdown preserves the reason a method won instead of exposing
// only an opaque scalar score.
type ExpectedCostBreakdown struct {
	Method  TransferMethod
	Variant string

	ExpectedWireBytes      float64
	ExpectedCPUMS          float64
	ExpectedLatencyMS      float64
	ExpectedEnergyJ        float64
	ExpectedMonetaryCost   float64
	ExpectedRecoveryBytes  float64
	ExpectedHumanAttention float64
	Total                  float64
	Eligible               bool
	IneligibleReason       string
}

func clamp01(x float64) float64 {
	if x < 0 {
		return 0
	}
	if x > 1 {
		return 1
	}
	return x
}

func nonnegative(x float64) float64 {
	if x < 0 {
		return 0
	}
	return x
}

func bytesToTransferMS(bytes float64, bandwidthMBps float64) float64 {
	if bytes <= 0 {
		return 0
	}
	if bandwidthMBps <= 0 {
		return math.Inf(1)
	}
	return bytes / (1024 * 1024) / bandwidthMBps * 1000
}

// EstimateExpectedCost applies hard gates first, then computes total expected
// transfer cost including retry and peer-unavailability fallback.
func EstimateExpectedCost(p CandidateProfile, ctx PlanningContext, w CostWeights) ExpectedCostBreakdown {
	out := ExpectedCostBreakdown{Method: p.Method, Variant: p.Variant}
	if !p.Exact {
		out.IneligibleReason = "exact reconstruction gate failed"
		out.Total = math.Inf(1)
		return out
	}
	if !p.Authorized {
		out.IneligibleReason = "authorization gate failed"
		out.Total = math.Inf(1)
		return out
	}
	if !p.ProvenanceOK {
		out.IneligibleReason = "provenance gate failed"
		out.Total = math.Inf(1)
		return out
	}
	if !p.Recoverable {
		out.IneligibleReason = "recovery gate failed"
		out.Total = math.Inf(1)
		return out
	}
	if p.FalseNegativeRisk > w.MaxFalseNegativeRisk {
		out.IneligibleReason = "false-negative risk gate failed"
		out.Total = math.Inf(1)
		return out
	}

	retry := clamp01(p.RetryProbability)
	availability := clamp01(p.PeerAvailability)
	if p.PeerAvailability == 0 && p.FallbackBytes == 0 && p.FallbackLatencyMS == 0 && p.FallbackCPUMS == 0 {
		// Zero-value availability should not accidentally mean "peer is always
		// unavailable" for local/full-transfer candidates that have no peer.
		availability = 1
	}
	unavailable := 1 - availability

	baseBytes := float64(p.PayloadBytes + p.SignatureBytes + p.DescriptorBytes + p.NegotiationBytes + p.CryptoOverheadBytes)
	if baseBytes < 0 {
		baseBytes = 0
	}
	fallbackBytes := float64(p.FallbackBytes)
	if fallbackBytes < 0 {
		fallbackBytes = 0
	}

	out.ExpectedWireBytes = baseBytes*(1+retry) + unavailable*fallbackBytes
	out.ExpectedCPUMS = nonnegative(p.CPUMS)*(1+retry) + unavailable*nonnegative(p.FallbackCPUMS)
	out.ExpectedEnergyJ = nonnegative(p.EnergyJ) * (1 + retry)
	out.ExpectedMonetaryCost = nonnegative(p.MonetaryCost) * (1 + retry)
	out.ExpectedRecoveryBytes = float64(max64(0, p.RecoveryStoreBytes))
	out.ExpectedHumanAttention = nonnegative(p.HumanAttention)

	transferMS := bytesToTransferMS(baseBytes, ctx.BandwidthMBps)
	fallbackTransferMS := bytesToTransferMS(fallbackBytes, ctx.BandwidthMBps)
	out.ExpectedLatencyMS = nonnegative(p.NegotiationRounds)*nonnegative(ctx.RTTMS) + transferMS
	out.ExpectedLatencyMS += retry * (nonnegative(p.RetryLatencyMS) + transferMS)
	out.ExpectedLatencyMS += unavailable * (nonnegative(p.FallbackLatencyMS) + fallbackTransferMS)

	out.Total = out.ExpectedWireBytes*w.PerWireByte +
		out.ExpectedCPUMS*w.PerCPUMS +
		out.ExpectedLatencyMS*w.PerLatencyMS +
		out.ExpectedEnergyJ*w.PerEnergyJ +
		out.ExpectedMonetaryCost*w.PerMonetaryUnit +
		out.ExpectedRecoveryBytes*w.PerRecoveryByte +
		out.ExpectedHumanAttention*w.PerHumanAttention
	out.Eligible = true
	return out
}

func max64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

// ChooseTransferPlan returns the lowest-total-expected-cost eligible candidate.
// Ties are deterministic: earlier candidates retain precedence.
func ChooseTransferPlan(candidates []CandidateProfile, ctx PlanningContext, w CostWeights) (CandidateProfile, ExpectedCostBreakdown, bool) {
	var best CandidateProfile
	var bestCost ExpectedCostBreakdown
	bestTotal := math.Inf(1)
	ok := false
	for _, c := range candidates {
		z := EstimateExpectedCost(c, ctx, w)
		if !z.Eligible || math.IsNaN(z.Total) || z.Total >= bestTotal {
			continue
		}
		best = c
		bestCost = z
		bestTotal = z.Total
		ok = true
	}
	return best, bestCost, ok
}
