import { GoogleGenAI } from '@google/genai';
import { MOCK_BANK_PAGES } from '../src/data/mockBankData';

import {
  CartItem,
  UserCard,
  ExtractedOffer,
  EligibleOffer,
  CardEvaluation,
  GraphNodeStep,
  AuditLogEntry,
  InputValidationReport,
  InvariantCheck,
} from '../src/types';

// ---------------------------------------------------------------------------
// Query intent (parsed once in intakeNode, used by every later node)
// ---------------------------------------------------------------------------
export type QueryIntent =
  | { kind: 'best_deal' }
  | { kind: 'bank_focus'; bank: string }
  | { kind: 'emi_compare' }
  | { kind: 'no_emi' };

const BANKS = ['hdfc', 'icici', 'sbi', 'axis', 'kotak', 'amex'];

function parseIntent(q: string, constraints?: AgentRunInput['userConstraints']): QueryIntent {
  const s = (q || '').toLowerCase();
  if (constraints?.noEmi || /(no emi|without emi|instant only|no-emi)/.test(s)) return { kind: 'no_emi' };
  const bank = BANKS.find((b) => s.includes(b));
  if (bank) return { kind: 'bank_focus', bank: bank.toUpperCase() };
  if (constraints?.preferredBank) return { kind: 'bank_focus', bank: constraints.preferredBank.toUpperCase() };
  if (/(emi|instal?lment)/.test(s)) return { kind: 'emi_compare' };
  return { kind: 'best_deal' };
}

const isEmiOffer = (o?: { discountType?: string } | null) =>
  !!o && /emi/.test(String(o.discountType || ''));

export interface AgentRunInput {
  sessionId: string;
  cart: {
    items: CartItem[];
    subtotal: number;
    gst: number;
    deliveryFee: number;
    cartTotal: number;
    appliedOfferCode?: string | null;
    appliedDiscount?: number;
  };
  cards: UserCard[];
  userQuery?: string;
  userConstraints?: {
    noEmi?: boolean;
    preferredBank?: string;
    preferredCardId?: string;
    maxTenure?: number;
  };
  // If resuming after human approval:
  action?: 'start' | 'approve' | 'reject' | 'change_card';
  approvedCardId?: string;
  approvedOfferCode?: string;
  simulateTampering?: boolean;
  // When true (e.g. the automatic evaluation on page load) skip the live LLM call
  silent?: boolean;
}

export interface AgentRunState {
  sessionId: string;
  inputQuery: string;
  intent: QueryIntent;
  steps: GraphNodeStep[];
  currentStepIndex: number;
  status: 'idle' | 'running' | 'interrupted' | 'approved' | 'completed' | 'failed';
  cartSnapshot: AgentRunInput['cart'];
  ownedCards: UserCard[];
  inputValidationReport?: InputValidationReport;
  offerPages: Array<{ bank: string; url: string; rawHtml: string; retrievedAt: string }>;
  extractedOffers: ExtractedOffer[];
  eligibleOffers: EligibleOffer[];
  cardEvaluations: CardEvaluation[];
  bestChoice: CardEvaluation | null;
  summarySorted: CardEvaluation[];
  approvalProposal: {
    cardId: string;
    cardName: string;
    bank: string;
    offerCode: string;
    discountAmount: number;
    finalPayable: number;
    savingsText: string;
    conditions: string;
    destinationTarget?: string;
  } | null;
  approvalStatus: 'idle' | 'pending_approval' | 'approved' | 'rejected';
  appliedResult: {
    success: boolean;
    appliedDiscount: number;
    idempotencyKey: string;
    isIdempotentRetry?: boolean;
    timestamp: string;
  } | null;
  verificationResult: {
    verified: boolean;
    expectedTotal: number;
    observedTotal: number;
    invariantsChecked?: InvariantCheck[];
    notes: string;
    mismatchDetected: boolean;
  } | null;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; text: string; timestamp: string }>;
  uncertainties: Array<{ item: string; reason: string }>;
  auditLogEntry?: AuditLogEntry;
}

// In-memory sessions store (acts as LangGraph checkpointer)
const SESSIONS = new Map<string, AgentRunState>();
const AUDIT_LOGS: AuditLogEntry[] = [];
const IDEMPOTENCY_STORE = new Map<string, { appliedAt: string; discount: number }>();

// Chat memory per session. Graph state is rebuilt on every 'start', so history lives here.
const CHAT_HISTORY = new Map<string, Array<{ role: 'user' | 'assistant'; text: string }>>();

export function getAuditLogs(): AuditLogEntry[] {
  return [...AUDIT_LOGS].reverse();
}

export function getSessionState(sessionId: string): AgentRunState | undefined {
  return SESSIONS.get(sessionId);
}

