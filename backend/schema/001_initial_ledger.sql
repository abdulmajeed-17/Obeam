-- Obeam V1 — Double-entry ledger schema
-- Amounts in minor units (kobo / pesewas). Run against PostgreSQL.

-- ---------- ENUMS ----------
CREATE TYPE currency_code AS ENUM ('NGN', 'GHS');
CREATE TYPE business_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
CREATE TYPE transfer_status AS ENUM ('DRAFT', 'PENDING_KYB', 'PENDING_FUNDS', 'QUEUED', 'PROCESSING', 'SETTLED', 'FAILED', 'CANCELLED');
CREATE TYPE account_type AS ENUM (
  'CUSTOMER_WALLET',
  'TREASURY',
  'CLEARING',
  'FEES',
  'FX_REVENUE',
  'PAYABLE'
);
CREATE TYPE entry_type AS ENUM (
  'WALLET_TOPUP',
  'WALLET_WITHDRAWAL',
  'TRANSFER_CREATE',
  'TRANSFER_SETTLE',
  'TRANSFER_CANCEL',
  'FEE_CHARGE',
  'FX_CONVERSION'
);

-- ---------- BUSINESS + USERS ----------
CREATE TABLE businesses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  country          TEXT NOT NULL,
  status           business_status NOT NULL DEFAULT 'PENDING',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id),
  email            TEXT NOT NULL UNIQUE,
  phone            TEXT,
  password_hash    TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'OWNER',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- COUNTERPARTIES ----------
CREATE TABLE counterparties (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id),
  name             TEXT NOT NULL,
  country          TEXT NOT NULL,
  payout_type      TEXT NOT NULL,
  payout_ref       TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- ACCOUNTS ----------
CREATE TABLE accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NULL REFERENCES businesses(id),
  currency         currency_code NOT NULL,
  type             account_type NOT NULL,
  label            TEXT NOT NULL,
  is_platform      BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_business_wallet_currency
  ON accounts(business_id, currency, type)
  WHERE type = 'CUSTOMER_WALLET';

-- ---------- LEDGER ----------
CREATE TABLE journal_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type       entry_type NOT NULL,
  currency         currency_code NOT NULL,
  reference_type   TEXT NOT NULL,
  reference_id     UUID NOT NULL,
  memo             TEXT,
  created_by       UUID NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE postings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id         UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id       UUID NOT NULL REFERENCES accounts(id),
  direction        TEXT NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
  amount           BIGINT NOT NULL CHECK (amount > 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_postings_entry ON postings(entry_id);
CREATE INDEX idx_postings_account ON postings(account_id);

CREATE OR REPLACE FUNCTION enforce_balanced_entry()
RETURNS TRIGGER AS $$
DECLARE
  entry_uuid UUID;
  debit_sum BIGINT;
  credit_sum BIGINT;
BEGIN
  entry_uuid := COALESCE(NEW.entry_id, OLD.entry_id);

  SELECT COALESCE(SUM(amount),0) INTO debit_sum
  FROM postings WHERE entry_id = entry_uuid AND direction='DEBIT';

  SELECT COALESCE(SUM(amount),0) INTO credit_sum
  FROM postings WHERE entry_id = entry_uuid AND direction='CREDIT';

  IF debit_sum <> credit_sum THEN
    RAISE EXCEPTION 'Unbalanced journal entry %: debit % credit %', entry_uuid, debit_sum, credit_sum;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_balanced_entry
AFTER INSERT OR UPDATE OR DELETE ON postings
FOR EACH ROW EXECUTE FUNCTION enforce_balanced_entry();

-- ---------- FX ----------
CREATE TABLE fx_rates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base             currency_code NOT NULL,
  quote            currency_code NOT NULL,
  rate             NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  source           TEXT NOT NULL,
  as_of            TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fx_rates_pair_time ON fx_rates(base, quote, as_of DESC);

CREATE TABLE fx_trades (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id),
  base_currency    currency_code NOT NULL,
  quote_currency   currency_code NOT NULL,
  base_amount      BIGINT NOT NULL CHECK (base_amount > 0),
  quote_amount     BIGINT NOT NULL CHECK (quote_amount > 0),
  rate_used        NUMERIC(18,8) NOT NULL,
  spread_bps       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- TRANSFERS ----------
CREATE TABLE transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id),
  counterparty_id  UUID NOT NULL REFERENCES counterparties(id),
  from_currency    currency_code NOT NULL,
  to_currency      currency_code NOT NULL,
  from_amount      BIGINT NOT NULL CHECK (from_amount > 0),
  to_amount        BIGINT NOT NULL CHECK (to_amount > 0),
  fee_amount       BIGINT NOT NULL DEFAULT 0,
  status           transfer_status NOT NULL DEFAULT 'DRAFT',
  fx_trade_id      UUID NULL REFERENCES fx_trades(id),
  created_by       UUID NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transfers_business_time ON transfers(business_id, created_at DESC);

-- ---------- AUDIT ----------
CREATE TABLE audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id    UUID NULL REFERENCES users(id),
  business_id      UUID NULL REFERENCES businesses(id),
  action           TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        UUID NOT NULL,
  meta             JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
