import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { SEED_PRODUCTS, SEED_CARDS, SEED_TEST_SCENARIOS } from './src/data/seedData';
import { MOCK_BANK_PAGES } from './src/data/mockBankData';
import {
  runAgentGraph,
  getAuditLogs,
  AgentRunInput,
} from './server/agentEngine';
import { CartItem, Product } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
app.use(express.json());

// In-memory demo cart state
let currentCart: {
  items: CartItem[];
  subtotal: number;
  gst: number;
  deliveryFee: number;
  cartTotal: number;
  appliedOfferCode: string | null;
  appliedDiscount: number;
} = {
  items: [
    {
      product: SEED_PRODUCTS.find((p) => p.id === 'prod_elec_02') || SEED_PRODUCTS[1],
      quantity: 1,
    },
  ],
  subtotal: 12000,
  gst: 0,
  deliveryFee: 0,
  cartTotal: 12000,
  appliedOfferCode: null,
  appliedDiscount: 0,
};

function recalculateCart() {
  const activeItems = currentCart.items.filter((i) => !i.savedForLater);
  const subtotal = activeItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const deliveryFee = subtotal >= 1000 || subtotal === 0 ? 0 : 99;
  const rawTotal = subtotal + deliveryFee;
  const discount = currentCart.appliedDiscount || 0;
  const finalTotal = Math.max(0, rawTotal - discount);

  currentCart.subtotal = subtotal;
  currentCart.deliveryFee = deliveryFee;
  currentCart.gst = 0; // GST is already inclusive in Indian consumer MRP prices
  currentCart.cartTotal = finalTotal;
}

// -------------------------------------------------------------
// Mock Bank Offer Pages (Plain HTML)
// -------------------------------------------------------------
app.get('/bank-offers/:bank', (req: Request, res: Response) => {
  const bankSlug = req.params.bank.toLowerCase();
  const page = MOCK_BANK_PAGES[bankSlug];
  if (!page) {
    res.status(404).send(`<h1>404 - Bank offers for "${req.params.bank}" not found</h1><p>Available: hdfc, icici, sbi, axis, amex, kotak</p>`);
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(page.html);
});

// -------------------------------------------------------------
// E-Commerce REST API
// -------------------------------------------------------------
app.get('/api/products', (req: Request, res: Response) => {
  const { q, category, sort } = req.query;
  let results = [...SEED_PRODUCTS];

  if (category && category !== 'All') {
    results = results.filter((p) => p.category.toLowerCase() === String(category).toLowerCase());
  }

  if (q) {
    const query = String(q).toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );
  }

  if (sort === 'price_asc') {
    results.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    results.sort((a, b) => b.price - a.price);
  } else if (sort === 'rating') {
    results.sort((a, b) => b.rating - a.rating);
  }

  res.json({ products: results, total: results.length });
});

app.get('/api/cards', (_req: Request, res: Response) => {
  res.json({ cards: SEED_CARDS });
});

app.get('/api/cart', (_req: Request, res: Response) => {
  recalculateCart();
  res.json({ cart: currentCart });
});

app.post('/api/cart/add', (req: Request, res: Response) => {
  const { productId, quantity = 1 } = req.body;
  const product = SEED_PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const existing = currentCart.items.find((i) => i.product.id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    currentCart.items.push({ product, quantity });
  }

  // Clear previous applied offer upon cart item mutation
  currentCart.appliedOfferCode = null;
  currentCart.appliedDiscount = 0;
  recalculateCart();
  res.json({ cart: currentCart, message: 'Added to cart' });
});

app.post('/api/cart/update', (req: Request, res: Response) => {
  const { productId, quantity, savedForLater } = req.body;
  const index = currentCart.items.findIndex((i) => i.product.id === productId);

  if (index === -1) {
    res.status(404).json({ error: 'Item not in cart' });
    return;
  }

  if (quantity === 0) {
    currentCart.items.splice(index, 1);
  } else {
    if (quantity !== undefined) currentCart.items[index].quantity = quantity;
    if (savedForLater !== undefined) currentCart.items[index].savedForLater = savedForLater;
  }

  currentCart.appliedOfferCode = null;
  currentCart.appliedDiscount = 0;
  recalculateCart();
  res.json({ cart: currentCart });
});

