# Obeam: Path to Acquisition — Strategic Roadmap

**Goal:** Build Obeam into an acquisition target (Stripe, Paystack, Flutterwave, or similar).

**Reference:** Metronome → Stripe (Jan 2026). What made them attractive: **hard infrastructure problem**, **enterprise customers**, **usage-based billing at scale**.

---

## 🎯 What Made Metronome Attractive

1. **Hard technical problem** — Usage-based billing/metering is complex (multi-dimensional, real-time, auditability)
2. **Enterprise customers** — Major AI companies, chip makers (high-value logos)
3. **Infrastructure play** — Not just a product, but foundational infrastructure others build on
4. **Clear monetization** — Usage-based pricing (they eat their own dog food)
5. **Regulatory moat** — Compliance, auditability, financial controls

**Obeam's equivalent:**
- ✅ Hard problem: Cross-border payments + compliance (AML, FX, settlement)
- ⚠️ Need: Enterprise customers (not just SMBs)
- ✅ Infrastructure: Double-entry ledger, API-first
- ⚠️ Need: Clear monetization model
- ✅ Regulatory moat: AML, KYB, CBN/BOG compliance

---

## 🚀 Product Strategy Changes (Critical)

### Current State
- **Product:** B2B cross-border payments (Nigeria → Ghana)
- **Market:** Single corridor, manual admin settlement
- **Customers:** Small businesses (assumed)

### Target State (Acquisition-Ready)

#### 1. **Expand from Product → Platform**

**Current:** "We help businesses pay suppliers in Ghana"

**Target:** "We are the infrastructure layer for African cross-border payments"

**Changes:**
- **API-first platform** — Other fintechs/payment companies integrate Obeam as infrastructure
- **White-label** — Banks, neobanks, marketplaces use Obeam under their brand
- **Multi-corridor** — Not just NGN→GHS, but NGN→KES, GHS→NGN, etc.
- **Settlement rails** — Automated settlement (not manual admin clicks)

#### 2. **Enterprise-First Go-to-Market**

**Why:** Acquirers want enterprise logos (like Metronome had OpenAI)

**Strategy:**
- **Target:** Large Nigerian companies with Ghana operations (Dangote, MTN, banks, fintechs)
- **Pricing:** Volume-based (not per-transaction %)
- **Features:** API access, webhooks, dedicated support, SLA guarantees
- **Compliance:** Enterprise-grade AML, audit logs, SOC 2 (eventually)

#### 3. **AI-Powered Compliance & Risk**

**Why:** Differentiator + moat

**AI Use Cases:**

**A. AML/KYC Automation**
- **Document verification:** OCR + AI to verify business docs (CAC, tax certs)
- **Risk scoring:** ML model to score counterparty risk (sanctions, PEP, adverse media)
- **Transaction monitoring:** Anomaly detection for suspicious patterns (structuring, round numbers, timing)
- **Sanctions screening:** Real-time checks against OFAC, UN, local lists

**B. FX Risk Management**
- **Rate prediction:** ML to predict FX volatility (hedge recommendations)
- **Settlement optimization:** AI to batch/route settlements for best rates/timing
- **Fraud detection:** Pattern recognition for fake quotes, rate manipulation

**C. Compliance Automation**
- **Regulatory reporting:** Auto-generate CBN/BOG reports
- **Audit trail:** AI-powered transaction categorization for accounting
- **KYB automation:** Auto-extract business info from documents

**D. Customer Experience**
- **Smart routing:** AI to choose best settlement path (cost, speed, reliability)
- **Predictive analytics:** "Your supplier usually gets paid on Fridays — schedule now?"
- **Chat support:** Smart support for common questions (status, fees, limits)

**Implementation Priority:**
1. **Phase 1 (MVP):** Document OCR (Tesseract + GPT-4 Vision), basic risk scoring (rule-based + ML)
2. **Phase 2:** Transaction monitoring, sanctions screening (integrate with providers)
3. **Phase 3:** FX prediction, smart routing, full compliance automation

#### 4. **Monetization Model (Like Metronome)**

**Current:** Likely per-transaction fee (not clear)

**Target:** **Usage-based infrastructure pricing**

**Tiers:**
- **Starter:** $0.50/transaction (up to 100/month)
- **Growth:** $0.30/transaction (100–1,000/month)
- **Enterprise:** Volume-based (custom pricing, API access, SLA)