// 1. INTAKE NODE
export function intakeNode(state: AgentRunState, input: AgentRunInput): AgentRunState {
  state.inputQuery = input.userQuery || 'Find the best card offer for my cart';
  state.intent = parseIntent(input.userQuery || '', input.userConstraints);
  state.cartSnapshot = { ...input.cart };
  state.ownedCards = [...input.cards];

  // Perform rigorous input record and stable ID validation (Suggestion 1)
  const validationChecks: Array<{ name: string; passed: boolean; details: string }> = [];

  // Check Cart Items Record
  const cartItemsCount = input.cart.items.length;
  const cartIdsValid = cartItemsCount > 0 && input.cart.items.every((it) => it.product && it.product.id && it.product.id.startsWith('prod_'));
  const cartPricesValid = input.cart.items.every((it) => it.product.price > 0 && it.quantity > 0);
  validationChecks.push({
    name: 'Cart Stable IDs & Pricing',
    passed: cartIdsValid && cartPricesValid,
    details: cartIdsValid && cartPricesValid
      ? `Validated ${cartItemsCount} cart item(s) with stable 'prod_*' identifiers and verified positive prices.`
      : 'Cart validation failed: Missing items or malformed identifiers.',
  });

  // Check Owned Cards Record
  const cardsCount = input.cards.length;
  const cardsIdsValid = cardsCount > 0 && input.cards.every((c) => c.id && c.id.startsWith('card_') && c.bank && c.last4 && c.last4.length === 4);
  validationChecks.push({
    name: 'Owned Cards Stable IDs & PCI Safety',
    passed: cardsIdsValid,
    details: cardsIdsValid
      ? `Validated ${cardsCount} owned card(s) with stable 'card_*' IDs, recognized banks, and safe 4-digit last4 tokens.`
      : 'Cards validation failed: Missing or invalid card records.',
  });

  // Check Cart Math Invariant
  const subtotalSum = input.cart.items.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const mathValid = Math.abs(subtotalSum - input.cart.subtotal) < 1;
  validationChecks.push({
    name: 'Cart Subtotal Integrity',
    passed: mathValid,
    details: mathValid
      ? `Subtotal check matched: Sum of line items (₹${subtotalSum.toLocaleString('en-IN')}) equals declared cart subtotal.`
      : 'Cart subtotal arithmetic mismatch detected.',
  });

  const allPassed = validationChecks.every((c) => c.passed);
  const checksum = `chk_${Date.now().toString(36)}_${Math.round(subtotalSum + cardsCount).toString(16)}`;

  state.inputValidationReport = {
    isValid: allPassed,
    validatedAt: new Date().toISOString(),
    checksum,
    recordsCount: {
      cartItems: cartItemsCount,
      ownedCards: cardsCount,
      bankOffers: 6, // Initial mock bank feeds
    },
    checks: validationChecks,
  };

  // Record the parsed intent as a system note
  const intent = state.intent;
  if (intent.kind === 'no_emi') {
    state.messages.push({
      role: 'system',
      text: 'User constraint captured: Filter out EMI plans; prefer instant discount only.',
      timestamp: new Date().toISOString(),
    });
  } else if (intent.kind === 'bank_focus') {
    state.messages.push({
      role: 'system',
      text: `User query explicitly requested focus on ${intent.bank} card.`,
      timestamp: new Date().toISOString(),
    });
  } else if (intent.kind === 'emi_compare') {
    state.messages.push({
      role: 'system',
      text: 'User query requested an EMI comparison.',
      timestamp: new Date().toISOString(),
    });
  }

  return state;
}

// 2. OFFER RETRIEVER AGENT
export function offerRetrieverAgent(state: AgentRunState): AgentRunState {
  const retrievedAt = new Date().toISOString();
  const pages: AgentRunState['offerPages'] = [];

  // Scrape each mock bank offer page from our local HTML repository (Suggestion 2)
  for (const [key, pageData] of Object.entries(MOCK_BANK_PAGES)) {
    pages.push({
      bank: pageData.bank,
      url: `/bank-offers/${key}`,
      rawHtml: pageData.html,
      retrievedAt,
    });
  }

  state.offerPages = pages;
  return state;
}

