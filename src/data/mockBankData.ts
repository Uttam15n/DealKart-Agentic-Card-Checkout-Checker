export interface BankHtmlPage {
  bank: string;
  name: string;
  slug: string;
  html: string;
}

export interface BankStructuredOffer {
  code: string;
  title: string;
  badge: string;
  discountText: string;
  minSpend: number;
  maxCap: number | null;
  category: string;
  cardType: 'credit' | 'debit' | 'all';
  validUntil: string;
  status: 'active' | 'expired' | 'conditional';
  summary: string;
  keyTerms: string[];
  caveat?: string;
}

export interface BankDetail {
  slug: string;
  bank: string;
  name: string;
  tagline: string;
  themeColor: string;
  bgGradient: string;
  cardName: string;
  network: string;
  offers: BankStructuredOffer[];
}

export const STRUCTURED_BANK_DATA: Record<string, BankDetail> = {
  hdfc: {
    slug: 'hdfc',
    bank: 'HDFC',
    name: 'HDFC Bank',
    tagline: 'We Understand Your World · SmartBuy Privileges',
    themeColor: '#004C8F',
    bgGradient: 'from-blue-900 to-indigo-950',
    cardName: 'HDFC Bank Regalia Gold Credit Card',
    network: 'Visa Signature',
    offers: [
      {
        code: 'HDFC_ELEC_10',
        title: '10% Instant Discount on Electronics',
        badge: 'Top Deal',
        discountText: '10% Off up to ₹1,500',
        minSpend: 10000,
        maxCap: 1500,
        category: 'Electronics',
        cardType: 'credit',
        validUntil: '31 Dec 2026',
        status: 'active',
        summary: 'Instant 10% deduction on smartphones, laptops, audio gear, and appliances at checkout.',
        keyTerms: [
          'Valid strictly on HDFC Credit Cards (debit cards excluded)',
          'Requires minimum transaction value of ₹10,000 net',
          'Maximum discount capped at ₹1,500 per customer',
          'One redemption per card during campaign window',
        ],
      },
      {
        code: 'HDFC_ALL_5',
        title: '5% Site-Wide Instant Savings',
        badge: 'All Categories',
        discountText: '5% Off up to ₹1,000',
        minSpend: 3000,
        maxCap: 1000,
        category: 'All Departments',
        cardType: 'all',
        validUntil: '30 Nov 2026',
        status: 'active',
        summary: 'Flat 5% instant discount across Electronics, Fashion, Home, and Grocery.',
        keyTerms: [
          'Valid on both HDFC Credit and Debit Cards',
          'Minimum spend ₹3,000 required',
          'Maximum discount capped at ₹1,000',
        ],
      },
      {
        code: 'HDFC_WKND_CASHBACK',
        title: 'Weekend Grocery 5% Cashback',
        badge: 'Weekend Special',
        discountText: '5% Cashback up to ₹500',
        minSpend: 2000,
        maxCap: 500,
        category: 'Grocery',
        cardType: 'all',
        validUntil: '31 Dec 2026',
        status: 'conditional',
        summary: 'Weekend bonus credited to card statement within 90 days after purchase.',
        keyTerms: [
          'Applies only on Saturday and Sunday checkouts',
          'Credited as statement cashback, not instant invoice deduction',
        ],
        caveat: 'Deferred statement cashback rather than instant checkout price reduction.',
      },
    ],
  },
  icici: {
    slug: 'icici',
    bank: 'ICICI',
    name: 'ICICI Bank',
    tagline: 'Hum Hai Na · Spectacular Shopping Extravaganza',
    themeColor: '#B02A30',
    bgGradient: 'from-red-900 to-amber-950',
    cardName: 'ICICI Bank Sapphiro Credit Card',
    network: 'Mastercard World',
    offers: [
      {
        code: 'ICICI_FESTIVE_FLAT2500',
        title: 'Festive Big Basket Flat ₹2,500 Off',
        badge: 'High Value Pick',
        discountText: 'Flat ₹2,500 Off',
        minSpend: 30000,
        maxCap: 2500,
        category: 'Electronics, Fashion, Home',
        cardType: 'credit',
        validUntil: '15 Nov 2026',
        status: 'active',
        summary: 'Massive flat ₹2,500 instant discount on high-ticket lifestyle and tech carts.',
        keyTerms: [
          'Strict minimum transaction value of ₹30,000 net',
          'Valid on Sapphiro, Coral, Rubyx, Emeralde & Amazon Pay ICICI',
          'Applicable on Electronics, Fashion & Home items',
        ],
      },
      {
        code: 'ICICI_FLAT750',
        title: 'Electronics Kickstart Flat ₹750 Off',
        badge: 'Low Min Spend',
        discountText: 'Flat ₹750 Off',
        minSpend: 5000,
        maxCap: 750,
        category: 'Electronics',
        cardType: 'credit',
        validUntil: '31 Dec 2026',
        status: 'active',
        summary: 'Direct ₹750 off on mid-range audio and electronic accessories.',
        keyTerms: [
          'Minimum order value ₹5,000 on Electronics',
          'Valid on ICICI Credit Cards',
        ],
      },
      {
        code: 'ICICI_MONSOON_EXP',
        title: 'Monsoon Clearance 15% Off',
        badge: 'Expired',
        discountText: '15% Off up to ₹2,000',
        minSpend: 5000,
        maxCap: 2000,
        category: 'Fashion',
        cardType: 'credit',
        validUntil: '30 Sep 2026',
        status: 'expired',
        summary: 'Seasonal promotion concluded prior to current festive season.',
        keyTerms: [
          'Promotion expired on 30th September 2026',
          'Ineligible for active checkout orders',
        ],
        caveat: 'Expired offer correctly detected and rejected by the LangGraph agent.',
      },
    ],
  },
  sbi: {
    slug: 'sbi',
    bank: 'SBI',
    name: 'SBI Card',
    tagline: 'Make Life Simple · Festive Carnival 2026',
    themeColor: '#1E40AF',
    bgGradient: 'from-blue-950 to-slate-900',
    cardName: 'SBI SimplyCLICK Credit Card',
    network: 'Visa Platinum',
    offers: [
      {
        code: 'SBI_PREMIUM_4000',
        title: 'Luxury Tier Mega Flat ₹4,000 Off',
        badge: 'Mega Discount',
        discountText: 'Flat ₹4,000 Off',
        minSpend: 45000,
        maxCap: 4000,
        category: 'Electronics & Home',
        cardType: 'credit',
        validUntil: '15 Nov 2026',
        status: 'active',
        summary: 'Unmatched savings on premium flagship smartphones, laptops, and smart TVs.',
        keyTerms: [
          'Requires strict minimum spend of ₹45,000 (carts under ₹45k ineligible)',
          'Valid on SimplyCLICK, SimplySAVE, and Prime Credit Cards',
        ],
        caveat: 'High minimum spend threshold prevents usage on standard mid-range carts.',
      },
      {
        code: 'SBI_FASHION_10',
        title: '10% Fashion & Apparel Saver',
        badge: 'Apparel Deal',
        discountText: '10% Off up to ₹600',
        minSpend: 2500,
        maxCap: 600,
        category: 'Fashion',
        cardType: 'credit',
        validUntil: '31 Dec 2026',
        status: 'active',
        summary: '10% instant off on clothing, ethnic wear, and footwear.',
        keyTerms: [
          'Minimum spend ₹2,500 on Fashion items',
          'Maximum discount cap of ₹600',
        ],
      },
    ],
  },
  axis: {
    slug: 'axis',
    bank: 'AXIS',
    name: 'Axis Bank',
    tagline: 'Badhti Ka Naam Zindagi · GrabDeals Portal',
    themeColor: '#97144D',
    bgGradient: 'from-pink-950 to-rose-950',
    cardName: 'Axis Bank Neo Debit Card',
    network: 'Mastercard Platinum',
    offers: [
      {
        code: 'AXIS_DEBIT_10',
        title: 'Axis Debit Card Exclusive 10% Off',
        badge: 'Debit Only',
        discountText: '10% Off up to ₹1,000',
        minSpend: 3500,
        maxCap: 1000,
        category: 'All Departments',
        cardType: 'debit',
        validUntil: '31 Dec 2026',
        status: 'active',
        summary: 'Special instant rebate dedicated exclusively to Axis Bank Debit Card holders.',
        keyTerms: [
          'Valid ONLY on Axis Bank DEBIT Cards (Neo, Priority, Burgundy Debit)',
          'Credit cards are strictly NOT eligible for this offer',
          'Minimum order value ₹3,500; maximum cap ₹1,000',
        ],
        caveat: 'Debit card restriction rejects credit cards regardless of cart value.',
      },
      {
        code: 'AXIS_EMI_12M',
        title: '12-Month Low-Cost EMI (14% p.a.)',
        badge: 'Financing',
        discountText: '12 Months @ 14% p.a.',
        minSpend: 10000,
        maxCap: null,
        category: 'All Departments',
        cardType: 'credit',
        validUntil: '31 Dec 2026',
        status: 'conditional',
        summary: 'Convert orders above ₹10,000 into flexible monthly installments.',
        keyTerms: [
          'Interest charged at 14% p.a. reducing balance',
          'One-time bank processing fee of ₹199 + 18% GST applies',
        ],
      },
    ],
  },
  kotak: {
    slug: 'kotak',
    bank: 'KOTAK',
    name: 'Kotak Mahindra Bank',
    tagline: 'Let\'s Make Money Simple · Privilege Hub',
    themeColor: '#ED1C24',
    bgGradient: 'from-red-950 to-slate-950',
    cardName: 'Kotak League Platinum Credit Card',
    network: 'RuPay Select',
    offers: [
      {
        code: 'KOTAK_NOCOST_EMI6',
        title: '6-Month "No-Cost" EMI Plan',
        badge: 'Hidden Fee Trap',
        discountText: '0% Net Interest EMI',
        minSpend: 15000,
        maxCap: null,
        category: 'All Departments',
        cardType: 'credit',
        validUntil: '31 Dec 2026',
        status: 'conditional',
        summary: 'Zero net interest financing, but subject to bank processing convenience charge.',
        keyTerms: [
          'Bank provides upfront interest subsidy equal to charges',
          'Non-refundable processing fee of ₹299 + 18% GST (Total ₹352.82) charged on statement',
          'Minimum spend ₹15,000',
        ],
        caveat: 'The ₹352.82 processing surcharge makes this more expensive than instant discounts!',
      },
      {
        code: 'KOTAK_FLAT400',
        title: 'Everyday Savings Flat ₹400 Off',
        badge: 'Instant Off',
        discountText: 'Flat ₹400 Off',
        minSpend: 4000,
        maxCap: 400,
        category: 'All Departments',
        cardType: 'credit',
        validUntil: '31 Dec 2026',
        status: 'active',
        summary: 'Flat ₹400 off on everyday purchases across all product lines.',
        keyTerms: [
          'Minimum spend of ₹4,000 on Kotak Credit Cards',
          'Valid across all categories on DealKart',
        ],
      },
    ],
  },
  amex: {
    slug: 'amex',
    bank: 'AMEX',
    name: 'American Express',
    tagline: 'Don\'t Live Life Without It · Cardmember Privileges',
    themeColor: '#002663',
    bgGradient: 'from-blue-950 to-cyan-950',
    cardName: 'Amex Membership Rewards Credit Card',
    network: 'American Express',
    offers: [
      {
        code: 'AMEX_AUTUMN_15',
        title: 'Autumn Gateway 15% Instant Off',
        badge: 'Expired',
        discountText: '15% Off up to ₹3,000',
        minSpend: 10000,
        maxCap: 3000,
        category: 'Fashion & Lifestyle',
        cardType: 'credit',
        validUntil: '01 Oct 2026',
        status: 'expired',
        summary: 'Premium cardmember discount that concluded on October 1st.',
        keyTerms: [
          'Expired on 1st October 2026',
          'Cannot be redeemed for current carts',
        ],
        caveat: 'Agent recognizes expired date and marks card as ineligible.',
      },
      {
        code: 'AMEX_GLOBAL_REWARDS',
        title: '5X Bonus Membership Rewards',
        badge: 'Points Only',
        discountText: '5X Reward Points',
        minSpend: 25000,
        maxCap: null,
        category: 'All Departments',
        cardType: 'credit',
        validUntil: '31 Dec 2026',
        status: 'conditional',
        summary: 'Earn points for future airline miles or gift cards, with no upfront invoice price deduction.',
        keyTerms: [
          'Awards loyalty reward points to Amex account',
          'Does not reduce immediate cart payable price',
        ],
        caveat: 'Agent flags as uncertain / non-discount because it is a points accrual scheme.',
      },
    ],
  },
};