**Plus:**
- **FX spread:** Small margin on FX rates (0.5–1%)
- **Settlement fees:** Optional fast settlement (24hr vs 3 days) for premium
- **API access:** Separate pricing for API-only customers (white-label)

**Why:** Predictable revenue, scales with customer growth, aligns incentives

#### 5. **Technical Moats**

**A. Real-Time Settlement**
- **Current:** Manual admin settlement
- **Target:** Automated settlement via bank APIs (Open Banking Nigeria, OpenDX Ghana)
- **Value:** 24hr → instant settlement (competitive advantage)

**B. Multi-Currency Ledger**
- **Current:** NGN + GHS only
- **Target:** Any currency pair (NGN→KES, GHS→ZAR, etc.)
- **Value:** Platform extensibility

**C. Compliance Infrastructure**
- **Current:** Basic KYB
- **Target:** Full AML stack (sanctions, PEP, adverse media, transaction monitoring)
- **Value:** Enterprise requirement, regulatory moat

**D. Developer Experience**
- **Current:** Basic API
- **Target:** SDKs (Node, Python, PHP), webhooks, sandbox, docs, status page
- **Value:** Platform adoption

---

## 📊 Acquisition Readiness Checklist

### Technical (Must-Have)
- [x] Double-entry ledger (auditable)
- [x] API-first architecture
- [ ] Real-time settlement (automated)
- [ ] Multi-corridor support (beyond NGN→GHS)
- [ ] Enterprise-grade compliance (AML, KYB, sanctions)
- [ ] High uptime (99.9%+ SLA)
- [ ] Audit logs, data retention, SOC 2 (eventually)

### Business (Must-Have)
- [ ] **$1M+ ARR** (minimum for serious acquisition talks)
- [ ] **Enterprise customers** (3–5 logos: banks, large corporates, fintechs)
- [ ] **Clear unit economics** (profitable per transaction)
- [ ] **Regulatory licenses** (where required: CBN, BOG)
- [ ] **Defensible moat** (compliance, network effects, technical complexity)

### Market (Must-Have)
- [ ] **Multi-corridor** (not just one route)
- [ ] **White-label/API customers** (platform play, not just end-users)
- [ ] **Clear TAM** (Total Addressable Market) — e.g., "$X billion in Nigeria–Ghana trade"

---

## 🎯 12-Month Roadmap to Acquisition

### Months 1–3: **Foundation**
- ✅ Complete MVP (current state)
- [ ] Integrate live FX feeds (ExchangeRate-API → AbokiFX)
- [ ] Integrate bank APIs (Open Banking Nigeria, OpenDX Ghana)
- [ ] Automated settlement (no manual admin clicks)
- [ ] Basic AI: Document OCR (KYB automation)

**Goal:** Real product with real money movement

### Months 4–6: **Enterprise Customers**
- [ ] Target 3–5 enterprise customers (banks, large corporates)
- [ ] Volume-based pricing model
- [ ] API documentation, SDKs (Node, Python)
- [ ] Webhooks, status page
- [ ] AI: Risk scoring, transaction monitoring

**Goal:** $50K–$100K MRR, enterprise logos

### Months 7–9: **Platform Play**
- [ ] White-label offering (other fintechs use Obeam)
- [ ] Multi-corridor (NGN→KES, GHS→NGN, etc.)
- [ ] Full AML stack (sanctions, PEP, adverse media)
- [ ] AI: FX prediction, smart routing
- [ ] SOC 2 Type I (if targeting US acquirers)

**Goal:** $200K–$500K MRR, platform customers

### Months 10–12: **Acquisition Readiness**
- [ ] $1M+ ARR
- [ ] 5–10 enterprise logos
- [ ] Multi-corridor (5+ routes)
- [ ] Regulatory licenses (CBN, BOG)
- [ ] Clear moat (compliance, network effects)
- [ ] Data room ready (financials, contracts, tech docs)

**Goal:** Acquisition conversations with Stripe, Paystack, Flutterwave

---

## 🤖 AI Implementation Plan

### Phase 1: Compliance AI (Months 1–3)

**Document OCR**
- **Tech:** Tesseract OCR + GPT-4 Vision API
- **Use case:** Auto-extract business info from CAC, tax certs, bank statements
- **Impact:** 80% reduction in manual KYB review time

**Risk Scoring**
- **Tech:** Rule-based + ML model (scikit-learn or TensorFlow)
- **Features:** Sanctions match, PEP check, adverse media, transaction history
- **Impact:** Automated risk decisions (pass/review/decline)