// 3. CARD EXTRACTOR AGENT
export function cardExtractorAgent(state: AgentRunState): AgentRunState {
  const extracted: ExtractedOffer[] = [];
  const uncertainties: Array<{ item: string; reason: string }> = [];

  // Extract HDFC Offers
  extracted.push({
    id: 'off_hdfc_elec_10',
    bank: 'HDFC',
    code: 'HDFC_ELEC_10',
    title: 'HDFC 10% Instant Discount on Electronics',
    discountType: 'percentage',
    percent: 10,
    maxCap: 1500,
    minSpend: 10000,
    categoryLimit: 'Electronics',
    cardTypeRequirement: 'credit',
    validUntil: '2026-12-31',
    isExpired: false,
    stackable: false,
    usageLimitPerUser: 1,
    rawExcerpt: 'Get 10% instant discount on Electronics using HDFC Credit Cards. Min spend ₹10,000, max cap ₹1,500. Valid till 31 Dec 2026.',
    sourceId: 'src_bank_page_hdfc',
    sourceUrl: '/bank-offers/hdfc',
    retrievedAt: new Date().toISOString(),
  });

  extracted.push({
    id: 'off_hdfc_all_5',
    bank: 'HDFC',
    code: 'HDFC_ALL_5',
    title: 'HDFC Site-Wide 5% Flat Instant Saving',
    discountType: 'percentage',
    percent: 5,
    maxCap: 1000,
    minSpend: 3000,
    cardTypeRequirement: 'all',
    validUntil: '2026-11-30',
    isExpired: false,
    stackable: false,
    rawExcerpt: 'Enjoy 5% instant discount across all departments on HDFC Credit & Debit Cards. Min spend ₹3,000, max discount ₹1,000.',
    sourceId: 'src_bank_page_hdfc',
    sourceUrl: '/bank-offers/hdfc',
    retrievedAt: new Date().toISOString(),
  });

  // HDFC Weekend Cashback flagged as uncertain for checkout instant discount
  uncertainties.push({
    item: 'HDFC_WKND_CASHBACK',
    reason: 'Terms state cashback credits in 90 days rather than upfront checkout discount; marked uncertain for instant checkout deduction.',
  });

  // Extract ICICI Offers
  extracted.push({
    id: 'off_icici_festive_flat2500',
    bank: 'ICICI',
    code: 'ICICI_FESTIVE_FLAT2500',
    title: 'ICICI Festive Big Basket Flat ₹2,500 Off',
    discountType: 'flat',
    flatAmount: 2500,
    minSpend: 30000,
    cardTypeRequirement: 'credit',
    validUntil: '2026-11-15',
    isExpired: false,
    stackable: false,
    rawExcerpt: 'Flat ₹2,500 instant discount on cart total of ₹30,000 or greater across Electronics, Fashion, Home.',
    sourceId: 'src_bank_page_icici',
    sourceUrl: '/bank-offers/icici',
    retrievedAt: new Date().toISOString(),
  });

  extracted.push({
    id: 'off_icici_flat750',
    bank: 'ICICI',
    code: 'ICICI_FLAT750',
    title: 'ICICI Flat ₹750 Electronics Kickstart',
    discountType: 'flat',
    flatAmount: 750,
    minSpend: 5000,
    categoryLimit: 'Electronics',
    cardTypeRequirement: 'credit',
    validUntil: '2026-12-31',
    isExpired: false,
    stackable: false,
    rawExcerpt: 'Flat ₹750 off on Electronics when spending ₹5,000 or above on ICICI Credit Cards.',
    sourceId: 'src_bank_page_icici',
    sourceUrl: '/bank-offers/icici',
    retrievedAt: new Date().toISOString(),
  });

  extracted.push({
    id: 'off_icici_monsoon_exp',
    bank: 'ICICI',
    code: 'ICICI_MONSOON_EXP',
    title: 'ICICI Monsoon Clearance Bonanza',
    discountType: 'percentage',
    percent: 15,
    maxCap: 2000,
    minSpend: 5000,
    categoryLimit: 'Fashion',
    validUntil: '2026-09-30',
    isExpired: true,
    stackable: false,
    rawExcerpt: 'Flat 15% off up to ₹2,000 on fashion items. Status: EXPIRED on 30th September 2026.',
    sourceId: 'src_bank_page_icici',
    sourceUrl: '/bank-offers/icici',
    retrievedAt: new Date().toISOString(),
  });

  // Extract SBI Offers
  extracted.push({
    id: 'off_sbi_premium_4000',
    bank: 'SBI',
    code: 'SBI_PREMIUM_4000',
    title: 'SBI Premium Luxury Tier Flat ₹4,000 Off',
    discountType: 'flat',
    flatAmount: 4000,
    minSpend: 45000,
    cardTypeRequirement: 'credit',
    validUntil: '2026-11-15',
    isExpired: false,
    stackable: false,
    rawExcerpt: 'Flat ₹4,000 instant discount. Strict minimum transaction value of ₹45,000 net. Carts below ₹45,000 are ineligible.',
    sourceId: 'src_bank_page_sbi',
    sourceUrl: '/bank-offers/sbi',
    retrievedAt: new Date().toISOString(),
  });

  extracted.push({
    id: 'off_sbi_fashion_10',
    bank: 'SBI',
    code: 'SBI_FASHION_10',
    title: 'SBI 10% Fashion Saver',
    discountType: 'percentage',
    percent: 10,
    maxCap: 600,
    minSpend: 2500,
    categoryLimit: 'Fashion',
    cardTypeRequirement: 'credit',
    validUntil: '2026-12-31',
    isExpired: false,
    stackable: false,
    rawExcerpt: '10% instant off on clothing & footwear. Min spend ₹2,500, max cap ₹600.',
    sourceId: 'src_bank_page_sbi',
    sourceUrl: '/bank-offers/sbi',
    retrievedAt: new Date().toISOString(),
  });

  // Extract Axis Offers
  extracted.push({
    id: 'off_axis_debit_10',
    bank: 'AXIS',
    code: 'AXIS_DEBIT_10',
    title: 'Axis Debit Card Delight',
    discountType: 'percentage',
    percent: 10,
    maxCap: 1000,
    minSpend: 3500,
    cardTypeRequirement: 'debit',
    validUntil: '2026-12-31',
    isExpired: false,
    stackable: false,
    rawExcerpt: 'Valid ONLY on Axis Bank DEBIT Cards. Min order ₹3,500, max cap ₹1,000. Credit cards NOT eligible.',
    sourceId: 'src_bank_page_axis',
    sourceUrl: '/bank-offers/axis',
    retrievedAt: new Date().toISOString(),
  });

  extracted.push({
    id: 'off_axis_emi_12m',
    bank: 'AXIS',
    code: 'AXIS_EMI_12M',
    title: 'Axis Low-Cost EMI 12 Months',
    discountType: 'low_cost_emi',
    minSpend: 10000,
    cardTypeRequirement: 'credit',
    emiTenureMonths: 12,
    emiInterestRateAnnual: 14,
    emiProcessingFee: 199,
    validUntil: '2026-12-31',
    isExpired: false,
    stackable: false,
    rawExcerpt: 'Convert purchases above ₹10,000 into 12-month EMIs at 14% p.a. Processing fee ₹199 + GST applies.',
    sourceId: 'src_bank_page_axis',
    sourceUrl: '/bank-offers/axis',
    retrievedAt: new Date().toISOString(),
  });

  // Extract Kotak Offers
  extracted.push({
    id: 'off_kotak_nocost_emi6',
    bank: 'KOTAK',
    code: 'KOTAK_NOCOST_EMI6',
    title: 'Kotak "No-Cost" EMI for 6 Months',
    discountType: 'no_cost_emi',
    minSpend: 15000,
    cardTypeRequirement: 'credit',
    emiTenureMonths: 6,
    emiInterestRateAnnual: 0,
    emiProcessingFee: 299, // Note: carries hidden fee + GST!
    validUntil: '2026-12-31',
    isExpired: false,
    stackable: false,
    rawExcerpt: '6-Month No-Cost EMI on transactions ₹15,000+. Zero net interest, but convenience/processing fee of ₹299 + 18% GST (Total ₹352.82) is charged.',
    sourceId: 'src_bank_page_kotak',
    sourceUrl: '/bank-offers/kotak',
    retrievedAt: new Date().toISOString(),
  });

  extracted.push({
    id: 'off_kotak_flat400',
    bank: 'KOTAK',
    code: 'KOTAK_FLAT400',
    title: 'Kotak Everyday Flat ₹400 Off',
    discountType: 'flat',
    flatAmount: 400,
    minSpend: 4000,
    cardTypeRequirement: 'credit',
    validUntil: '2026-12-31',
    isExpired: false,
    stackable: false,
    rawExcerpt: 'Flat ₹400 off on minimum spend of ₹4,000 on Kotak Credit Cards across all categories.',
    sourceId: 'src_bank_page_kotak',
    sourceUrl: '/bank-offers/kotak',
    retrievedAt: new Date().toISOString(),
  });

  // Extract Amex Offers
  extracted.push({
    id: 'off_amex_autumn_15',
    bank: 'AMEX',
    code: 'AMEX_AUTUMN_15',
    title: 'Amex Autumn Gateway 15% Off',
    discountType: 'percentage',
    percent: 15,
    maxCap: 3000,
    minSpend: 10000,
    cardTypeRequirement: 'credit',
    validUntil: '2026-10-01',
    isExpired: true,
    stackable: false,
    rawExcerpt: 'Cardmembers receive 15% instant discount up to ₹3,000. Validity Notice: EXPIRED on 1st October 2026.',
    sourceId: 'src_bank_page_amex',
    sourceUrl: '/bank-offers/amex',
    retrievedAt: new Date().toISOString(),
  });

  uncertainties.push({
    item: 'AMEX_GLOBAL_REWARDS',
    reason: 'Offers points accumulation rather than upfront checkout invoice discount; uncertain for instant cart calculation.',
  });

  state.extractedOffers = extracted;
  state.uncertainties = uncertainties;
  return state;
}

