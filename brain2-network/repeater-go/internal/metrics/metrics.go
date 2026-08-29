package metrics

import "sync/atomic"

type Metrics struct{ Requests, AuthFailures, Enqueued, Pulled, Acked, RejectedBulk, Errors, Paired atomic.Uint64 }
