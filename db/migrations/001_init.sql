-- PARSAping initial schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('user', 'admin');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'user',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash  TEXT NOT NULL,
    user_agent          TEXT,
    ip                  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL,
    revoked_at          TIMESTAMPTZ
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

CREATE TABLE nodes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    region          TEXT NOT NULL,
    endpoint_host   TEXT NOT NULL,
    endpoint_port   INTEGER NOT NULL DEFAULT 51820,
    public_key      TEXT NOT NULL,
    interface_name  TEXT NOT NULL DEFAULT 'wg0',
    ip_range        CIDR NOT NULL,
    dns             TEXT NOT NULL DEFAULT '1.1.1.1',
    mtu             INTEGER NOT NULL DEFAULT 1420,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    max_peers       INTEGER NOT NULL DEFAULT 250,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE node_health (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id         UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    ping_ms         NUMERIC(8,2),
    jitter_ms       NUMERIC(8,2),
    packet_loss     NUMERIC(5,2),
    load_pct        NUMERIC(5,2),
    online          BOOLEAN NOT NULL DEFAULT TRUE,
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_node_health_node_id_time ON node_health(node_id, checked_at DESC);

CREATE TABLE peers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    node_id                 UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    public_key              TEXT NOT NULL,
    private_key_encrypted   TEXT NOT NULL, -- AES-256-GCM, never logged
    allocated_ip            INET NOT NULL,
    allowed_ips             TEXT NOT NULL DEFAULT '0.0.0.0/0, ::/0',
    persistent_keepalive    INTEGER NOT NULL DEFAULT 25,
    is_revoked              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at              TIMESTAMPTZ,
    UNIQUE(node_id, allocated_ip)
);
CREATE INDEX idx_peers_user_id ON peers(user_id);
CREATE INDEX idx_peers_node_id ON peers(node_id);

CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           TEXT UNIQUE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    regenerated_at  TIMESTAMPTZ
);
CREATE INDEX idx_subscriptions_token ON subscriptions(token);

CREATE TABLE connection_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    peer_id         UUID NOT NULL REFERENCES peers(id) ON DELETE CASCADE,
    connected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    disconnected_at TIMESTAMPTZ,
    bytes_up        BIGINT NOT NULL DEFAULT 0,
    bytes_down      BIGINT NOT NULL DEFAULT 0,
    avg_ping_ms     NUMERIC(8,2),
    avg_jitter_ms   NUMERIC(8,2),
    avg_loss_pct    NUMERIC(5,2)
);
CREATE INDEX idx_connection_logs_peer_id ON connection_logs(peer_id);

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    action          TEXT NOT NULL,
    target_type     TEXT,
    target_id       TEXT,
    meta            JSONB,
    ip              TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_nodes_updated_at BEFORE UPDATE ON nodes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
