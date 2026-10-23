import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { ProductCatalog } from './components/ProductCatalog';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CheckoutPage } from './components/CheckoutPage';
import { BankOffersPage } from './components/BankOffersPage';
import { TestLabPage } from './components/TestLabPage';
import { AuditLogModal } from './components/AuditLogModal';
import { Product, CartItem, UserCard, TestScenario } from './types';
import { SEED_PRODUCTS, SEED_CARDS, SEED_ADDRESS } from './data/seedData';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'shop' | 'checkout' | 'bank-offers' | 'tests' | 'audit'>('shop');
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [cards, setCards] = useState<UserCard[]>(SEED_CARDS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [cart, setCart] = useState<{
    items: CartItem[];
    subtotal: number;
    gst: number;
    deliveryFee: number;
    cartTotal: number;
    appliedOfferCode: string | null;
    appliedDiscount: number;
  }>({
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
  });

  const refreshCart = async () => {
    try {
      const res = await fetch('/api/cart');
      const data = await res.json();
      if (data.cart) {
        setCart(data.cart);
      }
    } catch (err) {
      console.warn('Failed to fetch remote cart, maintaining local state:', err);
    }
  };

  useEffect(() => {
    // Fetch initial products and cart
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        if (d.products && d.products.length > 0) setProducts(d.products);
      })
      .catch(() => {});

    fetch('/api/cards')
      .then((r) => r.json())
      .then((d) => {
        if (d.cards && d.cards.length > 0) setCards(d.cards);
      })
      .catch(() => {});

    refreshCart();
  }, []);

  const handleAddToCart = async (product: Product) => {
    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      const data = await res.json();
      if (data.cart) {
        setCart(data.cart);
      }
    } catch {
      // Local fallback
      setCart((prev) => {
        const existing = prev.items.find((i) => i.product.id === product.id);
        const newItems = existing
          ? prev.items.map((i) =>
              i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
            )
          : [...prev.items, { product, quantity: 1 }];
        const subtotal = newItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
        return {
          ...prev,
          items: newItems,
          subtotal,
          cartTotal: subtotal,
          appliedOfferCode: null,
          appliedDiscount: 0,
        };
      });
    }
  };

  const handleBuyNow = async (product: Product) => {
    await handleAddToCart(product);
    setCurrentTab('checkout');
  };

  const handleUpdateCartItem = async (productId: string, quantity: number) => {
    try {
      const res = await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (data.cart) {
        setCart(data.cart);
      }
    } catch {
      refreshCart();
    }
  };

  const handleLoadScenarioIntoCheckout = async (scenario: TestScenario) => {
    try {
      const res = await fetch('/api/cart/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: scenario.cartItems }),
      });
      const data = await res.json();
      if (data.cart) {
        setCart(data.cart);
      }
    } catch {
      // Fallback
    }
    setCurrentTab('checkout');
  };

  const handleApplyOffer = async (_cardId: string, _offerCode: string) => {
    await refreshCart();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      <div>
        {/* Universal Top Bar Contract */}
        <Header
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          cartItems={cart.items}
          cartTotal={cart.cartTotal}
          appliedDiscount={cart.appliedDiscount}
        />

        {/* Tab Router */}
        <main>
          {currentTab === 'shop' && (
            <>
              <HeroBanner
                onExplore={() => {
                  const el = document.getElementById('catalog-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                onOpenTestLab={() => setCurrentTab('tests')}
                onGoToCheckout={() => setCurrentTab('checkout')}
              />
              <ProductCatalog
                products={products}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                onViewDetails={setSelectedProduct}
              />
            </>
          )}

          {currentTab === 'checkout' && (
            <CheckoutPage
              cart={cart}
              cards={cards}
              address={SEED_ADDRESS}
              onUpdateCartItem={handleUpdateCartItem}
              onApplyOffer={handleApplyOffer}
              onRefreshCart={refreshCart}
            />
          )}

          {currentTab === 'bank-offers' && (
            <BankOffersPage onGoToCheckout={() => setCurrentTab('checkout')} />
          )}

          {currentTab === 'tests' && (
            <TestLabPage
              onLoadScenarioIntoCheckout={handleLoadScenarioIntoCheckout}
            />
          )}

          {currentTab === 'audit' && <AuditLogModal />}
        </main>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      )}

      {/* Clean Global Footer */}
      <footer className="mt-16 bg-white border-t border-slate-200 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">DealKart</span>
            <span>·</span>
            <span>LangGraph Card Offer Checker</span>
            <span>·</span>
            <span>Zero Payment Demo Engine</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentTab('bank-offers')}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              Bank Partner Offers
            </button>
            <button
              onClick={() => setCurrentTab('tests')}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              4 Audit Test Scenarios
            </button>
            <button
              onClick={() => setCurrentTab('audit')}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              Audit Trail
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
