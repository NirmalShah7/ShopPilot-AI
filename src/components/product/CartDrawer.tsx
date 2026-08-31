import { Minus, Plus, ShoppingCart, Trash2, X, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { startPayment } from "@/lib/payment";
import { getCartRecommendations } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { Product } from "@/types/chat";
import { useEffect, useMemo, useState } from "react";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const showToast = useToastStore((state) => state.show);

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  const productIds = useMemo(
    () => items.map((item) => item.product.id),
    [items],
  );

  useEffect(() => {
    if (!open || productIds.length === 0) {
      setRecommendations([]);
      return;
    }

    let cancelled = false;
    setLoadingRecommendations(true);

    getCartRecommendations(productIds, 6)
      .then((products) => {
        if (!cancelled) setRecommendations(products);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("cart recommendations error:", error);
          setRecommendations([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRecommendations(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, productIds]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/25 backdrop-blur-[1px]"
      onMouseDown={onClose}
    >
      <aside
        className="ml-auto flex h-full w-full max-w-[430px] flex-col border-l border-[#e5e2d9] bg-[#fbfaf6] shadow-[-18px_0_50px_rgba(25,25,15,0.16)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e9e6de] px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold">Your cart</h2>
            <p className="mt-0.5 text-[10px] text-[#77756e]">
              {items.reduce((sum, item) => sum + item.quantity, 0)} item(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e4e1d8] bg-white"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-[#77756e]">
              <ShoppingCart className="h-9 w-9" />
              <p className="mt-3 text-[13px] font-semibold text-[#34332e]">
                Your cart is empty
              </p>
              <p className="mt-1 text-[11px]">
                Add products from Browse or the shopping agent.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="rounded-xl border border-[#e7e4dc] bg-white p-3"
                >
                  <div className="flex gap-3">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-[#faf9f5] p-2">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[11px] font-semibold leading-4">
                        {product.name}
                      </p>
                      <p className="mt-1 text-[12px] font-bold">
                        ₹{product.price.toLocaleString("en-IN")}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-[#dedbd2]"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-4 text-center text-[11px] font-semibold">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-[#dedbd2]"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="ml-auto text-[#8a887f] hover:text-[#687000]"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(loadingRecommendations || recommendations.length > 0) && (
                <section className="pt-2">
                  <div className="mb-2 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-[12px] font-semibold text-[#34332e]">
                        Recommended with your cart
                      </h3>
                      <p className="mt-0.5 text-[9px] text-[#8a887f]">
                        Useful add-ons that pair well with what you're buying.
                      </p>
                    </div>
                    {loadingRecommendations && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#687000]" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {recommendations.map((product) => (
                      <div
                        key={product.id}
                        className="rounded-xl border border-[#e7e4dc] bg-white p-2.5"
                      >
                        <div className="flex h-24 items-center justify-center rounded-lg bg-[#faf9f5] p-2">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-contain mix-blend-multiply"
                            loading="lazy"
                          />
                        </div>
                        <p className="mt-2 line-clamp-2 text-[10px] font-semibold leading-4 text-[#34332e]">
                          {product.name}
                        </p>
                        <p className="mt-1 text-[11px] font-bold">
                          ₹{product.price.toLocaleString("en-IN")}
                        </p>
                        <button
                          onClick={() => {
                            addToCart(product);
                            showToast(`${product.name} added to cart`);
                          }}
                          className="mt-2 flex h-7 w-full items-center justify-center gap-1 rounded-lg border border-[#687000] text-[9px] font-semibold text-[#687000] transition hover:bg-[#687000] hover:text-white"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#e9e6de] bg-white p-4">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#77756e]">Subtotal</span>
              <span className="text-[16px] font-bold">
                ₹{total.toLocaleString("en-IN")}
              </span>
            </div>
            <button
              disabled={paying}
              onClick={async () => {
                setPaymentError("");
                setPaying(true);
                try {
                  await startPayment(items, () => {
                    useCartStore.getState().clearCart();
                    onClose();
                  });
                } catch (e) {
                  setPaymentError(
                    e instanceof Error ? e.message : "Payment failed.",
                  );
                } finally {
                  setPaying(false);
                }
              }}
              className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#687000] text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {paying ? "Opening payment..." : "Pay securely"}
            </button>
            {paymentError && (
              <p className="mt-2 text-[11px] text-red-600">{paymentError}</p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
