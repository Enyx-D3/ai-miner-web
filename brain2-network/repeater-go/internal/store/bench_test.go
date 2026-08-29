package store

import (
	"brain2labs/b2-network/internal/model"
	"context"
	"fmt"
	"testing"
	"time"
)

func BenchmarkMemoryStoreEnqueueAck(b *testing.B) {
	st := NewMemoryStore()
	ctx := context.Background()
	rec := model.DeviceRecord{SpaceID: "bench-space", SpaceKind: "b2m", DeviceID: "dest", Protocol: model.ProtocolVersion}
	_, _ = st.RegisterDevice(ctx, rec)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		id := fmt.Sprintf("m-%d", i)
		env := model.RelayEnvelope{ID: id, SpaceID: "bench-space", SpaceKind: "b2m", ObjectType: "b2m", FromDevice: "src", ToDevice: "dest", Kind: "delta_refs"}
		_, _ = st.Enqueue(ctx, env, time.Minute)
		_, _ = st.Ack(ctx, "bench-space", "dest", id)
	}
}
