CREATE TYPE invoice_status AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED');

CREATE TABLE invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id),
  counterparty_id  UUID NOT NULL REFERENCES counterparties(id),
  invoice_number   TEXT NOT NULL UNIQUE,
  currency         currency_code NOT NULL,
  amount           BIGINT NOT NULL CHECK (amount > 0),
  description      TEXT,
  due_date         TIMESTAMPTZ,
  status           invoice_status NOT NULL DEFAULT 'DRAFT',
  paid_at          TIMESTAMPTZ,
  transfer_id      UUID,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_business ON invoices(business_id, created_at DESC);
CREATE INDEX idx_invoices_counterparty ON invoices(counterparty_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
