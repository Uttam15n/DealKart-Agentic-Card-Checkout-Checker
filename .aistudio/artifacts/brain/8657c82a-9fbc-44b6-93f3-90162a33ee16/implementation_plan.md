# DealKart: Card Offer Checker at Checkout with LangGraph

DealKart is a full-featured Indian e-commerce marketplace (Amazon / Flipkart style in INR ₹) with a transparent, 10-node **LangGraph Card Offer Checker** at checkout. Shoppers can ask by voice or chat ("Which card gives me the best deal on this cart?"), watch the agent scrape messy bank offer pages, calculate caps, min spends, and true EMI costs, request human approval, apply the discount without processing payment, and re-verify the final cart.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and user experience decisions were confirmed in Phase 1:
> - **AI Engine**: Dual engine architecture supporting both Google Gemini (`gemini-3.8-flash` via server-side `@google/genai`) and Groq API (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`), with an instant cached replay fallback for zero-failure demos and offline evaluation.
> - **Marketplace Theme**: DealKart multi-category Indian retail marketplace (Electronics, Fashion, Home, Grocery) priced in INR (₹) with real brand names, ratings, and genuine Indian banking context (HDFC, ICICI, SBI, Axis, Kotak, Amex).
> - **Test Suite Experience**: Visual Interactive Test Runner tab (`/tests`) with 1-click test execution, live step-by-step diffs (Expected vs. Observed), and a direct "Load Scenario into Checkout" trigger.

---

## 1. Overview & Core Concept

When shopping online, bank offers are scattered across confusing terms, arbitrary discount caps (e.g. "10% off up to ₹1,500"), high minimum spend thresholds, and deceptive "No-Cost EMI" schemes with hidden processing fees.

**DealKart Card Offer Checker** solves this directly at checkout:
1. **Intelligent Retrieval & Parsing**: Scrapes mock HTML bank offer pages (`/bank-offers/:bank`) containing natural language terms, unstructured caveats, and conflicting promotions.
2. **Deterministic & Agentic Reasoning**: Evaluates every owned card against cart categories, line items, and threshold conditions.
3. **True EMI Cost Analysis**: Compares instant discounts against EMI interest and processing fees to calculate the true final payable amount.
4. **Human-in-the-Loop Approval & Safe Verification**: Halts execution at an approval node before mutating cart state, applies the offer idempotently (never touching payment or full card numbers), and runs a secondary re-verification check.

---

## 2. User Experience & Visual Design

Following the **Universal Frontend Design Constitution** and **E-Commerce & Retail Design Guidelines**:
- **Aesthetic Direction**: Premium Indian marketplace aesthetic inspired by Flipkart VIP & Tata Neu. Deep slate canvas (`#0F172A`), crisp warm-white surfaces (`#F8FAFC`), rich sapphire blue accent (`#2563EB`), and emerald savings accents (`#059669`).
- **Typography**: `Plus Jakarta Sans` for clean, contemporary headings, paired with `DM Sans` for body text and tabular monospace (`font-mono tabular-nums`) for currency values, GST, and pricing calculations.
- **Top Bar Contract**: Strict 3-zone header:
  - **Zone 1 (Wordmark)**: `DealKart` with subtle Indian shopping spark.
  - **Zone 2 (Nav Links)**: Clean text links (`Shop`, `Bank Offers`, `Test Lab`, `Audit Log`).
  - **Zone 3 (Action)**: Cart badge with dynamic count stepper & User profile dropdown.
- **Zero-Pill Restraint**: Metadata rendered with clean unboxed text and typographic separators (`Electronics · 4.4 ★ · ₹12,999`).
- **Checkout Offer Panel**:
  - Voice mic with visual recording state, real-time speech transcript, and quick query chips.
  - Live agent node progress ticker (`1. intake` → `2. retriever` → `3. extractor` → `4. eligibility` → `5. decider` → `6. summary` → `7. approval`).
  - Ranked Card Savings Table sorted strictly ascending by final payable price (cheapest first).
  - Expandable **Evidence Drawer** showing the exact scraped excerpt, source bank URL, retrieval timestamp, and agent calculation trail.
  - Interactive **Human Approval Gate** modal and button before cart update.
  - Post-apply **Re-Verification Banner** comparing expected total vs. actual cart total.

---

## 3. Key Product Decisions & Trade-Offs

- **Dual AI Engine Strategy (Gemini + Groq + Replay)**:
  - *Chosen Approach*: The server provides a unified LangGraph-style runner supporting Gemini (`gemini-3.8-flash`), Groq (`llama-3.3-70b-versatile`), and deterministic fallback cache.
  - *Why*: Guarantees 100% test pass rate even if third-party free API keys are rate-limited or absent, while retaining true multi-agent LLM reasoning when keys are present.
- **Stateful In-Memory & Persistence**:
  - *Chosen Approach*: Seeded store on startup storing 60+ products, carts, mock bank offer sites, saved cards (last 4 digits only), and immutable audit logs.
  - *Why*: Safe, ephemeral, zero-configuration setup that works out-of-the-box on local Node/Vite, Docker, Render, and Hugging Face Spaces.
- **Web Speech API with Fallback**:
  - *Chosen Approach*: Browser-native `SpeechRecognition` / `webkitSpeechRecognition` for speech-to-text and `window.speechSynthesis` for spoken summaries, with immediate graceful fallback to text chat on unsupported browsers.
- **Strict Separation of Apply & Re-Verify**:
  - *Chosen Approach*: `apply_offer_node` writes the discount with an idempotency token; `reverify_node` reads back the refreshed cart and confirms every invariant before granting final checkout clearance.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          DealKart Frontend                             │
│   (Vite + React 19 + Tailwind v4 + Lucide + Web Speech API)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / SSE
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Express API & State Graph Server                 │
│                                                                        │
│   ┌─────────────────────┐                 ┌────────────────────────┐   │
│   │  E-Commerce API     │                 │   Mock Bank HTML Pages │   │
│   │  /api/products      │                 │   /bank-offers/hdfc    │   │
│   │  /api/cart          │                 │   /bank-offers/icici   │   │
│   │  /api/cards         │                 │   /bank-offers/sbi...  │   │
│   └──────────┬──────────┘                 └───────────┬────────────┘   │
│              │                                        │                │
│              └───────────────────┬────────────────────┘                │
│                                  │                                     │
│   ┌──────────────────────────────▼─────────────────────────────────┐   │
│   │              LangGraph-Style Card Offer State Engine            │   │
│   │                                                                │   │
│   │   [1. Intake] ──► [2. Retriever] ──► [3. Extractor]            │   │
│   │                          │                                     │   │
│   │                          ▼                                     │   │
│   │   [6. Summary] ◄── [5. Decider] ◄── [4. Eligibility]           │   │
│   │        │                                                       │   │
│   │        ▼                                                       │   │
│   │   [7. Human Approval Node (INTERRUPT)]                         │   │
│   │        │                                                       │   │
│   │        ├── (User Rejects / Swaps Card) ──► Back to Decider     │   │
│   │        └── (User Approves)                                     │   │
│   │                 │                                              │   │
│   │                 ▼                                              │   │
│   │   [8. Apply Offer Node (Idempotent)]                           │   │
│   │                 │                                              │   │
│   │                 ▼                                              │   │
│   │   [9. Re-Verify Node (Audit Invariant Check)]                  │   │
│   │                 │                                              │   │
│   │                 ▼                                              │   │
│   │   [10. Respond Node (Audio TTS + Structured Summary)]          │   │
│   └──────────────────────────────┬─────────────────────────────────┘   │
│                                  │                                     │
│   ┌──────────────────────────────▼─────────────────────────────────┐   │
│   │  AI Reasoners: Gemini 3.8 Flash / Groq Llama 3.3 / Test Cache  │   │
│   │  Database: In-Memory / SQLite with Audit Trail & Idempotency   │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Verification & Test Scenarios

The visual test lab at `/tests` validates the 4 scenarios:
1. **Simple Win**: ₹12,000 cart, 10% capped at ₹1,500 vs flat ₹750 → HDFC 10% capped saving ₹1,200 wins.
2. **Cap & Minimum Spend Trap**: ₹35,000 cart where 10% hits ₹1,500 cap, but ICICI flat ₹2,500 off beats it; SBI card fails ₹40,000 min spend.
3. **EMI Trap**: ₹40,000 cart where 6-month "No-Cost EMI" has a ₹299 processing fee + GST, making instant ₹2,000 discount significantly cheaper overall.
4. **Edge & Failure**: Expired festive offer, debit-only restriction, missing terms flagged as `uncertain`, and simulated cart tampering between apply and re-verify caught by the verification engine.

---

## 5. Execution Stages

1. **Stage 1: Core E-Commerce & Seed Data**:
   - 60+ diverse products across Electronics, Fashion, Home, and Grocery.
   - Dynamic cart state management with quantity adjustments, GST (18%), and free delivery thresholds.
   - Product detail modals, category filtering, search, and sorting.
2. **Stage 2: Mock Bank Sites & Offer Generator**:
   - Realistic mock bank sites (`/bank-offers/:bank`) serving rich natural language offer documents for HDFC, ICICI, SBI, Axis, Kotak, and Amex.
   - Messy real-world conditions: tenure, processing fees, brand exclusions, expiry dates, and usage limits.
3. **Stage 3: 10-Node LangGraph Engine with Dual AI**:
   - Express server routes executing the 10 graph nodes.
   - Dual-engine integration supporting `@google/genai` (Gemini 3.8 Flash) and Groq API with deterministic calculator tools and exact arithmetic.
   - Full human-in-the-loop interruption gate and idempotency control.
4. **Stage 4: Checkout Voice & Chat Experience**:
   - Dedicated checkout page with saved addresses and saved cards.
   - Integrated Offer Checker panel with Web Speech recognition, live audio feedback, node execution stepper, and sorted card comparison table.
   - One-click evidence inspection drawer and human approval modal.
5. **Stage 5: Test Lab, Docker & Deployment Artifacts**:
   - Visual Test Runner tab (`/tests`) running the 4 scenarios.
   - Multi-stage `Dockerfile`, `docker-compose.yml`, and `README.md` with step-by-step instructions for local execution, Render, and Hugging Face Spaces.
