export type ProductCategory = 'Electronics' | 'Fashion' | 'Home' | 'Grocery';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: number;
  mrp: number;
  image: string;
  rating: number;
  ratingCount: number;
  stock: number;
  description: string;
  features: string[];
  inStock: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  savedForLater?: boolean;
}

export interface UserCard {
  id: string;
  bank: 'HDFC' | 'ICICI' | 'SBI' | 'AXIS' | 'KOTAK' | 'AMEX';
  cardName: string;
  type: 'credit' | 'debit';
  network: 'Visa' | 'Mastercard' | 'RuPay' | 'Amex';
  last4: string;
  isDefault?: boolean;
}

export interface SavedAddress {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

export interface ExtractedOffer {
  id: string;
  bank: string;
  code: string;
  title: string;
  discountType: 'percentage' | 'flat' | 'emi_cashback' | 'no_cost_emi' | 'low_cost_emi';
  percent?: number;
  flatAmount?: number;
  maxCap?: number;
  minSpend: number;
  categoryLimit?: ProductCategory;
  brandLimit?: string;
  cardTypeRequirement?: 'credit' | 'debit' | 'all';
  validUntil: string;
  isExpired?: boolean;
  emiTenureMonths?: number;
  emiInterestRateAnnual?: number;
  emiProcessingFee?: number;
  stackable: boolean;
  usageLimitPerUser?: number;
  rawExcerpt: string;
  sourceId?: string;
  sourceUrl: string;
  retrievedAt: string;
  uncertainties?: string[];
}

export interface EligibleOffer {
  offer: ExtractedOffer;
  isEligible: boolean;
  reason: string;
  calculatedDiscount: number;
  emiCostBreakdown?: {
    tenureMonths: number;
    interestAmount: number;
    processingFee: number;
    processingFeeGst: number;
    totalEmiExtraCost: number;
    monthlyInstallment: number;
  };
  finalPayable: number;
}

export interface CardEvaluation {
  cardId: string;
  card: UserCard;
  bestOffer: EligibleOffer | null;
  allOffersForCard: EligibleOffer[];
  originalTotal: number;
  discountAmount: number;
  emiExtraCost: number;
  finalPayable: number;
  isEligible: boolean;
  ineligibilityReason?: string;
  decisionReason: string;
  uncertainties: string[];
  isWinner: boolean;
}

export interface GraphNodeStep {
  name: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'interrupted' | 'failed';
  details?: string;
  timestamp?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  sessionId: string;
  cartTotal: number;
  cartItemCount: number;
  inputQuery: string;
  selectedCard: string;
  winningOfferCode: string;
  discountGiven: number;
  finalPayable: number;
  reasoning: string;
  approvalStatus: 'approved' | 'rejected' | 'auto';
  reverified: boolean;
  evidenceSummary: string;
}

export interface AgentThoughtLogEntry {
  id: string;
  node: string;
  title: string;
  thought: string;
  toolCall?: {
    toolName: string;
    input: Record<string, any>;
    output: Record<string, any>;
  };
  llmModel: string;
  timestamp: string;
}

export interface SourceTrace {
  sourceId: string;
  sourceUrl: string;
  retrievedAt: string;
  rawExcerpt: string;
}

export interface InputValidationReport {
  isValid: boolean;
  validatedAt: string;
  checksum: string;
  recordsCount: {
    cartItems: number;
    ownedCards: number;
    bankOffers: number;
  };
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
}

export interface InvariantCheck {
  name: string;
  expected: string | number;
  observed: string | number;
  passed: boolean;
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  cartDescription: string;
  cartItems: Array<{ productId: string; quantity: number }>;
  expectedWinnerCard: string;
  expectedOfferCode: string;
  expectedSavings: number;
  expectedFinalTotal: number;
  specialCheckDescription: string;
  simulateCartTampering?: boolean;
}
