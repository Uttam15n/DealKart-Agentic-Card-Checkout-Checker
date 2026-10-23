import React from 'react';
import { Product } from '../types';
import { X, Check, Star, ShieldCheck, Truck, RotateCcw, CreditCard } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  if (!product) return null;

  const discountPercent = Math.round(((product.mrp - product.price) / product.mrp) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className="font-semibold text-slate-700 uppercase tracking-wider">{product.brand}</span>
                <span aria-hidden="true">·</span>
                <span>{product.category}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
                  <span>{product.rating}</span>
                  <span className="text-slate-400">({product.ratingCount} ratings)</span>
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
            <div className="aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
              <img
                src={product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-baseline gap-2.5 mb-2">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  {product.mrp > product.price && (
                    <span className="text-sm text-slate-400 line-through font-mono tabular-nums">
                      ₹{product.mrp.toLocaleString('en-IN')}
                    </span>
                  )}
                  {discountPercent > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Save {discountPercent}%
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  {product.description}
                </p>

                {/* Bank Offer Preview Banner */}
                <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 mb-1">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Eligible Bank Offers at Checkout</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-snug">
                    Use HDFC, ICICI, SBI or Kotak cards to unlock instant discounts up to ₹2,500 or No-Cost EMI options. Check your card savings at checkout!
                  </p>
                </div>

                <div className="space-y-1.5 mb-4">
                  <span className="text-xs font-semibold text-slate-700 block">Highlights & Specs:</span>
                  {product.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Service Badges */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Truck className="w-4 h-4 text-slate-400" />
                  <span>Free Express Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  <span>1 Year Warranty</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <RotateCcw className="w-4 h-4 text-slate-400" />
                  <span>7 Days Return</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Add to Cart
            </button>
            <button
              onClick={() => {
                onBuyNow(product);
                onClose();
              }}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Buy Now with Card Offer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
