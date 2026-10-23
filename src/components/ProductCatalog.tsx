import React, { useState, useMemo } from 'react';
import { Product, ProductCategory } from '../types';
import { Search, Plus, Check, Star, Eye } from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onViewDetails: (product: Product) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onAddToCart,
  onBuyNow,
  onViewDetails,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating'>('featured');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const categories: Array<{ id: string; label: string }> = [
    { id: 'All', label: 'All Products (60+)' },
    { id: 'Electronics', label: 'Electronics (20)' },
    { id: 'Fashion', label: 'Fashion & Apparel (15)' },
    { id: 'Home', label: 'Home & Kitchen (15)' },
    { id: 'Grocery', label: 'Grocery & Gourmet (10)' },
  ];

  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== 'All') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price_asc') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result = [...result].sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  const handleAddWithFeedback = (product: Product) => {
    onAddToCart(product);
    setAddedIds((prev) => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 1200);
  };

  return (
    <div id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search, Filter Tabs & Sort Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        {/* Category Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products or brands..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Customer Rating</option>
          </select>
        </div>
      </div>

      {/* Product Count & Active Filters Indicator */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-6">
        <span>Showing {filteredProducts.length} curated products</span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Clear search filter
          </button>
        )}
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const discountPercent = Math.round(((product.mrp - product.price) / product.mrp) * 100);
          const isAdded = addedIds.has(product.id);

          return (
            <div
              key={product.id}
              className="group bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              {/* Product Visual Area */}
              <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e: any) => {
                    // Fallback to high-contrast domain placeholder if network fails
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80';
                  }}
                />

                {/* Quick Details Trigger */}
                <button
                  onClick={() => onViewDetails(product)}
                  className="absolute right-2 top-2 p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                  title="Quick View Specs"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {discountPercent > 0 && (
                  <span className="absolute left-2 top-2 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  {/* Clean unboxed metadata (anti-pill discipline) */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1.5">
                    <span className="font-semibold text-slate-700 uppercase tracking-wider">{product.brand}</span>
                    <span aria-hidden="true">·</span>
                    <span>{product.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                      <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" />
                      <span>{product.rating}</span>
                    </span>
                  </div>

                  <h3
                    onClick={() => onViewDetails(product)}
                    className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer mb-2"
                  >
                    {product.name}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {product.description}
                  </p>
                </div>

                <div>
                  {/* Price Row */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                    {product.mrp > product.price && (
                      <span className="text-xs text-slate-400 line-through font-mono tabular-nums">
                        ₹{product.mrp.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleAddWithFeedback(product)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onBuyNow(product)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-center cursor-pointer shadow-sm"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
