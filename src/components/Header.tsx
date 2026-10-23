import React from 'react';
import { ShoppingBag, ShieldCheck, Sparkles, User, FileText, CheckCircle2 } from 'lucide-react';
import { CartItem } from '../types';

interface HeaderProps {
  currentTab: 'shop' | 'checkout' | 'bank-offers' | 'tests' | 'audit';
  onSelectTab: (tab: 'shop' | 'checkout' | 'bank-offers' | 'tests' | 'audit') => void;
  cartItems: CartItem[];
  cartTotal: number;
  appliedDiscount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  cartItems,
  cartTotal,
  appliedDiscount,
}) => {
  const activeCount = cartItems
    .filter((i) => !i.savedForLater)
    .reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <button
            onClick={() => onSelectTab('shop')}
            className="flex items-center gap-2 group cursor-pointer text-left shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              D
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                DealKart
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Festive Deals · 2026
              </span>
            </div>
          </button>

          {/* Zone 2: 4 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => onSelectTab('shop')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentTab === 'shop' ? 'text-blue-600 font-semibold' : ''
              }`}
            >
              Shop All
            </button>
            <button
              onClick={() => onSelectTab('bank-offers')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentTab === 'bank-offers' ? 'text-blue-600 font-semibold' : ''
              }`}
            >
              Bank Offers
            </button>
            <button
              onClick={() => onSelectTab('tests')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'tests' ? 'text-blue-600 font-semibold' : ''
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Test Lab (4 Scenarios)</span>
            </button>
            <button
              onClick={() => onSelectTab('audit')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'audit' ? 'text-blue-600 font-semibold' : ''
              }`}
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Audit Trail</span>
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('checkout')}
              className="relative flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer shadow-sm"
              title="View Cart & Card Offer Checker"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Checkout</span>
              <span className="font-mono tabular-nums text-slate-200">
                ₹{cartTotal.toLocaleString('en-IN')}
              </span>
              {activeCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                  {activeCount}
                </span>
              )}
            </button>

            {appliedDiscount > 0 && (
              <span className="hidden lg:inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>₹{appliedDiscount.toLocaleString('en-IN')} Saved</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