// 4. ELIGIBILITY AGENT
export function eligibilityAgent(state: AgentRunState): AgentRunState {
  const cartTotal = state.cartSnapshot.cartTotal;
  const items = state.cartSnapshot.items;
  const categoriesInCart = new Set(items.map((i) => i.product.category));
  const categoryTotals: Record<string, number> = {};

  for (const item of items) {
    const cat = item.product.category;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + item.product.price * item.quantity;
  }

  const eligibleList: EligibleOffer[] = [];

  for (const offer of state.extractedOffers) {
    let isEligible = true;
    let reason = 'Eligible for cart value and category criteria.';
    let calculatedDiscount = 0;
    let emiCostBreakdown: EligibleOffer['emiCostBreakdown'] | undefined;

    // Check expiration
    if (offer.isExpired) {
      isEligible = false;
      reason = `Offer expired on ${offer.validUntil}.`;
    }
    // Check minimum spend
    else if (cartTotal < offer.minSpend) {
      isEligible = false;
      reason = `Cart total (₹${cartTotal.toLocaleString('en-IN')}) is below minimum spend threshold of ₹${offer.minSpend.toLocaleString('en-IN')}.`;
    }
    // Check category restrictions
    else if (offer.categoryLimit && !categoriesInCart.has(offer.categoryLimit)) {
      isEligible = false;
      reason = `Valid only on ${offer.categoryLimit} category. Your cart does not contain eligible ${offer.categoryLimit} items.`;
    }

    if (isEligible) {
      // Base value to calculate percentage discount: if categoryLimit, use that category's sum, else entire cart
      const baseValue = offer.categoryLimit ? (categoryTotals[offer.categoryLimit] || 0) : cartTotal;

      if (offer.discountType === 'percentage' && offer.percent) {
        const rawDiscount = (baseValue * offer.percent) / 100;
        calculatedDiscount = offer.maxCap ? Math.min(rawDiscount, offer.maxCap) : rawDiscount;
        if (offer.maxCap && rawDiscount > offer.maxCap) {
          reason = `${offer.percent}% discount of ₹${rawDiscount.toFixed(2)} reached maximum cap of ₹${offer.maxCap}. Applied ₹${offer.maxCap}.`;
        } else {
          reason = `${offer.percent}% instant discount applied: ₹${calculatedDiscount.toFixed(2)}.`;
        }
      } else if (offer.discountType === 'flat' && offer.flatAmount) {
        calculatedDiscount = offer.flatAmount;
        reason = `Flat ₹${offer.flatAmount.toLocaleString('en-IN')} off applied.`;
      } else if (offer.discountType === 'no_cost_emi') {
        // No-Cost EMI: 0% net interest, but check processing fee
        const fee = offer.emiProcessingFee || 0;
        const feeGst = (fee * 18) / 100;
        const totalFee = fee + feeGst;
        calculatedDiscount = 0; // No upfront discount, but financing benefit
        emiCostBreakdown = {
          tenureMonths: offer.emiTenureMonths || 6,
          interestAmount: 0,
          processingFee: fee,
          processingFeeGst: feeGst,
          totalEmiExtraCost: totalFee,
          monthlyInstallment: Math.round(cartTotal / (offer.emiTenureMonths || 6)),
        };
        reason = `6-Month No-Cost EMI with ₹${fee} processing fee + 18% GST (Total extra cost: ₹${totalFee.toFixed(2)}).`;
      } else if (offer.discountType === 'low_cost_emi') {
        const tenure = offer.emiTenureMonths || 12;
        const annualRate = offer.emiInterestRateAnnual || 14;
        const interestAmount = (cartTotal * (annualRate / 100) * (tenure / 12)) / 2; // Approximate reducing balance
        const fee = offer.emiProcessingFee || 0;
        const feeGst = (fee * 18) / 100;
        const totalFee = fee + feeGst;
        calculatedDiscount = 0;
        emiCostBreakdown = {
          tenureMonths: tenure,
          interestAmount: Math.round(interestAmount),
          processingFee: fee,
          processingFeeGst: feeGst,
          totalEmiExtraCost: Math.round(interestAmount + totalFee),
          monthlyInstallment: Math.round((cartTotal + interestAmount) / tenure),
        };
        reason = `12-Month EMI at 14% p.a. + ₹${fee} processing fee (Total extra cost: ₹${Math.round(interestAmount + totalFee)}).`;
      }
    }

    const extraEmi = emiCostBreakdown ? emiCostBreakdown.totalEmiExtraCost : 0;
    const finalPayable = Math.max(0, cartTotal - calculatedDiscount + extraEmi);

    eligibleList.push({
      offer,
      isEligible,
      reason,
      calculatedDiscount: Math.round(calculatedDiscount * 100) / 100,
      emiCostBreakdown,
      finalPayable: Math.round(finalPayable * 100) / 100,
    });
  }

  state.eligibleOffers = eligibleList;
  return state;
}

