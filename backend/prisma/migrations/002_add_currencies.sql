-- Add new currencies to the currency_code enum
ALTER TYPE currency_code ADD VALUE IF NOT EXISTS 'KES';
ALTER TYPE currency_code ADD VALUE IF NOT EXISTS 'ZAR';
ALTER TYPE currency_code ADD VALUE IF NOT EXISTS 'XOF';
ALTER TYPE currency_code ADD VALUE IF NOT EXISTS 'USD';
ALTER TYPE currency_code ADD VALUE IF NOT EXISTS 'GBP';
