package store

import (
	"brain2labs/b2-network/internal/model"
	"bufio"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"time"
)

type RedisStore struct {
	Addr, Username, Password string
	DB                       int
	TLS                      bool
}

func NewRedisStore(addr, user, pass string, db int, tlsEnabled bool) *RedisStore {
	return &RedisStore{addr, user, pass, db, tlsEnabled}
}

type respClient struct {
	c net.Conn
	r *bufio.Reader
}

func (s *RedisStore) dial(ctx context.Context) (*respClient, error) {
	var c net.Conn
	var err error
	d := net.Dialer{Timeout: 3 * time.Second}
	if s.TLS {
		c, err = tls.DialWithDialer(&d, "tcp", s.Addr, &tls.Config{MinVersion: tls.VersionTLS12})
	} else {
		c, err = d.DialContext(ctx, "tcp", s.Addr)
	}
	if err != nil {
		return nil, err
	}
	rc := &respClient{c: c, r: bufio.NewReader(c)}
	if s.Password != "" {
		args := []string{"AUTH"}
		if s.Username != "" {
			args = append(args, s.Username)
		}
		args = append(args, s.Password)
		if _, e := rc.cmd(args...); e != nil {
			c.Close()
			return nil, e
		}
	}
	if s.DB != 0 {
		if _, e := rc.cmd("SELECT", strconv.Itoa(s.DB)); e != nil {
			c.Close()
			return nil, e
		}
	}
	return rc, nil
}
func (c *respClient) close() { _ = c.c.Close() }
func (c *respClient) cmd(args ...string) (any, error) {
	var b strings.Builder
	fmt.Fprintf(&b, "*%d\r\n", len(args))
	for _, a := range args {
		fmt.Fprintf(&b, "$%d\r\n%s\r\n", len(a), a)
	}
	if _, e := io.WriteString(c.c, b.String()); e != nil {
		return nil, e
	}
	return readRESP(c.r)
}
func readRESP(r *bufio.Reader) (any, error) {
	p, e := r.ReadByte()
	if e != nil {
		return nil, e
	}
	line := func() (string, error) {
		s, e := r.ReadString('\n')
		if e != nil {
			return "", e
		}
		return strings.TrimSuffix(strings.TrimSuffix(s, "\n"), "\r"), nil
	}
	switch p {
	case '+':
		return line()
	case '-':
		s, e := line()
		if e != nil {
			return nil, e
		}
		return nil, errors.New(s)
	case ':':
		s, e := line()
		if e != nil {
			return nil, e
		}
		return strconv.ParseInt(s, 10, 64)
	case '$':
		s, e := line()
		if e != nil {
			return nil, e
		}
		n, _ := strconv.Atoi(s)
		if n < 0 {
			return nil, nil
		}
		buf := make([]byte, n+2)
		if _, e = io.ReadFull(r, buf); e != nil {
			return nil, e
		}
		return string(buf[:n]), nil
	case '*':
		s, e := line()
		if e != nil {
			return nil, e
		}
		n, _ := strconv.Atoi(s)
		if n < 0 {
			return nil, nil
		}
		a := make([]any, 0, n)
		for i := 0; i < n; i++ {
			v, e := readRESP(r)
			if e != nil {
				return nil, e
			}
			a = append(a, v)
		}
		return a, nil
	}
	return nil, fmt.Errorf("unknown RESP prefix %q", p)
}
func (s *RedisStore) with(ctx context.Context, fn func(*respClient) error) error {
	c, e := s.dial(ctx)
	if e != nil {
		return e
	}
	defer c.close()
	return fn(c)
}
func (s *RedisStore) Ping(ctx context.Context) error {
	return s.with(ctx, func(c *respClient) error { _, e := c.cmd("PING"); return e })
}
func devKey(b, d string) string   { return "b2net:device:" + b + ":" + d }
func nonceKey(k string) string    { return "b2net:nonce:" + k }
func msgKey(id string) string     { return "b2net:relay:msg:" + id }
func queueKey(b, d string) string { return "b2net:relay:q:" + b + ":" + d }