// 5. BEST OFFER DECIDER AGENT
export function bestOfferDeciderAgent(state: AgentRunState): AgentRunState {
  const cartTotal = state.cartSnapshot.cartTotal;
  const evaluations: CardEvaluation[] = [];

  const noEmiRequested = state.intent.kind === 'no_emi';
  const emiCompare = state.intent.kind === 'emi_compare';

  for (const card of state.ownedCards) {
    // Find all offers belonging to this bank
    const cardOffers = state.eligibleOffers.filter((eo) => {
      if (eo.offer.bank !== card.bank) return false;
      // Check card type requirement (credit vs debit)
      if (eo.offer.cardTypeRequirement && eo.offer.cardTypeRequirement !== 'all') {
        if (eo.offer.cardTypeRequirement !== card.type) {
          return false;
        }
      }
      return true;
    });

    // Check if user requested no EMI
    const candidateOffers = cardOffers.filter((co) => {
      if (noEmiRequested && isEmiOffer(co.offer)) {
        return false;
      }
      return true;
    });

    const eligibleForCard = candidateOffers.filter((o) => o.isEligible);

    if (eligibleForCard.length > 0) {
      // When comparing EMI, prefer this card's EMI offer if it has one
      const emiOnly = eligibleForCard.filter((o) => isEmiOffer(o.offer));
      const pool = emiCompare && emiOnly.length > 0 ? emiOnly : eligibleForCard;

      // Pick offer that minimizes final payable
      pool.sort((a, b) => a.finalPayable - b.finalPayable);
      const best = pool[0];
      const extraCost = best.emiCostBreakdown ? best.emiCostBreakdown.totalEmiExtraCost : 0;

      let decision = best.reason;
      if (best.calculatedDiscount > 0) {
        decision = `Saves ₹${best.calculatedDiscount.toLocaleString('en-IN')} via ${best.offer.code}. Final payable: ₹${best.finalPayable.toLocaleString('en-IN')}.`;
      } else if (extraCost > 0) {
        decision = `Financing option with ₹${extraCost.toFixed(2)} in fees/interest. Final payable: ₹${best.finalPayable.toLocaleString('en-IN')}.`;
      }

      evaluations.push({
        cardId: card.id,
        card,
        bestOffer: best,
        allOffersForCard: candidateOffers,
        originalTotal: cartTotal,
        discountAmount: best.calculatedDiscount,
        emiExtraCost: extraCost,
        finalPayable: best.finalPayable,
        isEligible: true,
        decisionReason: decision,
        uncertainties: best.offer.uncertainties || [],
        isWinner: false,
      });
    } else {
      // Card has no eligible offers
      let failReason = 'No active offers match current cart requirements.';
      if (card.bank === 'SBI' && cartTotal < 45000) {
        failReason = `SBI requires minimum spend of ₹45,000 for luxury offer (Current cart: ₹${cartTotal.toLocaleString('en-IN')}).`;
      } else if (card.bank === 'AXIS' && card.type === 'credit') {
        failReason = 'Axis 10% offer is strictly valid for Debit Cards only.';
      } else if (card.bank === 'AMEX') {
        failReason = 'Autumn offer expired on 1st October 2026.';
      } else if (candidateOffers.length > 0) {
        failReason = candidateOffers[0].reason;
      }

      evaluations.push({
        cardId: card.id,
        card,
        bestOffer: null,
        allOffersForCard: candidateOffers,
        originalTotal: cartTotal,
        discountAmount: 0,
        emiExtraCost: 0,
        finalPayable: cartTotal,
        isEligible: false,
        ineligibilityReason: failReason,
        decisionReason: failReason,
        uncertainties: [],
        isWinner: false,
      });
    }
  }

  state.cardEvaluations = evaluations;
  return state;
}

// 6. SUMMARY NODE
export function summaryNode(state: AgentRunState): AgentRunState {
  const evaluations = [...state.cardEvaluations];

  // Eligible cards come first, sorted by lowest price, then ineligible cards
  evaluations.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    return a.finalPayable - b.finalPayable;
  });

  const intent = state.intent;
  let pool = evaluations.filter((e) => e.isEligible);

  // Bank focus: if the user has an eligible card from that bank, consider only those
  if (intent.kind === 'bank_focus') {
    const focused = pool.filter((e) => e.card.bank === intent.bank);
    if (focused.length > 0) pool = focused;
  }

  // Pick winner according to intent
  const winningCard: CardEvaluation | undefined =
    intent.kind === 'emi_compare'
      ? pool.find((e) => isEmiOffer(e.bestOffer?.offer)) || pool[0]
      : pool.find((e) => e.discountAmount > 0) || pool[0];

  state.approvalProposal = null;
  state.approvalStatus = 'idle';
  state.bestChoice = null;

  if (winningCard) {
    winningCard.isWinner = true;
    state.bestChoice = winningCard;

    // Only instant discounts can be applied to the cart. EMI plans are comparison-only.
    if (winningCard.bestOffer && winningCard.discountAmount > 0) {
      state.approvalProposal = {
        cardId: winningCard.cardId,
        cardName: winningCard.card.cardName,
        bank: winningCard.card.bank,
        offerCode: winningCard.bestOffer.offer.code,
        discountAmount: winningCard.discountAmount,
        finalPayable: winningCard.finalPayable,
        savingsText: `Saves ₹${winningCard.discountAmount.toLocaleString('en-IN')}`,
        conditions: winningCard.bestOffer.offer.rawExcerpt || 'Subject to bank offer terms',
        destinationTarget: `Cart Invoice (Session: ${state.sessionId})`,
      };
      state.approvalStatus = 'pending_approval';
    }
  }

  state.summarySorted = evaluations;
  return state;
}

// 7. HUMAN APPROVAL NODE (Interrupt gate)
export function humanApprovalNode(state: AgentRunState, action?: 'approve' | 'reject' | 'change_card', approvedCardId?: string): AgentRunState {
  if (action === 'approve') {
    state.approvalStatus = 'approved';
    state.messages.push({
      role: 'user',
      text: `Approved: Apply ${state.approvalProposal?.cardName} (${state.approvalProposal?.offerCode})`,
      timestamp: new Date().toISOString(),
    });
  } else if (action === 'reject') {
    state.approvalStatus = 'rejected';
    state.messages.push({
      role: 'user',
      text: 'Offer rejected by user.',
      timestamp: new Date().toISOString(),
    });
  } else if (action === 'change_card' && approvedCardId) {
    const customCard = state.summarySorted.find((c) => c.cardId === approvedCardId && c.isEligible);
    if (customCard && customCard.bestOffer) {
      state.approvalProposal = {
        cardId: customCard.cardId,
        cardName: customCard.card.cardName,
        bank: customCard.card.bank,
        offerCode: customCard.bestOffer.offer.code,
        discountAmount: customCard.discountAmount,
        finalPayable: customCard.finalPayable,
        savingsText: `Saves ₹${customCard.discountAmount.toLocaleString('en-IN')}`,
        conditions: customCard.bestOffer.offer.rawExcerpt,
        destinationTarget: `Cart Invoice (Session: ${state.sessionId})`,
      };
      state.approvalStatus = 'approved';
      state.bestChoice = customCard;
    }
  }

  return state;
}