**Implementation:**
```typescript
// backend/src/ai/kyb-service.ts
- OCR business documents
- Extract: business name, registration number, directors
- Cross-check against sanctions/PEP lists
- Score risk (0–100)
- Auto-approve low risk, flag high risk for review
```

### Phase 2: Transaction Monitoring (Months 4–6)

**Anomaly Detection**
- **Tech:** Isolation Forest or Autoencoder (TensorFlow)
- **Features:** Amount patterns, timing, frequency, counterparty relationships
- **Impact:** Flag suspicious transactions automatically

**Sanctions Screening**
- **Tech:** Integrate with Dow Jones, World-Check, or local providers
- **Use case:** Real-time checks on counterparties
- **Impact:** Compliance automation

### Phase 3: Smart Features (Months 7–12)

**FX Prediction**
- **Tech:** Time-series ML (Prophet, LSTM)
- **Use case:** Predict rate volatility, recommend hedging
- **Impact:** Better rates for customers

**Smart Routing**
- **Tech:** Optimization algorithm + ML
- **Use case:** Choose best settlement path (cost, speed, reliability)
- **Impact:** Lower costs, faster settlement

---

## 💰 Monetization Strategy

### Current (Assumed)
- Per-transaction fee (e.g., 1–2% + FX spread)

### Target (Like Metronome)
- **Usage-based pricing** (per transaction, volume tiers)
- **FX spread** (0.5–1% margin)
- **API access** (separate pricing for white-label)
- **Fast settlement** (premium: 24hr vs 3 days)

**Example Pricing:**
```
Starter: $0.50/transaction (up to 100/month)
Growth: $0.30/transaction (100–1,000/month)
Enterprise: Custom (volume-based, API, SLA)
```

**Why:** Predictable, scalable, aligns with customer growth

---

## 🎯 Key Metrics to Track

### Product Metrics
- **Transaction volume** (monthly)
- **Settlement time** (avg hours)
- **FX spread** (margin)
- **Uptime** (99.9%+ target)

### Business Metrics
- **ARR** (Annual Recurring Revenue)
- **MRR** (Monthly Recurring Revenue)
- **CAC** (Customer Acquisition Cost)
- **LTV** (Lifetime Value)
- **Unit economics** (profit per transaction)

### Customer Metrics
- **Enterprise customers** (count, logos)
- **API customers** (white-label/platform)
- **NPS** (Net Promoter Score)
- **Churn** (monthly)

---

## 🚨 Risks & Mitigations

### Risk 1: Regulatory Changes
- **Mitigation:** Stay ahead of CBN/BOG regulations, build compliance-first

### Risk 2: Competition (Paystack, Flutterwave)
- **Mitigation:** Focus on compliance moat, AI differentiation, multi-corridor

### Risk 3: Single Corridor Dependency
- **Mitigation:** Expand to 3+ corridors by Month 9

### Risk 4: Manual Settlement Bottleneck
- **Mitigation:** Automate settlement (Open Banking, OpenDX) by Month 3

---

## ✅ Next Steps (This Week)

1. **Decide on product strategy:**
   - [ ] Keep current (B2B payments) OR pivot to platform (infrastructure)
   - [ ] Recommendation: **Pivot to platform** (higher acquisition value)

2. **Start AI implementation:**
   - [ ] Set up AI service module (`backend/src/ai/`)
   - [ ] Integrate OCR (Tesseract + GPT-4 Vision)
   - [ ] Build risk scoring MVP

3. **Enterprise outreach:**
   - [ ] List 10 target enterprise customers
   - [ ] Create enterprise pitch deck
   - [ ] Start conversations

4. **Automate settlement:**
   - [ ] Integrate Open Banking Nigeria (sandbox)
   - [ ] Integrate OpenDX Ghana (sandbox)
   - [ ] Build automated settlement flow

---

## 📚 Resources

- **Metronome → Stripe:** Study their positioning, customer base, technical moats
- **Paystack → Stripe:** Similar acquisition (African fintech)
- **Compliance:** CBN Open Banking, BOG Open Banking Directive
- **AI:** Hugging Face, OpenAI API, TensorFlow, scikit-learn

---

**Bottom Line:** To get acquired like Metronome, Obeam needs to be **infrastructure** (not just a product), serve **enterprise customers**, and have a **clear moat** (compliance + AI). The current product is good, but needs platform expansion, enterprise focus, and AI differentiation.
