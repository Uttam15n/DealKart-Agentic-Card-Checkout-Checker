import React, { useState } from 'react';
import { STRUCTURED_BANK_DATA, BankDetail, BankStructuredOffer } from '../data/mockBankData';
import {
  CreditCard,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Percent,
} from 'lucide-react';

interface BankOffersPageProps {
  onGoToCheckout?: () => void;
}

export const BankOffersPage: React.FC<BankOffersPageProps> = ({ onGoToCheckout }) => {
  const [selectedBankKey, setSelectedBankKey] = useState<string>('hdfc');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const bankKeys = Object.keys(STRUCTURED_BANK_DATA);
  const currentBank: BankDetail =
    STRUCTURED_BANK_DATA[selectedBankKey] || STRUCTURED_BANK_DATA['hdfc'];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Partner Bank Benefits
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-medium">Festive 2026 Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Bank Offers & Card Privileges
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Browse active credit, debit, and EMI offers across India's leading banks. Our LangGraph agent reads these exact terms to maximize your checkout savings.
          </p>
        </div>

        {onGoToCheckout && (
          <button
            onClick={onGoToCheckout}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
          >
            <span>Apply at Checkout</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bank Tabs Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 border-b border-slate-200 scrollbar-none">
        {bankKeys.map((key) => {
          const bank = STRUCTURED_BANK_DATA[key];
          const isSelected = selectedBankKey === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedBankKey(key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{bank.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {bank.offers.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bank Hero Showcase Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-8">
        {/* Visual Metallic Bank Card */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div
            className={`w-full aspect-[1.58/1] rounded-2xl bg-gradient-to-br ${currentBank.bgGradient} text-white p-6 sm:p-7 shadow-xl border border-white/10 flex flex-col justify-between relative overflow-hidden`}
          >
            {/* Holographic Watermark Pattern */}
            <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/60">
                  {currentBank.name} Privileges
                </span>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white mt-0.5">
                  {currentBank.cardName}
                </h3>
              </div>
              <div className="w-9 h-7 rounded bg-amber-400/80 border border-amber-300 flex items-center justify-center text-[9px] font-mono font-bold text-amber-950 shadow-inner">
                CHIP
              </div>
            </div>

            <div className="relative z-10 space-y-3">
              <div className="font-mono text-sm tracking-widest text-white/80">
                •••• ···· ···· 4821
              </div>

              <div className="flex items-end justify-between pt-2 border-t border-white/10">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/50 block">
                    Cardholder
                  </span>
                  <span className="text-xs font-semibold tracking-wider text-white">
                    AARAV SHARMA
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider text-white/50 block">
                    Network
                  </span>
                  <span className="text-xs font-bold text-white tracking-wider">
                    {currentBank.network}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <span className="font-bold text-slate-900 block mb-1">
              Bank Offer Strategy Note:
            </span>
            <p className="leading-relaxed">
              {currentBank.tagline}. Scraped by LangGraph directly from <span className="font-mono text-[11px] text-blue-600">/bank-offers/{currentBank.slug}</span> with timestamp tracking and mathematical cap analysis.
            </p>
          </div>
        </div>

        {/* Bank Offers List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Available Offers ({currentBank.offers.length})
            </h2>
            <span className="text-[11px] text-slate-500">
              Evaluated at checkout by LangGraph
            </span>
          </div>

          {currentBank.offers.map((offer) => {
            const isCopied = copiedCode === offer.code;
            const isExpired = offer.status === 'expired';
            const isConditional = offer.status === 'conditional';

            return (
              <div
                key={offer.code}
                className={`rounded-2xl border p-5 transition-all bg-white ${
                  isExpired
                    ? 'border-slate-200 opacity-75'
                    : isConditional
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md'
                }`}
              >
                {/* Offer Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isExpired
                            ? 'bg-red-100 text-red-700'
                            : isConditional
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isExpired ? 'EXPIRED' : isConditional ? 'CONDITIONAL' : 'ACTIVE'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">·</span>
                      <span className="text-xs font-semibold text-slate-700">
                        {offer.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {offer.title}
                    </h3>
                  </div>

                  {/* Promo Code & Copy Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyCode(offer.code)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800'
                      }`}
                      title="Copy Promo Code"
                    >
                      <span>{offer.code}</span>
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  {offer.summary}
                </p>

                {/* Offer Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Benefit
                    </span>
                    <span className="font-bold text-blue-700 font-mono">
                      {offer.discountText}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Min Spend
                    </span>
                    <span className="font-bold text-slate-800 font-mono">
                      ₹{offer.minSpend.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Max Cap
                    </span>
                    <span className="font-bold text-slate-800 font-mono">
                      {offer.maxCap ? `₹${offer.maxCap.toLocaleString('en-IN')}` : 'No Cap'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Valid Until
                    </span>
                    <span className="font-medium text-slate-700">
                      {offer.validUntil}
                    </span>
                  </div>
                </div>

                {/* Terms and Conditions Bullets */}
                <div className="space-y-1 mb-2">
                  <span className="text-[11px] font-bold text-slate-700 block">Key Terms:</span>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {offer.keyTerms.map((term, tIdx) => (
                      <li key={tIdx} className="flex items-start gap-1.5">
                        <span className="text-slate-400 mt-0.5">•</span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Caveat Banner if present */}
                {offer.caveat && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Agent Evaluation Note:</strong> {offer.caveat}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