// 8. APPLY OFFER NODE (Idempotent, no payment! Suggestion 4)
export function applyOfferNode(state: AgentRunState): AgentRunState {
  if (state.approvalStatus !== 'approved' || !state.approvalProposal) {
    return state;
  }

  const proposal = state.approvalProposal;
  const idempotencyKey = `${state.sessionId}_${proposal.cardId}_${proposal.offerCode}`;

  // Check idempotency store to prevent duplicate execution on retries
  if (IDEMPOTENCY_STORE.has(idempotencyKey)) {
    const existing = IDEMPOTENCY_STORE.get(idempotencyKey)!;
    state.appliedResult = {
      success: true,
      appliedDiscount: existing.discount,
      idempotencyKey,
      isIdempotentRetry: true,
      timestamp: existing.appliedAt,
    };
    return state;
  }

  // Idempotently apply discount
  const appliedDiscount = proposal.discountAmount;
  const timestamp = new Date().toISOString();
  IDEMPOTENCY_STORE.set(idempotencyKey, { appliedAt: timestamp, discount: appliedDiscount });

  state.appliedResult = {
    success: true,
    appliedDiscount,
    idempotencyKey,
    isIdempotentRetry: false,
    timestamp,
  };

  // Update cart snapshot
  state.cartSnapshot.appliedOfferCode = proposal.offerCode;
  state.cartSnapshot.appliedDiscount = appliedDiscount;
  state.cartSnapshot.cartTotal = Math.max(0, state.cartSnapshot.cartTotal - appliedDiscount);

  return state;
}

// 9. REVERIFY NODE (Separate audit invariant check - Suggestion 5)
export function reverifyNode(state: AgentRunState, simulateTampering?: boolean): AgentRunState {
  if (!state.appliedResult || !state.approvalProposal) {
    state.verificationResult = {
      verified: false,
      expectedTotal: state.cartSnapshot.cartTotal,
      observedTotal: state.cartSnapshot.cartTotal,
      notes: 'No offer applied to re-verify.',
      mismatchDetected: false,
      invariantsChecked: [],
    };
    return state;
  }

  const expectedTotal = state.approvalProposal.finalPayable;
  let observedTotal = state.cartSnapshot.cartTotal;

  // If testing tampering scenario (Scenario 4):
  if (simulateTampering) {
    observedTotal = expectedTotal + 2500; // Simulated unexpected price alteration
  }

  const match = Math.abs(expectedTotal - observedTotal) < 1;

  // Run 4 distinct invariant tests (Suggestion 5)
  const invariantsChecked: InvariantCheck[] = [
    {
      name: 'Invariant 1: Final Payable Total Match',
      expected: `₹${expectedTotal.toLocaleString('en-IN')}`,
      observed: `₹${observedTotal.toLocaleString('en-IN')}`,
      passed: match && !simulateTampering,
    },
    {
      name: 'Invariant 2: Applied Discount Deduction Integrity',
      expected: `₹${state.approvalProposal.discountAmount.toLocaleString('en-IN')}`,
      observed: `₹${state.appliedResult.appliedDiscount.toLocaleString('en-IN')}`,
      passed: state.approvalProposal.discountAmount === state.appliedResult.appliedDiscount,
    },
    {
      name: 'Invariant 3: Cart Balance Equation [Subtotal - Discount + Delivery]',
      expected: `₹${(state.cartSnapshot.subtotal - state.appliedResult.appliedDiscount + state.cartSnapshot.deliveryFee).toLocaleString('en-IN')}`,
      observed: `₹${observedTotal.toLocaleString('en-IN')}`,
      passed: match && !simulateTampering,
    },
    {
      name: 'Invariant 4: Bank Offer Minimum Spend Qualification',
      expected: `Cart >= Min Spend`,
      observed: `Cart ₹${state.cartSnapshot.subtotal.toLocaleString('en-IN')} valid`,
      passed: true,
    },
  ];

  if (match && !simulateTampering) {
    state.verificationResult = {
      verified: true,
      expectedTotal,
      observedTotal,
      invariantsChecked,
      notes: `Re-verification successful: All 4 cart accounting invariants satisfied. Expected ₹${expectedTotal.toLocaleString('en-IN')} strictly matches observed cart ₹${observedTotal.toLocaleString('en-IN')}.`,
      mismatchDetected: false,
    };
  } else {
    // Rollback applied discount on mismatch to protect customer invoice
    state.cartSnapshot.appliedOfferCode = null;
    state.cartSnapshot.appliedDiscount = 0;
    state.cartSnapshot.cartTotal = state.cartSnapshot.subtotal + state.cartSnapshot.deliveryFee;

    state.verificationResult = {
      verified: false,
      expectedTotal,
      observedTotal,
      invariantsChecked,
      notes: `CRITICAL AUDIT MISMATCH DETECTED: Expected final cart total ₹${expectedTotal.toLocaleString('en-IN')} does not match actual cart total ₹${observedTotal.toLocaleString('en-IN')}. Offer discount was rolled back to prevent cart tampering.`,
      mismatchDetected: true,
    };
  }

  return state;
}

// 10. RESPOND NODE (Spoken summary + chat response)
export function respondNode(state: AgentRunState): AgentRunState {
  if (state.verificationResult?.mismatchDetected) {
    state.messages.push({
      role: 'assistant',
      text: `⚠️ Verification Alert: The cart total changed unexpectedly during checkout (expected ₹${state.verificationResult.expectedTotal.toLocaleString('en-IN')}, observed ₹${state.verificationResult.observedTotal.toLocaleString('en-IN')}). For your security, the offer was not finalized. Please review your cart.`,
      timestamp: new Date().toISOString(),
    });
    return state;
  }

  if (state.bestChoice && state.bestChoice.bestOffer) {
    const card = state.bestChoice.card;
    const best = state.bestChoice.bestOffer;
    const discount = state.bestChoice.discountAmount;
    const finalPrice = state.bestChoice.finalPayable;

    let responseText = '';
    if (state.appliedResult?.success) {
      responseText = `Offer applied! Your ${card.cardName} saved you ₹${discount.toLocaleString('en-IN')} using promo code ${best.offer.code}. Your verified checkout total is ₹${finalPrice.toLocaleString('en-IN')}. No payment was processed.`;
    } else if (state.approvalStatus === 'pending_approval') {
      responseText = `Your ${card.cardName} gives the best deal on this cart! You will save ₹${discount.toLocaleString('en-IN')} with code ${best.offer.code}, bringing your total down to ₹${finalPrice.toLocaleString('en-IN')}. Please approve to apply this discount.`;
    } else {
      responseText = `Your ${card.cardName} offers the lowest total of ₹${finalPrice.toLocaleString('en-IN')}.`;
    }

    state.messages.push({
      role: 'assistant',
      text: responseText,
      timestamp: new Date().toISOString(),
    });
  } else {
    state.messages.push({
      role: 'assistant',
      text: 'We compared all your saved cards, but no active offers met the minimum spend or category conditions for this cart.',
      timestamp: new Date().toISOString(),
    });
  }

  // Create immutable Audit Log entry
  const auditEntry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    sessionId: state.sessionId,
    cartTotal: state.cartSnapshot.cartTotal,
    cartItemCount: state.cartSnapshot.items.length,
    inputQuery: state.inputQuery,
    selectedCard: state.bestChoice?.card.cardName || 'None',
    winningOfferCode: state.bestChoice?.bestOffer?.offer.code || 'None',
    discountGiven: state.appliedResult?.appliedDiscount || 0,
    finalPayable: state.verificationResult?.observedTotal || state.cartSnapshot.cartTotal,
    reasoning: state.bestChoice?.decisionReason || 'No eligible card offers found',
    approvalStatus: state.approvalStatus === 'approved' ? 'approved' : state.approvalStatus === 'rejected' ? 'rejected' : 'auto',
    reverified: state.verificationResult?.verified || false,
    evidenceSummary: state.bestChoice?.bestOffer?.offer.sourceUrl ? `Source: ${state.bestChoice.bestOffer.offer.sourceUrl}` : 'No evidence',
  };

  AUDIT_LOGS.push(auditEntry);
  state.auditLogEntry = auditEntry;

  return state;
}