func rootKey(b string) string { return "b2net:root:" + b }
func pairKey(t string) string { return "b2net:pair:" + t }
func (s *RedisStore) ClaimSpace(ctx context.Context, b, d string) (bool, error) {
	var ok bool
	e := s.with(ctx, func(c *respClient) error {
		v, er := c.cmd("SET", rootKey(b), d, "NX")
		if er != nil {
			return er
		}
		ok = v != nil
		return nil
	})
	return ok, e
}
func (s *RedisStore) SpaceExists(ctx context.Context, b string) (bool, error) {
	var ok bool
	e := s.with(ctx, func(c *respClient) error {
		v, er := c.cmd("EXISTS", rootKey(b))
		if er != nil {
			return er
		}
		ok = v.(int64) > 0
		return nil
	})
	return ok, e
}
func (s *RedisStore) CreatePairToken(ctx context.Context, t, b string, ttl time.Duration) error {
	return s.with(ctx, func(c *respClient) error {
		_, e := c.cmd("SET", pairKey(t), b, "NX", "EX", strconv.Itoa(int(ttl.Seconds())))
		return e
	})
}
func (s *RedisStore) ConsumePairToken(ctx context.Context, t, b string) (bool, error) {
	script := `local v=redis.call('GET',KEYS[1]); if v==ARGV[1] then redis.call('DEL',KEYS[1]); return 1 else return 0 end`
	var ok bool
	e := s.with(ctx, func(c *respClient) error {
		v, er := c.cmd("EVAL", script, "1", pairKey(t), b)
		if er != nil {
			return er
		}
		ok = v.(int64) == 1
		return nil
	})
	return ok, e
}
func (s *RedisStore) RegisterDevice(ctx context.Context, r model.DeviceRecord) (bool, error) {
	b, _ := json.Marshal(r)
	var created bool
	err := s.with(ctx, func(c *respClient) error {
		v, e := c.cmd("SET", devKey(r.SpaceID, r.DeviceID), string(b), "NX")
		if e != nil {
			return e
		}
		created = v != nil
		return nil
	})
	return created, err
}
func (s *RedisStore) GetDevice(ctx context.Context, b, d string) (model.DeviceRecord, error) {
	var out model.DeviceRecord
	err := s.with(ctx, func(c *respClient) error {
		v, e := c.cmd("GET", devKey(b, d))
		if e != nil {
			return e
		}
		if v == nil {
			return ErrNotFound
		}
		return json.Unmarshal([]byte(v.(string)), &out)
	})
	return out, err
}
func (s *RedisStore) UpdateDevice(ctx context.Context, r model.DeviceRecord) error {
	b, _ := json.Marshal(r)
	return s.with(ctx, func(c *respClient) error {
		v, e := c.cmd("SET", devKey(r.SpaceID, r.DeviceID), string(b), "XX")
		if e != nil {
			return e
		}
		if v == nil {
			return ErrNotFound
		}
		return nil
	})
}
func (s *RedisStore) RememberNonce(ctx context.Context, k string, ttl time.Duration) (bool, error) {
	var ok bool
	err := s.with(ctx, func(c *respClient) error {
		v, e := c.cmd("SET", nonceKey(k), "1", "NX", "EX", strconv.Itoa(int(ttl.Seconds())))
		if e != nil {
			return e
		}
		ok = v != nil
		return nil
	})
	return ok, err
}
func (s *RedisStore) RateLimit(ctx context.Context, k string, limit int, w time.Duration) (bool, int64, error) {
	script := `local v=redis.call('INCR',KEYS[1]); if v==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return v`
	var n int64
	err := s.with(ctx, func(c *respClient) error {
		v, e := c.cmd("EVAL", script, "1", "b2net:rate:"+k, strconv.Itoa(int(w.Seconds())))
		if e != nil {
			return e
		}
		n = v.(int64)
		return nil
	})
	return n <= int64(limit), n, err
}
func (s *RedisStore) Enqueue(ctx context.Context, e model.RelayEnvelope, ttl time.Duration) (bool, error) {
	raw, _ := json.Marshal(e)
	script := `if redis.call('SET',KEYS[1],ARGV[1],'NX','EX',ARGV[2]) then redis.call('RPUSH',KEYS[2],ARGV[3]); redis.call('RPUSH',KEYS[3],ARGV[3]); return 1 else return 0 end`
	var ok bool
	err := s.with(ctx, func(c *respClient) error {
		v, er := c.cmd("EVAL", script, "3", msgKey(e.ID), queueKey(e.SpaceID, e.ToDevice), model.GlobalPendingKey, string(raw), strconv.Itoa(int(ttl.Seconds())), e.ID)
		if er != nil {
			return er
		}
		ok = v.(int64) == 1
		return nil
	})
	return ok, err
}
func (s *RedisStore) Pull(ctx context.Context, b, d string, limit int) ([]model.RelayEnvelope, error) {
	var out []model.RelayEnvelope
	err := s.with(ctx, func(c *respClient) error {
		v, e := c.cmd("LRANGE", queueKey(b, d), "0", strconv.Itoa(limit-1))
		if e != nil {
			return e
		}
		arr, _ := v.([]any)
		for _, x := range arr {
			id, ok := x.(string)
			if !ok {
				continue
			}
			mv, e := c.cmd("GET", msgKey(id))
			if e != nil {
				return e
			}
			if mv == nil {
				_, _ = c.cmd("LREM", queueKey(b, d), "0", id)
				_, _ = c.cmd("LREM", model.GlobalPendingKey, "0", id)
				continue
			}
			var env model.RelayEnvelope
			if e = json.Unmarshal([]byte(mv.(string)), &env); e != nil {
				return e
			}
			out = append(out, env)
		}
		return nil
	})
	return out, err
}
func (s *RedisStore) Ack(ctx context.Context, b, d, id string) (bool, error) {
	env, e := s.getEnvelope(ctx, id)
	if e == ErrNotFound {
		return false, nil
	}
	if e != nil {
		return false, e
	}
	if env.SpaceID != b || env.ToDevice != d {
		return false, fmt.Errorf("recipient mismatch")
	}
	script := `local n=redis.call('DEL',KEYS[1]); redis.call('LREM',KEYS[2],0,ARGV[1]); redis.call('LREM',KEYS[3],0,ARGV[1]); return n`
	var ok bool
	e = s.with(ctx, func(c *respClient) error {
		v, er := c.cmd("EVAL", script, "3", msgKey(id), queueKey(b, d), model.GlobalPendingKey, id)
		if er != nil {
			return er
		}
		ok = v.(int64) > 0
		return nil
	})
	return ok, e
}
func (s *RedisStore) getEnvelope(ctx context.Context, id string) (model.RelayEnvelope, error) {
	var out model.RelayEnvelope
	e := s.with(ctx, func(c *respClient) error {
		v, er := c.cmd("GET", msgKey(id))
		if er != nil {
			return er
		}
		if v == nil {
			return ErrNotFound
		}
		return json.Unmarshal([]byte(v.(string)), &out)
	})
	return out, e
}
func (s *RedisStore) PendingCount(ctx context.Context) (int64, error) {
	var n int64
	e := s.with(ctx, func(c *respClient) error {
		v, er := c.cmd("LLEN", model.GlobalPendingKey)
		if er != nil {
			return er
		}
		n = v.(int64)
		return nil
	})
	return n, e
}

func (s *RedisStore) CleanupExpired(ctx context.Context, limit int) (int, error) {
	if limit < 1 {
		return 0, nil
	}
	n := 0
	err := s.with(ctx, func(c *respClient) error {
		v, e := c.cmd("LRANGE", model.GlobalPendingKey, "0", strconv.Itoa(limit-1))
		if e != nil {
			return e
		}
		arr, _ := v.([]any)
		for _, x := range arr {
			id, ok := x.(string)
			if !ok {
				continue
			}
			mv, e := c.cmd("GET", msgKey(id))
			if e != nil {
				return e
			}
			if mv == nil {
				_, _ = c.cmd("LREM", model.GlobalPendingKey, "0", id)
				n++
			}
		}
		return nil
	})
	return n, err
}
