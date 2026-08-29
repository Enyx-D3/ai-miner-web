package store

import (
	"brain2labs/b2-network/internal/model"
	"context"
	"errors"
	"time"
)

var ErrNotFound = errors.New("not found")

type Store interface {
	Ping(context.Context) error
	ClaimSpace(context.Context, string, string) (bool, error)
	SpaceExists(context.Context, string) (bool, error)
	CreatePairToken(context.Context, string, string, time.Duration) error
	ConsumePairToken(context.Context, string, string) (bool, error)
	RegisterDevice(context.Context, model.DeviceRecord) (bool, error)
	GetDevice(context.Context, string, string) (model.DeviceRecord, error)
	UpdateDevice(context.Context, model.DeviceRecord) error
	RememberNonce(context.Context, string, time.Duration) (bool, error)
	RateLimit(context.Context, string, int, time.Duration) (bool, int64, error)
	Enqueue(context.Context, model.RelayEnvelope, time.Duration) (bool, error)
	Pull(context.Context, string, string, int) ([]model.RelayEnvelope, error)
	Ack(context.Context, string, string, string) (bool, error)
	PendingCount(context.Context) (int64, error)
	CleanupExpired(context.Context, int) (int, error)
}
