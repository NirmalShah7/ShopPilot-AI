import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Heart,
  Grid2X2,
  List,
  Search,
  Star,
  SlidersHorizontal,
  Scale,
  X,
  ShoppingCart,
} from "lucide-react";
import type { Product } from "@/types/chat";
import { ProductDetailModal } from "@/components/product/ProductDetailModal";
import { CartDrawer } from "@/components/product/CartDrawer";
import { useCartStore } from "@/store/cartStore";
import { useToastStore } from "@/store/toastStore";

// Production API is used by default. VITE_API_URL can still override it
// for local development or another trusted deployment.
const API_BASE = (import.meta.env.VITE_API_URL || "https://shoppilot-ai-ikfp.onrender.com").replace(/\/+$/, "");
const PAGE_SIZE = 24;

const prettyCategory: Record<string, string> = {
  laptop: "Laptops",
  smartphone: "Mobile Phones",
  tablet: "Tablets",
  smartwatch: "Smartwatches",
  "earbuds-headphones": "Audio",
  speaker: "Speakers",
  camera: "Cameras",
  television: "TV & Displays",
  storage: "Storage",
  "computer-accessories": "Computer Accessories",
  "mobile-accessories": "Mobile Accessories",
  "charger-adapter": "Chargers & Adapters",
  "personal-care-electronics": "Personal Care",
  "other-electronics": "Other Electronics",
};

const formatPrice = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const discount = (product: Product) =>
  product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;

