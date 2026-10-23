# DealKart: Card Offer Checker at Checkout (LangGraph Multi-Agent)

A full-stack Indian e-commerce marketplace (Amazon / Flipkart style in INR ₹) featuring a transparent **10-node LangGraph Card Offer Checker** at checkout. Shoppers can ask by **voice or chat** ("Which of my cards gives the best deal on this cart?"), watch the agent scrape messy bank offer pages, calculate strict discount caps, catch hidden EMI processing fees, request human approval, apply the discount idempotently without taking payment, and re-verify the final cart.

---

## 1. Quickstart (Local Run in 3 Commands)

```bash
# 1. Install dependencies
npm install

# 2. Set API keys (optional: app includes built-in deterministic demo fallback)
cp .env.example .env

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Google Chrome or Edge (recommended for Web Speech API mic support).

---

## 2. LangGraph Architecture Diagram

```
                             [Shopper Voice / Chat Query]
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │         1. intake_node          │
                         │ Reads Cart & Saved User Cards   │
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │    2. offer_retriever_agent     │
                         │ Scrapes /bank-offers/:bank HTML │
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │     3. card_extractor_agent     │
                         │ Extracts Caps, Spends, Expiry   │
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │      4. eligibility_agent       │
                         │ Tests Min Spends & Categories   │
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │   5. best_offer_decider_agent   │
                         │ Evaluates Caps vs True EMI Fees │
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │        6. summary_node          │
                         │ Ranks Cards Ascending by Price  │
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │ 7. human_approval_node          │ ◄── [INTERRUPT]
                         │ "Apply HDFC10, saves ₹1,500?"   │     Awaits User Click/Voice
                         └────────┬───────────────┬────────┘
                                  │               │
                            (User Approves) (User Rejects / Swaps)
                                  │               │
                                  │               └──► Loops back with constraint
                                  ▼
                         ┌─────────────────────────────────┐
                         │      8. apply_offer_node        │
                         │ Idempotent discount (NO payment)│
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │       9. reverify_node          │
                         │ Compares Expected vs Observed   │
                         │ Detects Tampering / Mismatch    │
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │       10. respond_node          │
                         │ Spoken Audio TTS + Text Summary │
                         └─────────────────────────────────┘
```

---

## 3. Environment Variables

| Variable | Required | Description | Default |
| :--- | :--- | :--- | :--- |
| `PORT` | No | Server listening port | `3000` |
| `GEMINI_API_KEY` | Auto / User Secret | Google Gemini AI key (Server-side `@google/genai`) | Injected by AI Studio |
| `GROQ_API_KEY` | Optional | Free Groq API Key | Empty (Falls back to Gemini or deterministic cache) |
| `GROQ_MODEL_MAIN` | Optional | Groq reasoning model with tool calling | `llama-3.3-70b-versatile` |
| `GROQ_MODEL_FAST` | Optional | Groq intent extraction model | `llama-3.1-8b-instant` |

---

## 4. Free Deployment Guide

### Option A: Render (Free Web Service)
1. Fork or push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** → **Web Service**.
3. Select your repository. Under **Environment**, choose **Docker**.
4. In **Environment Variables**, set:
   - `PORT`: `3000`
   - `GEMINI_API_KEY` or `GROQ_API_KEY`: *(Optional, for live LLM reasoning)*
5. Click **Create Web Service**. Render builds the multi-stage Dockerfile and deploys on HTTPS (required for Web Speech microphone access).

### Option B: Hugging Face Spaces (Docker Space)
1. In [Hugging Face Spaces](https://huggingface.co/spaces), click **Create new Space**.
2. Select **Docker** SDK with the blank template.
3. Push this repository to your Space git remote or upload files.
4. In **Settings** → **Variables and secrets**, add `GROQ_API_KEY` or `GEMINI_API_KEY`.
5. Your Space runs automatically in a secure container with zero setup!

---

## 5. Running the 4 Audit Test Scenarios

Navigate to the **Test Lab** tab (`/tests`) in the top navigation, or run the test endpoint directly:

```bash
curl -X POST http://localhost:3000/api/tests/run -H "Content-Type: application/json" -d '{}'
```

### The 4 Scenarios:
1. **Simple Win**: ₹12,000 Electronics cart evaluated against 3 cards. The 10% instant discount offer capped at ₹1,500 wins, delivering ₹1,200 savings with cap respected.
2. **Cap and Minimum Spend Trap**: Big cart (~₹35,000) where the percentage offer hits its ₹1,500 maximum ceiling, allowing a flat discount (₹2,500) to beat it, while another card fails minimum spend.
3. **EMI Trap**: ₹40,000 cart where advertised "No-Cost EMI" carries a hidden ₹299 + GST processing fee, making a direct instant discount cheaper in true net payable cost.
4. **Edge and Failure**: Expired offer, debit-only restriction, missing terms flagged as `uncertain`, and simulated cart tampering between apply and re-verify caught by the verification engine.

---

## 6. 60–90 Second Demo Script

1. **Add Items**: On the **Shop** page, click **Add** on the *AuraSonic ANC Wireless Headphones* (₹12,000) and click **Checkout**.
2. **Voice Query**: Click the **Microphone** button and ask aloud:
   > *"Which of my cards gives the best deal on this cart?"*
3. **Watch Node Stepper**: Watch the agent transition through Nodes 1–6 (Intake → Retriever → Extractor → Eligibility → Decider → Summary).
4. **Inspect Table & Evidence**:
   - The ranked table reveals **HDFC Bank Regalia Gold** as #1 (10% capped saving of ₹1,200).
   - Click the chevron to open the **Evidence Drawer** showing the raw scraped excerpt from `/bank-offers/hdfc` and timestamp.
5. **Approve Proposal**:
   - The agent interrupts at Node 7: *"Apply HDFC Regalia offer HDFC_ELEC_10, saves ₹1,200, new total ₹10,800?"*
   - Click **Approve & Apply Offer**.
6. **Re-Verify & Confirmation**:
   - Node 8 applies the discount with an idempotency key.
   - Node 9 re-verifies the cart total.
   - Node 10 speaks the summary: *"Offer applied! Your HDFC Bank Regalia Gold Credit Card saved you ₹1,200..."*
7. **Audit Trail**: Click the **Audit Trail** tab in the header to view the immutable decision log.
