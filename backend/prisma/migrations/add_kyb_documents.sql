-- Add KYB document storage
CREATE TABLE IF NOT EXISTS kyb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'CAC_CERTIFICATE', 'TAX_CERTIFICATE', 'BANK_STATEMENT', 'ID_CARD', 'PROOF_OF_ADDRESS'
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL, -- Encrypted path or S3 key
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'REJECTED'
  verification_notes TEXT,
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kyb_documents_business ON kyb_documents(business_id);
CREATE INDEX idx_kyb_documents_status ON kyb_documents(status);