function ProductImage({ product, className = "" }: { product: Product; className?: string }) {
  return (
    <div className={`flex items-center justify-center overflow-hidden bg-white ${className}`}>
      <img
        src={product.imageUrl}
        alt={product.name}
        loading="lazy"
        className="h-[78%] w-[78%] object-contain mix-blend-multiply"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

export default function Browse() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [brands, setBrands] = useState<Array<{ brand: string; count: number }>>([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPriceLimit, setMaxPriceLimit] = useState(150000);
  const [maxPrice, setMaxPrice] = useState(150000);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState("featured");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const addToCart = useCartStore((state) => state.addToCart);
  const showToast = useToastStore((state) => state.show);

  useEffect(() => {
    fetch(`${API_BASE}/api/products/meta`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load product metadata");
        return response.json();
      })
      .then((data) => {
        setCategories(data.categories ?? []);
        setBrands(data.brands ?? []);
        setMinPrice(data.minPrice ?? 0);
        setMaxPriceLimit(data.maxPrice ?? 150000);
        setMaxPrice(data.maxPrice ?? 150000);
      })
      .catch(() => setError("Unable to reach the product API. Please try again."));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({
      q: query,
      category,
      brand,
      minPrice: String(minPrice),
      maxPrice: String(maxPrice),
      sort,
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });

    fetch(`${API_BASE}/api/products?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load products");
        return response.json();
      })
      .then((data) => {
        const items = Array.isArray(data.items) ? [...data.items] : [];
        // Keep the catalog's strongest/popular products in the result set,
        // but shuffle their presentation so Browse feels fresh on each load.
        for (let i = items.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
        setProducts(items);
        setTotal(data.total ?? 0);
        setError("");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setProducts([]);
          setTotal(0);
          setError("Could not load products from the deployed product API. Please try again.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query, category, brand, minPrice, maxPrice, sort, page]);

  useEffect(() => {
    setPage(0);
  }, [query, category, brand, minPrice, maxPrice, sort]);

  const heroProducts = useMemo(() => products.slice(0, 3), [products]);
  const heroProduct = heroProducts[slide % Math.max(heroProducts.length, 1)];
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, total);

  const categoryTabs = useMemo(
    () => categories.slice(0, 8),
    [categories],
  );

  const toggleWishlist = (id: string) =>
    setWishlist((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));

  const toggleCompare = (id: string) => {
    setCompare((items) => {
      if (items.includes(id)) return items.filter((item) => item !== id);
      if (items.length >= 4) return items;
      return [...items, id];
    });
  };

  const resetFilters = () => {
    setQuery("");
    setCategory("");
    setBrand("");
    setMaxPrice(maxPriceLimit);
    setSort("featured");
  };

  return (
    <div className="min-h-full bg-[#f7f6f2] px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto max-w-[1420px] overflow-hidden rounded-[18px] border border-[#e7e4dc] bg-white shadow-[0_12px_45px_rgba(30,30,20,0.08)]">
        <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-[#161614] sm:text-[31px]">Browse Products</h1>
              <p className="mt-1.5 text-[14px] text-[#66645d]">Explore products directly from your seeded electronics catalog</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCartOpen(true)} className="relative flex h-9 items-center gap-2 rounded-xl border border-[#ebe9e2] px-3 text-[12px] font-medium text-[#34332e]">
                <ShoppingCart className="h-4 w-4" /> Cart ({cartCount})
              </button>
              <button className="flex h-9 items-center gap-2 rounded-xl border border-[#ebe9e2] px-3 text-[12px] font-medium text-[#34332e]">
                <Scale className="h-4 w-4" /> Compare ({compare.length})
              </button>
              <button className="flex h-9 items-center gap-2 rounded-xl border border-[#ebe9e2] px-3 text-[12px] font-medium text-[#34332e]">
                <Heart className="h-4 w-4" /> Wishlist ({wishlist.length})
              </button>
            </div>
          </div>

          {heroProduct && (
            <div className="relative mt-5 h-[180px] overflow-hidden rounded-xl bg-[#0c0d13] sm:h-[192px]">
              <img src={heroProduct.imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain object-right opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#05060a] via-[#05060a]/80 to-transparent" />
              <div className="relative z-10 flex h-full max-w-[560px] flex-col justify-center px-7 text-white sm:px-11">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">Featured from your catalog</p>
                <h2 className="mt-1 text-[21px] font-semibold leading-tight sm:text-[24px]">{heroProduct.name}</h2>
                <p className="mt-2 max-w-[380px] line-clamp-2 text-[13px] leading-5 text-white/80">{heroProduct.description}</p>
                <button onClick={() => setSelectedProduct(heroProduct)} className="mt-3 w-fit rounded-lg bg-[#687000] px-3.5 py-2 text-[12px] font-semibold">View Product</button>
              </div>
              {heroProducts.length > 1 && (
                <>
                  <button aria-label="Previous slide" onClick={() => setSlide((value) => (value - 1 + heroProducts.length) % heroProducts.length)} className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white backdrop-blur">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button aria-label="Next slide" onClick={() => setSlide((value) => (value + 1) % heroProducts.length)} className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white backdrop-blur">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                    {heroProducts.map((product, index) => (
                      <button key={product.id} onClick={() => setSlide(index)} aria-label={`Featured product ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === slide % heroProducts.length ? "w-5 bg-white" : "w-1.5 bg-white/45"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77756e]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, brands, categories..." className="h-10 w-full rounded-xl border border-[#e5e2da] bg-white pl-10 pr-9 text-[13px] outline-none placeholder:text-[#aaa79d] focus:border-[#8b8f4c]" />
              {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-[#77756e]" /></button>}
            </div>
            <button onClick={() => setMobileFiltersOpen((value) => !value)} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#e5e2da] px-4 text-[13px] font-medium lg:hidden">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
            <label className="relative flex h-10 items-center rounded-xl border border-[#e5e2da] px-3 text-[13px] lg:w-44">
              <span className="mr-2 text-[#77756e]">Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="w-full appearance-none bg-transparent outline-none">
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
                <option value="discount">Biggest Discount</option>
                <option value="name">Name</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-[#77756e]" />
            </label>
            <div className="hidden h-10 items-center rounded-xl border border-[#e5e2da] p-1 sm:flex">
              <button onClick={() => setView("grid")} className={`rounded-lg p-2 ${view === "grid" ? "bg-[#f0f0e8]" : "text-[#77756e]"}`}><Grid2X2 className="h-4 w-4" /></button>
              <button onClick={() => setView("list")} className={`rounded-lg p-2 ${view === "list" ? "bg-[#f0f0e8]" : "text-[#77756e]"}`}><List className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
            <aside className={`${mobileFiltersOpen ? "block" : "hidden"} rounded-xl border border-[#e7e4dc] p-4 lg:block lg:border-0 lg:p-0`}>
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold">Filters</h3>
                <button onClick={resetFilters} className="text-[11px] text-[#697000]">Clear All</button>
              </div>

              <div className="mt-5 border-b border-[#ece9e1] pb-4">
                <p className="mb-3 text-[12px] font-semibold">Category</p>
                <button onClick={() => setCategory("")} className={`flex w-full items-center gap-2 py-1.5 text-left text-[12px] ${!category ? "font-semibold" : "text-[#55534c]"}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${!category ? "border-[#5c6318] bg-[#5c6318] text-white" : "border-[#cfcac0]"}`}>{!category && <Check className="h-3 w-3" />}</span>
                  All Categories
                </button>
                {categories.map((item) => (
                  <button key={item.category} onClick={() => setCategory(item.category)} className={`flex w-full items-center gap-2 py-1.5 text-left text-[12px] ${category === item.category ? "font-semibold" : "text-[#55534c]"}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${category === item.category ? "border-[#5c6318] bg-[#5c6318] text-white" : "border-[#cfcac0]"}`}>{category === item.category && <Check className="h-3 w-3" />}</span>
                    <span className="truncate">{prettyCategory[item.category] ?? item.category}</span>
                  </button>
                ))}
              </div>

              <div className="border-b border-[#ece9e1] py-4">
                <p className="mb-3 text-[12px] font-semibold">Price Range</p>
                <input aria-label="Maximum price" type="range" min={minPrice} max={maxPriceLimit} value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className="w-full accent-[#5c6318]" />
                <div className="mt-2 flex justify-between text-[10px] text-[#77756e]"><span>{formatPrice(minPrice)}</span><span>{formatPrice(maxPrice)}</span></div>
              </div>

              <div className="pt-4">
                <p className="mb-3 text-[12px] font-semibold">Popular Brands</p>
                {brands.slice(0, 10).map((item) => (
                  <button key={item.brand} onClick={() => setBrand(brand === item.brand ? "" : item.brand)} className={`mb-1 flex w-full items-center gap-2 py-1.5 text-left text-[12px] ${brand === item.brand ? "font-semibold" : "text-[#55534c]"}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${brand === item.brand ? "border-[#5c6318] bg-[#5c6318] text-white" : "border-[#cfcac0]"}`}>{brand === item.brand && <Check className="h-3 w-3" />}</span>
                    <span className="truncate">{item.brand}</span>
                  </button>
                ))}
              </div>
            </aside>

            <div className="min-w-0">
              <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setCategory("")} className={`shrink-0 rounded-full border px-4 py-2 text-[12px] ${!category ? "border-[#687000] bg-[#687000] font-semibold text-white" : "border-[#ebe8e0] bg-white"}`}>All</button>
                {categoryTabs.map((item) => (
                  <button key={item.category} onClick={() => setCategory(item.category)} className={`shrink-0 rounded-full border px-4 py-2 text-[12px] ${category === item.category ? "border-[#687000] bg-[#687000] font-semibold text-white" : "border-[#ebe8e0] bg-white"}`}>{prettyCategory[item.category] ?? item.category}</button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-[12px] text-[#66645d]">
                <span>{loading ? "Loading products…" : `Showing ${start}–${end} of ${total.toLocaleString("en-IN")} products`}</span>
                {brand && <button onClick={() => setBrand("")} className="rounded-full bg-[#f1f1e9] px-2.5 py-1 text-[11px] text-[#5c6318]">Brand: {brand} ×</button>}
              </div>

              {error && <div className="mt-4 rounded-xl border border-[#e5d9c5] bg-[#fffaf0] p-4 text-[12px] text-[#6a604c]">{error}</div>}

              {loading ? (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 12 }).map((_, index) => <div key={index} className="h-[310px] animate-pulse rounded-xl border border-[#ece9e1] bg-[#faf9f5]" />)}
                </div>
              ) : products.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed border-[#d9d5ca] p-10 text-center">
                  <p className="text-sm font-semibold">No products found</p>
                  <p className="mt-1 text-xs text-[#77756e]">Try a different search, category, brand, or price range.</p>
                  <button onClick={resetFilters} className="mt-4 rounded-lg bg-[#687000] px-4 py-2 text-xs font-semibold text-white">Clear filters</button>
                </div>
              ) : (
                <div className={`mt-4 ${view === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-3"}`}>
                  {products.map((product) => {
                    const off = discount(product);
                    return (
                      <article key={product.id} onClick={() => setSelectedProduct(product)} className={`group relative cursor-pointer overflow-hidden rounded-xl border border-[#ece9e1] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(30,30,20,0.08)] ${view === "list" ? "flex gap-4 p-3" : "p-2.5 sm:p-3"}`}>
                        <div className={`${view === "list" ? "h-36 w-36 shrink-0" : "h-40 sm:h-44"} relative flex items-center justify-center rounded-lg bg-[#fafaf8]`}>
                          <ProductImage product={product} className="h-full w-full rounded-lg" />
                          <button onClick={() => toggleCompare(product.id)} aria-label="Compare product" className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border bg-white/90 ${compare.includes(product.id) ? "border-[#687000] text-[#687000]" : "border-[#e5e2da] text-[#77756e]"}`}><Scale className="h-3.5 w-3.5" /></button>
                          <button onClick={() => toggleWishlist(product.id)} aria-label="Wishlist product" className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border bg-white/90 ${wishlist.includes(product.id) ? "border-[#687000] text-[#687000]" : "border-[#e5e2da] text-[#77756e]"}`}><Heart className={`h-4 w-4 ${wishlist.includes(product.id) ? "fill-current" : ""}`} /></button>
                        </div>
                        <div className={`${view === "list" ? "py-1" : "pt-3"} min-w-0 flex-1`}>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[#8a887f]">{prettyCategory[product.category] ?? product.category}</p>
                          <h3 className="mt-1 line-clamp-2 text-[13px] font-semibold leading-5 text-[#282722]">{product.name}</h3>
                          <p className="mt-1 line-clamp-1 text-[11px] text-[#77756e]">{product.brand}</p>
                          <div className="mt-2 flex items-center gap-1 text-[11px]"><Star className="h-3.5 w-3.5 fill-[#f3a315] text-[#f3a315]" /><span className="font-semibold">{product.rating.toFixed(1)}</span><span className="text-[#8c897f]">({product.reviewCount.toLocaleString("en-IN")})</span></div>
                          <div className="mt-2 flex flex-wrap items-baseline gap-1.5"><span className="text-[15px] font-bold text-[#22221e]">{formatPrice(product.price)}</span>{product.mrp > product.price && <><span className="text-[10px] text-[#9a978c] line-through">{formatPrice(product.mrp)}</span>{off > 0 && <span className="text-[10px] font-semibold text-[#4d7a35]">{off}% off</span>}</>}</div>
                          {view === "list" && <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#77756e]">{product.description}</p>}
                          <button onClick={(event) => { event.stopPropagation(); addToCart(product); showToast(`${product.name} added to cart`); }} className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[#687000] bg-white text-[10px] font-semibold text-[#687000] transition hover:bg-[#687000] hover:text-white">
                            <ShoppingCart className="h-3.5 w-3.5" /> Add to cart
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-1.5">
                  <button disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[#e5e2da] p-2 disabled:opacity-35"><ChevronLeft className="h-4 w-4" /></button>
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, index) => {
                    const pageIndex = totalPages <= 7 ? index : Math.min(Math.max(page - 3 + index, 0), totalPages - 1);
                    return <button key={pageIndex} onClick={() => setPage(pageIndex)} className={`min-w-8 rounded-lg px-2 py-2 text-[11px] ${page === pageIndex ? "bg-[#687000] font-semibold text-white" : "border border-[#e5e2da]"}`}>{pageIndex + 1}</button>;
                  })}
                  <button disabled={page >= totalPages - 1} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#e5e2da] p-2 disabled:opacity-35"><ChevronRight className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="hidden border-t border-[#ece9e1] px-6 py-4 sm:flex sm:items-center sm:justify-center sm:gap-12 text-[11px] text-[#55534c]">
          <span>Secure Shopping</span><span>Easy Returns</span><span>1 Year Warranty</span><span>100% Authentic</span>
        </footer>
      </div>
      <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