export const MOCK_BANK_PAGES: Record<string, BankHtmlPage> = {
  hdfc: {
    bank: 'HDFC',
    name: 'HDFC Bank SmartBuy & Retail Offers',
    slug: 'hdfc',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>HDFC Bank Cards - DealKart Festive Delights 2026</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
  <h1>HDFC Bank Festive Privileges & Card Offers</h1>
  <p>Last Updated: October 2026 | Ref: HDFC/DK/2026/FEST-881</p>
  <hr/>

  <h2>Offer 1: HDFC 10% Instant Discount on Electronics (Promo Code: HDFC_ELEC_10)</h2>
  <p>
    Get an instant 10% discount on select consumer electronics and gadgets on DealKart using your HDFC Bank Credit Card.
  </p>
  <ul>
    <li><strong>Eligibility:</strong> Valid only on HDFC Bank Credit Cards (Retail & Business). Debit cards strictly excluded.</li>
    <li><strong>Minimum Transaction Amount:</strong> ₹10,000 net cart value.</li>
    <li><strong>Maximum Discount Cap:</strong> Capped at ₹1,500 per transaction per cardholder.</li>
    <li><strong>Category:</strong> Applicable exclusively to items within the "Electronics" department.</li>
    <li><strong>Validity Period:</strong> Valid from 1st October 2026 until 31st December 2026.</li>
    <li><strong>Stackability:</strong> Cannot be clubbed with bank EMI schemes or any other promotional code. One offer per customer.</li>
  </ul>

  <h2>Offer 2: HDFC Site-Wide 5% Flat Instant Saving (Promo Code: HDFC_ALL_5)</h2>
  <p>
    Enjoy 5% instant discount across all departments including Fashion, Home, and Grocery.
  </p>
  <ul>
    <li><strong>Eligibility:</strong> Valid on all HDFC Bank Credit & Debit Cards.</li>
    <li><strong>Minimum Transaction Value:</strong> ₹3,000.</li>
    <li><strong>Maximum Cap:</strong> ₹1,000 discount per card.</li>
    <li><strong>Category:</strong> All categories allowed.</li>
    <li><strong>Validity:</strong> Valid till 30th November 2026.</li>
  </ul>

  <h2>Offer 3: Mega Festive Weekend Bonus (Promo Code: HDFC_WKND_CASHBACK)</h2>
  <p>
    Get 5% additional cashback on grocery orders on Saturdays and Sundays. Capped at ₹500. Processing may take up to 90 days.
  </p>
  <p><em>Notice: Unclear whether cashback applies at checkout or as statement credit; marked as uncertain for instant checkout deduction.</em></p>

  <hr/>
  <p style="font-size: 12px; color: #64748b;">Terms & Conditions apply. HDFC Bank reserves the sole right to withdraw or alter offers without prior notice.</p>
</body>
</html>`,
  },

  icici: {
    bank: 'ICICI',
    name: 'ICICI Bank Deals & Privilege Offers',
    slug: 'icici',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>ICICI Bank Card Offers at DealKart</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
  <h1>ICICI Bank Spectacular Shopping Extravaganza</h1>
  <p>Campaign ID: ICICI-DK-AUTUMN-26</p>
  <hr/>

  <h2>Offer 1: Festive Big Basket Flat ₹2,500 Off (Promo Code: ICICI_FESTIVE_FLAT2500)</h2>
  <p>
    Unlock a massive flat ₹2,500 instant discount on high-value carts across all lifestyle and tech categories!
  </p>
  <ul>
    <li><strong>Eligibility:</strong> ICICI Bank Credit Cards (Sapphiro, Rubyx, Coral, Emeralde, Amazon Pay ICICI).</li>
    <li><strong>Minimum Spend Requirement:</strong> Cart total must be ₹30,000 or greater.</li>
    <li><strong>Discount Structure:</strong> Flat ₹2,500 off deducted instantly at checkout.</li>
    <li><strong>Applicable Categories:</strong> Electronics, Fashion, and Home & Kitchen.</li>
    <li><strong>Validity:</strong> 15th October 2026 to 15th November 2026.</li>
  </ul>

  <h2>Offer 2: ICICI Flat ₹750 Electronics Kickstart (Promo Code: ICICI_FLAT750)</h2>
  <p>
    Flat ₹750 off on Electronics when spending ₹5,000 or above on ICICI Credit Cards.
  </p>
  <ul>
    <li><strong>Minimum Cart Value:</strong> ₹5,000.</li>
    <li><strong>Discount:</strong> Flat ₹750 off.</li>
    <li><strong>Restrictions:</strong> One redemption per account.</li>
    <li><strong>Validity:</strong> Valid till 31st December 2026.</li>
  </ul>

  <h2>Offer 3: ICICI Monsoon Clearance Bonanza (Promo Code: ICICI_MONSOON_EXP)</h2>
  <p>
    Flat 15% off up to ₹2,000 on fashion items.
  </p>
  <ul>
    <li><strong>Status:</strong> EXPIRED on 30th September 2026. Not valid for current checkouts.</li>
  </ul>

  <hr/>
  <p style="font-size: 12px; color: #64748b;">ICICI Bank cardholders must select credit card during checkout. Commercial and Corporate cards do not qualify.</p>
</body>
</html>`,
  },

  sbi: {
    bank: 'SBI',
    name: 'SBI Card Super Savings Portal',
    slug: 'sbi',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SBI Card Exclusive Privileges - DealKart</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
  <h1>SBI Card Festive Carnival 2026</h1>
  <p>Bulletin Ref: SBICARD/MKTG/DK/OCT26</p>
  <hr/>

  <h2>Offer 1: Premium Luxury Tier Flat ₹4,000 Off (Promo Code: SBI_PREMIUM_4000)</h2>
  <p>
    Celebrate the festive season with unmatched savings on premium gadgets and luxury home products!
  </p>
  <ul>
    <li><strong>Eligibility:</strong> SBI SimplyCLICK, SimplySAVE, and Prime Credit Cards.</li>
    <li><strong>Minimum Spend Requirement:</strong> Strict minimum transaction value of ₹45,000 net. Carts below ₹45,000 are ineligible.</li>
    <li><strong>Discount:</strong> Flat ₹4,000 instant discount.</li>
    <li><strong>Eligible Departments:</strong> Electronics, Home & Kitchen.</li>
    <li><strong>Validity:</strong> Valid till 15th November 2026.</li>
  </ul>

  <h2>Offer 2: SBI 10% Fashion Saver (Promo Code: SBI_FASHION_10)</h2>
  <p>
    Get 10% instant off on clothing, footwear, and accessories.
  </p>
  <ul>
    <li><strong>Minimum Spend:</strong> ₹2,500.</li>
    <li><strong>Maximum Cap:</strong> ₹600.</li>
    <li><strong>Category:</strong> Fashion only.</li>
    <li><strong>Validity:</strong> Valid till 31st December 2026.</li>
  </ul>

  <hr/>
  <p style="font-size: 12px; color: #64748b;">SBI Cards & Payment Services Ltd. offers valid for Indian retail cardholders only.</p>
</body>
</html>`,
  },

  axis: {
    bank: 'AXIS',
    name: 'Axis Bank Dining & Shopping Offers',
    slug: 'axis',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Axis Bank GrabDeals - DealKart</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
  <h1>Axis Bank GrabDeals & Partner Privileges</h1>
  <hr/>

  <h2>Offer 1: Axis Debit Card Delight (Promo Code: AXIS_DEBIT_10)</h2>
  <p>
    Special 10% instant discount dedicated exclusively to Axis Bank Debit Card holders!
  </p>
  <ul>
    <li><strong>Crucial Restriction:</strong> Valid ONLY on Axis Bank DEBIT Cards (Neo, Priority, Burgundy Debit). Credit cards are NOT eligible.</li>
    <li><strong>Minimum Order Value:</strong> ₹3,500.</li>
    <li><strong>Maximum Discount:</strong> Capped at ₹1,000.</li>
    <li><strong>Categories:</strong> Electronics, Fashion, Home, Grocery.</li>
    <li><strong>Validity:</strong> Valid until 31st December 2026.</li>
  </ul>

  <h2>Offer 2: Axis Low-Cost EMI 12 Months (Promo Code: AXIS_EMI_12M)</h2>
  <p>
    Convert purchases above ₹10,000 into 12-month EMIs at 14% p.a. reducing balance interest. One-time bank processing fee of ₹199 + GST applies.
  </p>

  <hr/>
  <p style="font-size: 12px; color: #64748b;">Axis Bank reserves the right to disqualify any cardholder in case of fraudulent activity.</p>
</body>
</html>`,
  },

  kotak: {
    bank: 'KOTAK',
    name: 'Kotak Mahindra Bank Privilege Hub',
    slug: 'kotak',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Kotak Bank EMI & Card Offers</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
  <h1>Kotak Mahindra Bank Festive Specials</h1>
  <hr/>

  <h2>Offer 1: Kotak "No-Cost" EMI for 6 Months (Promo Code: KOTAK_NOCOST_EMI6)</h2>
  <p>
    Avail 6-Month No-Cost EMI on transactions of ₹15,000 and above using Kotak League Platinum or White Credit Cards.
  </p>
  <ul>
    <li><strong>Subsidized Interest:</strong> The bank provides an upfront instant interest discount equal to the interest charged (Zero net interest).</li>
    <li><strong>Hidden Processing Surcharge:</strong> A non-refundable convenience/processing fee of ₹299 + 18% GST (Total ₹352.82) is charged by the bank on the card statement.</li>
    <li><strong>Minimum Spend:</strong> ₹15,000.</li>
    <li><strong>Validity:</strong> Valid till 31st December 2026.</li>
  </ul>

  <h2>Offer 2: Kotak Everyday Flat ₹400 Off (Promo Code: KOTAK_FLAT400)</h2>
  <p>
    Flat ₹400 off on minimum spend of ₹4,000 on Kotak Credit Cards across all categories.
  </p>
  <ul>
    <li><strong>Validity:</strong> Valid till 31st December 2026.</li>
  </ul>

  <hr/>
  <p style="font-size: 12px; color: #64748b;">All loans and credit facilities are at the sole discretion of Kotak Mahindra Bank Ltd.</p>
</body>
</html>`,
  },

  amex: {
    bank: 'AMEX',
    name: 'American Express Experiences & Cardmember Offers',
    slug: 'amex',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>American Express Offers</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
  <h1>American Express Cardmember Privileges</h1>
  <hr/>

  <h2>Offer 1: Amex Autumn Gateway 15% Off (Promo Code: AMEX_AUTUMN_15)</h2>
  <p>
    Cardmembers receive 15% instant discount up to ₹3,000 on lifestyle and fashion purchases.
  </p>
  <ul>
    <li><strong>Minimum Spend:</strong> ₹10,000.</li>
    <li><strong>Validity Notice:</strong> EXPIRED on 1st October 2026. No longer active.</li>
  </ul>

  <h2>Offer 2: Amex Global Luxury Rewards (Promo Code: AMEX_GLOBAL_REWARDS)</h2>
  <p>
    Earn 5X bonus Membership Reward points on spending ₹25,000+.
  </p>
  <p><em>Notice: This offer grants reward points for future redemption, not an instant price deduction at checkout.</em></p>

  <hr/>
  <p style="font-size: 12px; color: #64748b;">American Express Banking Corp. incorporated in the USA. Terms apply.</p>
</body>
</html>`,
  },
};