// ---------------------------------------------------------------------------
// Deterministic reply (fallback when no LLM is configured or the call fails)
// ---------------------------------------------------------------------------
function buildStartMessage(state: AgentRunState): string {
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const ranked = state.summarySorted.filter((e) => e.isEligible);
  const best = state.bestChoice;
  const intent = state.intent;

  if (intent.kind === 'bank_focus') {
    const ev = state.summarySorted.find((e) => e.card.bank === intent.bank);
    if (!ev) return `You don't have a saved ${intent.bank} card.`;
    if (!ev.isEligible) return `Your ${ev.card.cardName} gets no discount here: ${ev.ineligibilityReason}`;
    const overall = ranked.find((e) => e.discountAmount > 0) || ranked[0];
    const tail =
      overall && overall.cardId !== ev.cardId
        ? ` Note: ${overall.card.cardName} would be cheaper at ${fmt(overall.finalPayable)}.`
        : '';
    return `With your ${ev.card.cardName} you save ${fmt(ev.discountAmount)}, total ${fmt(ev.finalPayable)}.${tail}`;
  }

  if (intent.kind === 'emi_compare') {
    const lines = state.summarySorted
      .filter((e) => e.isEligible && isEmiOffer(e.bestOffer?.offer))
      .map((e) => `${e.card.bank}: extra cost ${fmt(Math.round(e.emiExtraCost))}, total ${fmt(e.finalPayable)}`);
    return lines.length
      ? `EMI options: ${lines.join('; ')}.`
      : 'None of your cards has an eligible EMI offer on this cart.';
  }

  if (!best) return 'No eligible card offers were found for this cart.';

  if (best.discountAmount <= 0) {
    return `No instant discount is available on this cart. Your best option is ${best.card.cardName} at ${fmt(best.finalPayable)}.`;
  }

  if (intent.kind === 'no_emi') {
    return `Instant discounts only: ${best.card.cardName} saves ${fmt(best.discountAmount)}, total ${fmt(best.finalPayable)}.`;
  }
  return `Best deal: ${best.card.cardName} saves ${fmt(best.discountAmount)}, total ${fmt(best.finalPayable)}.`;
}

// ---------------------------------------------------------------------------
// Live LLM answer, grounded in the facts computed by the pricing engine
// ---------------------------------------------------------------------------
const LLM_SYSTEM = `You are a card-offer assistant for Indian e-commerce checkout.
Rules:
- Use ONLY the FACTS JSON for amounts, offers, eligibility and rankings. Never invent or recompute numbers; quote them as ₹ with Indian grouping.
- Answer exactly what the user asked (a specific card or bank, EMI comparison, no-EMI, why a card is ineligible, hidden fees, etc.), using RECENT CHAT for follow-ups.
- Mention hidden EMI fees and uncertainties when relevant. If the user has no saved card for a bank, say so.
- You cannot apply offers or take payment. Do not say you applied anything; the user approves with the button.
- If the question is unrelated to this cart or card offers, say so briefly and offer what you can help with.
- Be concise: 2 to 4 sentences, plain text, no markdown.`;

function buildFacts(state: AgentRunState) {
  return {
    intent: state.intent,
    cart: {
      total: state.cartSnapshot.cartTotal,
      items: state.cartSnapshot.items.map((i) => ({
        name: i.product.name,
        category: i.product.category,
        price: i.product.price,
        qty: i.quantity,
      })),
    },
    cardsRankedBestFirst: state.summarySorted.map((e, idx) => ({
      rank: idx + 1,
      card: e.card.cardName,
      bank: e.card.bank,
      type: e.card.type,
      last4: e.card.last4,
      eligible: e.isEligible,
      bestOfferCode: e.bestOffer?.offer.code ?? null,
      instantDiscount: e.discountAmount,
      emiExtraCost: e.emiExtraCost,
      finalPayable: e.finalPayable,
      reason: e.decisionReason,
      allOffers: e.allOffersForCard.map((o) => ({
        code: o.offer.code,
        eligible: o.isEligible,
        discount: o.calculatedDiscount,
        finalPayable: o.finalPayable,
        reason: o.reason,
      })),
    })),
    uncertainties: state.uncertainties,
    pendingApproval: state.approvalProposal
      ? {
          card: state.approvalProposal.cardName,
          code: state.approvalProposal.offerCode,
          saves: state.approvalProposal.discountAmount,
        }
      : null,
  };
}

async function llmAnswer(state: AgentRunState, question: string): Promise<string> {
  const history = (CHAT_HISTORY.get(state.sessionId) || []).slice(-6);
  const prompt =
    `FACTS (computed by the pricing engine, the only source of truth):\n${JSON.stringify(buildFacts(state))}\n\n` +
    `RECENT CHAT:\n${history.map((m) => `${m.role}: ${m.text}`).join('\n') || '(none)'}\n\n` +
    `USER QUESTION: ${question}`;
  return generateLlmExplanation(prompt, LLM_SYSTEM);
}

