import type { CartItem } from "@/store/cartStore";
import { useOrderStore } from "@/store/orderStore";
import { API_BASE } from "@/lib/api";
let razorpayPromise: Promise<void> | null = null;

declare global { interface Window { Razorpay?: new (options: any) => any; } }

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  if (razorpayPromise) return razorpayPromise;
  razorpayPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Unable to load Razorpay Checkout.")); document.body.appendChild(script);
  });
  return razorpayPromise;
}

export async function startPayment(items: CartItem[], onDone?: () => void) {
  if (!items.length) throw new Error("Your cart is empty.");
  await loadRazorpay();
  const res = await fetch(`${API_BASE}/api/payment/create-order`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items.map((i) => ({ id: i.product.id, quantity: i.quantity })) }) });
  const order = await res.json(); if (!res.ok) throw new Error(order.error || "Unable to create payment order.");
  await new Promise<void>((resolve, reject) => {
    const checkout = new window.Razorpay!({
      key: order.keyId, order_id: order.id, amount: order.amount, currency: order.currency, name: "Shopping Agent", description: "Electronics purchase",
      prefill: { name: "Shopping Agent Customer" }, theme: { color: "#687000" },
      handler: async (response: any) => {
        try {
          const verifyRes = await fetch(`${API_BASE}/api/payment/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(response) });
          const verified = await verifyRes.json(); if (!verifyRes.ok || !verified.verified) throw new Error(verified.error || "Payment verification failed.");
          useOrderStore.getState().addOrder({ id: `ORD-${Date.now()}`, razorpayOrderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, createdAt: Date.now(), amount: order.amount / 100, items: items.map((i) => ({ product: i.product, quantity: i.quantity })), status: "paid" });
          onDone?.(); resolve();
        } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => reject(new Error("Payment window was closed.")) },
    });
    checkout.on("payment.failed", (response: any) => reject(new Error(response?.error?.description || "Payment failed. Please try again.")));
    checkout.open();
  });
}