app.post('/api/cart/reset', (req: Request, res: Response) => {
  const { items } = req.body; // array of { productId, quantity }
  if (Array.isArray(items)) {
    const newItems: CartItem[] = [];
    for (const it of items) {
      const prod = SEED_PRODUCTS.find((p) => p.id === it.productId);
      if (prod) {
        newItems.push({ product: prod, quantity: it.quantity || 1 });
      }
    }
    currentCart.items = newItems;
  } else {
    currentCart.items = [
      {
        product: SEED_PRODUCTS.find((p) => p.id === 'prod_elec_02') || SEED_PRODUCTS[1],
        quantity: 1,
      },
    ];
  }

  currentCart.appliedOfferCode = null;
  currentCart.appliedDiscount = 0;
  recalculateCart();
  res.json({ cart: currentCart });
});

// -------------------------------------------------------------
// LangGraph Offer Checker Endpoints
// -------------------------------------------------------------
app.post('/api/agent/run', async (req: Request, res: Response) => {
  try {
    recalculateCart();
    const payload: AgentRunInput = {
      sessionId: req.body.sessionId || 'session_default',
      cart: currentCart,
      cards: SEED_CARDS,
      userQuery: req.body.userQuery,
      userConstraints: req.body.userConstraints,
      action: req.body.action || 'start',
      approvedCardId: req.body.approvedCardId,
      approvedOfferCode: req.body.approvedOfferCode,
      simulateTampering: req.body.simulateTampering,
      silent: !!req.body.silent,
    };

    const state = await runAgentGraph(payload);

    // If an offer was approved & applied successfully, update our server cart
    if (state.appliedResult?.success && state.approvalProposal) {
      currentCart.appliedOfferCode = state.approvalProposal.offerCode;
      currentCart.appliedDiscount = state.appliedResult.appliedDiscount;
      recalculateCart();
    }

    res.json({ state });
  } catch (err: any) {
    console.error('Agent graph execution error:', err);
    res.status(500).json({ error: err.message || 'Agent error' });
  }
});

