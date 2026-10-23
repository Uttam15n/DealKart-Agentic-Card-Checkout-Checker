import React from 'react';
import { HERO_BANNER_IMAGE } from '../data/seedData';
import { Sparkles, ArrowRight, ShieldCheck, CreditCard, Mic } from 'lucide-react';

interface HeroBannerProps {
  onExplore: () => void;
  onOpenTestLab: () => void;
  onGoToCheckout: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExplore,
  onOpenTestLab,
  onGoToCheckout,
}) => {
  return (
    <section className="relative bg-slate-900 text-white overflow-hidden rounded-2xl mx-4 sm:mx-6 lg:mx-8 my-6 border border-slate-800 shadow-xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[380px]">
        {/* Left Column: Context & Intent */}
        <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 flex flex-col justify-between z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-blue-400 tracking-wider uppercase mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Festive Card Bonanza 2026</span>
              <span aria-hidden="true">·</span>
              <span>LangGraph Multi-Agent Engine</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight text-balance">
              Which of your cards gives the <span className="text-blue-400">best deal</span> on your cart?
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl mb-6 leading-relaxed">
              Ask by <strong>voice or chat</strong> at checkout. Our transparent 10-node agent scrapes messy bank pages, calculates strict discount caps, catches hidden EMI processing fees, and asks for your approval before applying.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mb-8">
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-700/60">
                <Mic className="w-3.5 h-3.5 text-blue-400" />
                <span>Web Speech API Voice Input</span>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-700/60">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>HDFC · ICICI · SBI · Axis · Kotak · Amex</span>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-700/60">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Zero Payment · Idempotent Re-verify</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={onGoToCheckout}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>Test at Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenTestLab}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Run 4 Audit Test Scenarios
            </button>
            <button
              onClick={onExplore}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Browse 60+ Products ↓
            </button>
          </div>
        </div>

        {/* Right Column: Hero Visual Asset */}
        <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full">
          <img
            src={HERO_BANNER_IMAGE}
            alt="DealKart Festive Electronics and Lifestyle Showcase"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle vignette scrim */}
          <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-slate-900 via-transparent to-transparent opacity-90 lg:opacity-80" />
        </div>
      </div>
    </section>
  );
};
