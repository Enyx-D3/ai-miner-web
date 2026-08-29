package store

import (
	"brain2labs/b2-network/internal/model"
	"context"
	"fmt"
	"sync"
	"time"
)

type memItem[T any] struct {
	V   T
	Exp time.Time
}
type MemoryStore struct {
	mu       sync.Mutex
	devices  map[string]model.DeviceRecord
	roots    map[string]string
	pairs    map[string]memItem[string]
	nonces   map[string]time.Time
	rates    map[string][]time.Time
	messages map[string]memItem[model.RelayEnvelope]
	queues   map[string][]string
	global   []string
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{devices: map[string]model.DeviceRecord{}, roots: map[string]string{}, pairs: map[string]memItem[string]{}, nonces: map[string]time.Time{}, rates: map[string][]time.Time{}, messages: map[string]memItem[model.RelayEnvelope]{}, queues: map[string][]string{}}
}
func dkey(s, d string) string                     { return s + "/" + d }
func qkey(s, d string) string                     { return s + "/" + d }
func (m *MemoryStore) Ping(context.Context) error { return nil }
func (m *MemoryStore) ClaimSpace(_ context.Context, s, d string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.roots[s]; ok {
		return false, nil
	}
	m.roots[s] = d
	return true, nil
}
func (m *MemoryStore) SpaceExists(_ context.Context, s string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.roots[s]
	return ok, nil
}
func (m *MemoryStore) CreatePairToken(_ context.Context, t, s string, ttl time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.pairs[t] = memItem[string]{s, time.Now().Add(ttl)}
	return nil
}
func (m *MemoryStore) ConsumePairToken(_ context.Context, t, s string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	it, ok := m.pairs[t]
	if !ok || it.Exp.Before(time.Now()) || it.V != s {
		return false, nil
	}
	delete(m.pairs, t)
	return true, nil
}
func (m *MemoryStore) RegisterDevice(_ context.Context, r model.DeviceRecord) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	k := dkey(r.SpaceID, r.DeviceID)
	if _, ok := m.devices[k]; ok {
		return false, nil
	}
	m.devices[k] = r
	return true, nil
}
func (m *MemoryStore) GetDevice(_ context.Context, s, d string) (model.DeviceRecord, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	r, ok := m.devices[dkey(s, d)]
	if !ok {
		return r, ErrNotFound
	}
	return r, nil
}
func (m *MemoryStore) UpdateDevice(_ context.Context, r model.DeviceRecord) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	k := dkey(r.SpaceID, r.DeviceID)
	if _, ok := m.devices[k]; !ok {
		return ErrNotFound
	}
	m.devices[k] = r
	return nil
}
func (m *MemoryStore) RememberNonce(_ context.Context, k string, ttl time.Duration) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now()
	if e, ok := m.nonces[k]; ok && e.After(now) {
		return false, nil
	}
	m.nonces[k] = now.Add(ttl)
	return true, nil
}
func (m *MemoryStore) RateLimit(_ context.Context, k string, limit int, w time.Duration) (bool, int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now()
	cut := now.Add(-w)
	a := m.rates[k][:0]
	for _, t := range m.rates[k] {
		if t.After(cut) {
			a = append(a, t)
		}
	}
	a = append(a, now)
	m.rates[k] = a
	return len(a) <= limit, int64(len(a)), nil
}
func (m *MemoryStore) Enqueue(_ context.Context, e model.RelayEnvelope, ttl time.Duration) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.messages[e.ID]; ok {
		return false, nil
	}
	m.messages[e.ID] = memItem[model.RelayEnvelope]{e, time.Now().Add(ttl)}
	q := qkey(e.SpaceID, e.ToDevice)
	m.queues[q] = append(m.queues[q], e.ID)
	m.global = append(m.global, e.ID)
	return true, nil
}
func (m *MemoryStore) Pull(_ context.Context, s, d string, limit int) ([]model.RelayEnvelope, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	q := qkey(s, d)
	ids := m.queues[q]
	out := make([]model.RelayEnvelope, 0, limit)
	keep := make([]string, 0, len(ids))
	now := time.Now()
	for _, id := range ids {
		it, ok := m.messages[id]
		if !ok || it.Exp.Before(now) {
			delete(m.messages, id)
			continue
		}
		keep = append(keep, id)
		if len(out) < limit {
			out = append(out, it.V)
		}
	}
	m.queues[q] = keep
	return out, nil
}
func (m *MemoryStore) Ack(_ context.Context, s, d, id string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	it, ok := m.messages[id]
	if !ok {
		return false, nil
	}
	if it.V.SpaceID != s || it.V.ToDevice != d {
		return false, fmt.Errorf("recipient mismatch")
	}
	delete(m.messages, id)
	q := qkey(s, d)
	m.queues[q] = remove(m.queues[q], id)
	m.global = remove(m.global, id)
	return true, nil
}
func (m *MemoryStore) PendingCount(context.Context) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return int64(len(m.global)), nil
}
func (m *MemoryStore) CleanupExpired(_ context.Context, limit int) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now()
	n := 0
	keep := make([]string, 0, len(m.global))
	for _, id := range m.global {
		it, ok := m.messages[id]
		if (!ok || it.Exp.Before(now)) && n < limit {
			delete(m.messages, id)
			n++
			continue
		}
		keep = append(keep, id)
	}
	m.global = keep
	return n, nil
}
func remove(a []string, s string) []string {
	out := a[:0]
	for _, x := range a {
		if x != s {
			out = append(out, x)
		}
	}
	return out
}
