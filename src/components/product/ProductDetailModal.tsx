import { useMemo, useState } from "react";
import { Heart, Minus, Plus, Share2, ShoppingCart, X, Zap, Star } from "lucide-react";
import type { Product } from "@/types/chat";
import { useCartStore } from "@/store/cartStore";
import { useToastStore } from "@/store/toastStore";
import { startPayment } from "@/lib/payment";

const formatPrice = (value: number) => `₹${value.toLocaleString("en-IN")}`;

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  sidePanel?: boolean;
}

export function ProductDetailModal({ product, onClose, sidePanel = false }: ProductDetailModalProps) {
  const addToCart = useCartStore((state) => state.addToCart);
  const showToast = useToastStore((state) => state.show);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [added, setAdded] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const specs = useMemo(() => Object.entries(product?.specs ?? {}).slice(0, 8), [product]);
  if (!product) return null;

  const discount = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  const handleAdd = () => {
    addToCart(product, quantity);
    showToast(`${product.name} added to cart`);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-3 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className={sidePanel
          ? "relative ml-auto flex h-full max-h-[100vh] w-full max-w-[520px] flex-col overflow-y-auto border-l border-[#e5e2d9] bg-[#fbfaf6] shadow-[-18px_0_50px_rgba(25,25,15,0.16)]"
          : "relative flex max-h-[94vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[22px] border border-[#e5e2d9] bg-[#fbfaf6] shadow-[0_24px_80px_rgba(25,25,15,0.22)] lg:flex-row"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e1d8] bg-white/90 text-[#57564f] shadow-sm" aria-label="Close product details">
          <X className="h-4 w-4" />
        </button>

        <div className={sidePanel ? "flex h-[330px] shrink-0 flex-col border-b border-[#e9e6de] bg-white p-5" : "flex min-h-[360px] flex-1 flex-col border-b border-[#e9e6de] bg-white p-5 lg:border-b-0 lg:border-r lg:p-8"}>
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-[18px] bg-[#faf9f5] p-5">
            <img src={product.imageUrl} alt={product.name} className="max-h-[280px] w-[68%] object-contain mix-blend-multiply" />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <div className="h-16 w-16 shrink-0 rounded-xl border-2 border-[#687000] bg-white p-1.5">
              <img src={product.imageUrl} alt="" className="h-full w-full object-contain mix-blend-multiply" />
            </div>
            {product.tags.slice(0, 3).map((tag) => (
              <div key={tag} className="flex h-16 min-w-16 items-center justify-center rounded-xl border border-[#ece9e1] bg-white px-2 text-[9px] font-medium text-[#77756e]">
                {tag}
              </div>
            ))}
          </div>
        </div>

        <div className={sidePanel ? "w-full p-6" : "w-full overflow-y-auto p-6 lg:w-[480px] lg:p-7"}>
          <p className="text-[12px] font-medium text-[#8a887f]">{product.brand}</p>
          <h2 className="mt-1.5 pr-8 text-[22px] font-semibold leading-7 tracking-[-0.02em] text-[#20201c]">{product.name}</h2>
          <div className="mt-3 flex items-center gap-2 text-[12px]">
            <Star className="h-4 w-4 fill-[#687000] text-[#687000]" />
            <span className="font-semibold">{product.rating.toFixed(1)}</span>
            <span className="text-[#858278]">({product.reviewCount.toLocaleString("en-IN")} ratings)</span>
            {discount >= 25 && <span className="rounded-full bg-[#efefe4] px-2 py-1 font-semibold text-[#687000]">Best value</span>}
          </div>

          <div className="mt-5 border-b border-[#ebe8e0] pb-5">
            <div className="flex items-baseline gap-2">
              <span className="text-[25px] font-bold text-[#191916]">{formatPrice(product.price)}</span>
              {product.mrp > product.price && <span className="text-[12px] text-[#9b988e] line-through">{formatPrice(product.mrp)}</span>}
              {discount > 0 && <span className="text-[12px] font-semibold text-[#4f7839]">{discount}% off</span>}
            </div>
            <p className="mt-1 text-[11px] text-[#77756e]">Inclusive of all taxes • Free delivery</p>
          </div>

          <div className="mt-5">
            <h3 className="text-[13px] font-semibold">Description</h3>
            <p className="mt-2 text-[12px] leading-5 text-[#69675f]">{product.description}</p>
          </div>

          {specs.length > 0 && (
            <div className="mt-5">
              <h3 className="text-[13px] font-semibold">Key features</h3>
              <div className="mt-2 rounded-xl bg-[#f3f2ec] p-3">
                {specs.map(([key, value]) => (
                  <div key={key} className="flex gap-3 border-b border-[#e4e2da] py-2 last:border-0">
                    <span className="w-[115px] shrink-0 text-[10px] font-medium capitalize text-[#77756e]">{key.replace(/([A-Z])/g, " $1")}</span>
                    <span className="text-[11px] text-[#393832]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between rounded-xl border border-[#e7e4dc] bg-white px-3 py-2.5">
            <span className="text-[11px] font-medium text-[#69675f]">Quantity</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-[#dedbd2]"><Minus className="h-3 w-3" /></button>
              <span className="w-5 text-center text-[12px] font-semibold">{quantity}</span>
              <button onClick={() => setQuantity((value) => value + 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-[#dedbd2]"><Plus className="h-3 w-3" /></button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={handleAdd} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#687000] bg-white text-[12px] font-semibold text-[#687000]">
              <ShoppingCart className="h-4 w-4" /> {added ? "Added to cart" : "Add to cart"}
            </button>
            <button onClick={async () => { setPaymentError(""); setPaying(true); try { await startPayment([{ product, quantity }]); } catch (e) { setPaymentError(e instanceof Error ? e.message : "Payment failed."); } finally { setPaying(false); } }} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#687000] text-[12px] font-semibold text-white disabled:opacity-60" disabled={paying}>
              <Zap className="h-4 w-4" /> {paying ? "Opening..." : "Buy now"}
            </button>
          </div>

          {paymentError && <p className="mt-2 text-center text-[11px] text-red-600">{paymentError}</p>}

          <div className="mt-4 flex items-center justify-center gap-6 text-[11px] text-[#66645d]">
            <button onClick={() => setWishlisted((value) => !value)} className="flex items-center gap-1.5 font-medium">
              <Heart className={`h-4 w-4 ${wishlisted ? "fill-[#687000] text-[#687000]" : ""}`} /> {wishlisted ? "Wishlisted" : "Add to wishlist"}
            </button>
            <button className="flex items-center gap-1.5"><Share2 className="h-4 w-4" /> Share</button>
          </div>
        </div>
      </div>
    </div>
  );
}