app.post('/api/agent/approve', async (req: Request, res: Response) => {
  try {
    const { sessionId, cardId, offerCode, simulateTampering } = req.body;
    recalculateCart();

    const payload: AgentRunInput = {
      sessionId: sessionId || 'session_default',
      cart: currentCart,
      cards: SEED_CARDS,
      action: 'approve',
      approvedCardId: cardId,
      approvedOfferCode: offerCode,
      simulateTampering: !!simulateTampering,
    };

    const state = await runAgentGraph(payload);

    if (state.appliedResult?.success && state.approvalProposal) {
      currentCart.appliedOfferCode = state.approvalProposal.offerCode;
      currentCart.appliedDiscount = state.appliedResult.appliedDiscount;
      recalculateCart();
    }

    res.json({ state, cart: currentCart });
  } catch (err: any) {
    console.error('Approval execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agent/reject', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const payload: AgentRunInput = {
      sessionId: sessionId || 'session_default',
      cart: currentCart,
      cards: SEED_CARDS,
      action: 'reject',
    };

    const state = await runAgentGraph(payload);
    res.json({ state });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit-logs', (_req: Request, res: Response) => {
  res.json({ logs: getAuditLogs() });
});

// -------------------------------------------------------------
// Test Scenario Runner Endpoint (Part 6)
// -------------------------------------------------------------
app.post('/api/tests/run', async (req: Request, res: Response) => {
  const { scenarioId } = req.body;
  const scenariosToRun = scenarioId
    ? SEED_TEST_SCENARIOS.filter((s) => s.id === scenarioId)
    : SEED_TEST_SCENARIOS;

  const results: any[] = [];

  for (const scenario of scenariosToRun) {
    // 1. Setup mock cart for scenario
    const testItems: CartItem[] = [];
    for (const item of scenario.cartItems) {
      const prod = SEED_PRODUCTS.find((p) => p.id === item.productId);
      if (prod) testItems.push({ product: prod, quantity: item.quantity });
    }

    const subtotal = testItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
    const testCart = {
      items: testItems,
      subtotal,
      gst: 0,
      deliveryFee: 0,
      cartTotal: subtotal,
      appliedOfferCode: null,
      appliedDiscount: 0,
    };

    // 2. Run graph (Intake -> Retriever -> Extractor -> Eligibility -> Decider -> Summary)
    const testSessionId = `test_run_${scenario.id}_${Date.now()}`;
    const initialRun = await runAgentGraph({
      sessionId: testSessionId,
      cart: testCart,
      cards: SEED_CARDS,
      userQuery: 'Which card gives the best deal on this cart?',
    });

    const bestChoice = initialRun.bestChoice;
    const actualWinnerCard = bestChoice?.cardId || 'none';
    const actualOfferCode = bestChoice?.bestOffer?.offer.code || 'none';
    const actualSavings = bestChoice?.discountAmount || 0;
    const actualFinalTotal = bestChoice?.finalPayable || subtotal;

    // 3. Simulate human approval & apply + reverify
    const completedRun = await runAgentGraph({
      sessionId: testSessionId,
      cart: testCart,
      cards: SEED_CARDS,
      action: 'approve',
      approvedCardId: bestChoice?.cardId,
      approvedOfferCode: bestChoice?.bestOffer?.offer.code,
      simulateTampering: scenario.simulateCartTampering,
    });

    let pass = false;
    let reason = '';

    if (scenario.simulateCartTampering) {
      // Scenario 4 expects re-verification to catch the tampering
      pass = completedRun.verificationResult?.mismatchDetected === true;
      reason = pass
        ? 'PASSED: Re-verify node successfully caught the simulated total mismatch and halted completion!'
        : 'FAILED: Re-verify failed to detect mismatch.';
    } else {
      const cardMatch = actualWinnerCard === scenario.expectedWinnerCard;
      const offerMatch = actualOfferCode === scenario.expectedOfferCode;
      const savingsMatch = Math.abs(actualSavings - scenario.expectedSavings) < 1;
      const totalMatch = Math.abs(actualFinalTotal - scenario.expectedFinalTotal) < 1;
      pass = cardMatch && offerMatch && savingsMatch && totalMatch;

      reason = pass
        ? `PASSED: Winner ${actualWinnerCard} with code ${actualOfferCode} matches expected. Saved ₹${actualSavings.toLocaleString('en-IN')}.`
        : `FAILED: Expected ${scenario.expectedWinnerCard} (${scenario.expectedOfferCode}) with savings ₹${scenario.expectedSavings}, got ${actualWinnerCard} (${actualOfferCode}) with ₹${actualSavings}.`;
    }

    results.push({
      scenario,
      pass,
      reason,
      input: {
        cartTotal: subtotal,
        itemsCount: testItems.length,
      },
      expected: {
        winnerCard: scenario.expectedWinnerCard,
        offerCode: scenario.expectedOfferCode,
        savings: scenario.expectedSavings,
        finalTotal: scenario.expectedFinalTotal,
      },
      actual: {
        winnerCard: actualWinnerCard,
        offerCode: actualOfferCode,
        savings: actualSavings,
        finalTotal: actualFinalTotal,
        verificationStatus: completedRun.verificationResult,
      },
      evidence: bestChoice?.bestOffer?.offer.rawExcerpt || 'No offer',
      retrievalUrl: bestChoice?.bestOffer?.offer.sourceUrl || '',
      stepTrace: completedRun.steps,
    });
  }

  res.json({ results });
});

// -------------------------------------------------------------
// Health Check Endpoint
// -------------------------------------------------------------
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'DealKart Card Offer Checker',
    uptimeSeconds: Math.round(process.uptime()),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasGroqKey: Boolean(process.env.GROQ_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// Static / Vite Middlewares Mount
// -------------------------------------------------------------
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DealKart running on port ${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