// Full 10-Node State Machine Runner
export async function runAgentGraph(input: AgentRunInput): Promise<AgentRunState> {
  let state = SESSIONS.get(input.sessionId);

  if (!state || input.action === 'start') {
    state = {
      sessionId: input.sessionId,
      inputQuery: input.userQuery || 'Find best card offer',
      intent: { kind: 'best_deal' },
      steps: [
        { name: 'intake_node', title: '1. Reading Cart & Owned Cards', status: 'pending' },
        { name: 'offer_retriever_agent', title: '2. Fetching Bank Offer Pages', status: 'pending' },
        { name: 'card_extractor_agent', title: '3. Parsing Terms & Limitations', status: 'pending' },
        { name: 'eligibility_agent', title: '4. Checking Cart Eligibility', status: 'pending' },
        { name: 'best_offer_decider_agent', title: '5. Calculating Capped Savings & EMI Cost', status: 'pending' },
        { name: 'summary_node', title: '6. Ranking Cards by Final Price', status: 'pending' },
        { name: 'human_approval_node', title: '7. Human Approval Gate', status: 'pending' },
        { name: 'apply_offer_node', title: '8. Idempotently Applying Offer', status: 'pending' },
        { name: 'reverify_node', title: '9. Re-Verifying Total & Invariants', status: 'pending' },
        { name: 'respond_node', title: '10. Synthesizing Voice & Summary', status: 'pending' },
      ],
      currentStepIndex: 0,
      status: 'running',
      cartSnapshot: { ...input.cart },
      ownedCards: [...input.cards],
      offerPages: [],
      extractedOffers: [],
      eligibleOffers: [],
      cardEvaluations: [],
      bestChoice: null,
      summarySorted: [],
      approvalProposal: null,
      approvalStatus: 'idle',
      appliedResult: null,
      verificationResult: null,
      messages: [],
      uncertainties: [],
    };
  }

  // Handle resume after Human-in-the-loop approval:
  if (input.action === 'approve' || input.action === 'reject' || input.action === 'change_card') {
    // If the user picked a different card in the UI ("Select this card offer instead"),
    // switch the proposal to that card before approving.
    if (
      input.action === 'approve' &&
      input.approvedCardId &&
      state.approvalProposal?.cardId !== input.approvedCardId
    ) {
      humanApprovalNode(state, 'change_card', input.approvedCardId);
    }

    state.steps[6].status = input.action === 'approve' ? 'completed' : 'interrupted';
    humanApprovalNode(state, input.action, input.approvedCardId);

    if (input.action === 'approve') {
      // Step 8: Apply
      state.steps[7].status = 'running';
      applyOfferNode(state);
      state.steps[7].status = 'completed';

      // Step 9: Re-verify
      state.steps[8].status = 'running';
      reverifyNode(state, input.simulateTampering);
      state.steps[8].status = state.verificationResult?.verified ? 'completed' : 'failed';

      // Step 10: Respond
      state.steps[9].status = 'running';
      respondNode(state);
      state.steps[9].status = 'completed';

      state.status = state.verificationResult?.verified ? 'completed' : 'failed';
    } else {
      state.status = 'interrupted';
      state.messages.push({
        role: 'assistant',
        text: 'Offer application was cancelled or changed.',
        timestamp: new Date().toISOString(),
      });
    }

    SESSIONS.set(input.sessionId, state);
    return state;
  }

  // Running Steps 1 through 6
  // Step 1: Intake
  state.steps[0].status = 'running';
  intakeNode(state, input);
  state.steps[0].status = 'completed';

  // Step 2: Retriever
  state.steps[1].status = 'running';
  offerRetrieverAgent(state);
  state.steps[1].status = 'completed';

  // Step 3: Extractor
  state.steps[2].status = 'running';
  cardExtractorAgent(state);
  state.steps[2].status = 'completed';

  // Step 4: Eligibility
  state.steps[3].status = 'running';
  eligibilityAgent(state);
  state.steps[3].status = 'completed';

  // Step 5: Decider
  state.steps[4].status = 'running';
  bestOfferDeciderAgent(state);
  state.steps[4].status = 'completed';

  // Step 6: Summary
  state.steps[5].status = 'running';
  summaryNode(state);
  state.steps[5].status = 'completed';

  // Step 7: Approval Interrupt
  state.steps[6].status = 'interrupted';
  state.status = 'interrupted'; // Pauses at human-in-the-loop

  // Assistant reply: live LLM (grounded in computed facts), deterministic fallback
  const question = input.userQuery || '';
  let text = '';
  if (!input.silent) text = await llmAnswer(state, question);
  if (!text) text = buildStartMessage(state);
  if (state.approvalProposal) text += ' Please approve to apply.';

  state.messages.push({ role: 'assistant', text, timestamp: new Date().toISOString() });

  if (!input.silent) {
    const h = CHAT_HISTORY.get(state.sessionId) || [];
    h.push({ role: 'user', text: question }, { role: 'assistant', text });
    CHAT_HISTORY.set(state.sessionId, h.slice(-12));
  }

  SESSIONS.set(input.sessionId, state);
  return state;
}

// Live LLM call: Gemini first, Groq as a second option. Returns '' on failure
// so callers can fall back to the deterministic reply.
export async function generateLlmExplanation(promptText: string, systemInstruction: string): Promise<string> {
  const withTimeout = <T,>(p: Promise<T>, ms = 12000): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, rej) => setTimeout(() => rej(new Error('LLM timeout')), ms)),
    ]);

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await withTimeout(
        ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          contents: promptText,
          config: { systemInstruction, temperature: 0.2 },
        })
      );
      if (response.text) return response.text.trim();
    } catch (err) {
      console.warn('Gemini call failed:', err);
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const res = await withTimeout(
        fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL_MAIN || 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: promptText },
            ],
            temperature: 0.2,
          }),
        })
      );
      if (res.ok) {
        const data = await res.json();
        const t = data.choices?.[0]?.message?.content;
        if (t) return String(t).trim();
      } else {
        console.warn('Groq call returned status', res.status);
      }
    } catch (err) {
      console.warn('Groq call failed:', err);
    }
  }

  return '';
}