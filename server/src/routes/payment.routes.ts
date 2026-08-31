import { Router } from "express";
import crypto from "node:crypto";
import { db } from "../db/client.js";

export const paymentRouter = Router();

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

type RazorpayErrorResponse = {
  error?: {
    code?: string;
    description?: string;
    field?: string;
    source?: string;
    step?: string;
    reason?: string;
  };
};

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured on the server.");
  }

  return { keyId, keySecret };
}

function basicAuth(keyId: string, keySecret: string): string {
  return Buffer.from(`${keyId}:${keySecret}`, "utf8").toString("base64");
}

async function createRazorpayOrder(
  amount: number,
  receipt: string,
  keyId: string,
  keySecret: string,
): Promise<RazorpayOrderResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${basicAuth(keyId, keySecret)}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: { source: "shopping-agent" },
      }),
    });

    const raw = await response.text();
    let data: RazorpayOrderResponse | RazorpayErrorResponse | null = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorData = data as RazorpayErrorResponse | null;
      const description = errorData?.error?.description || `Razorpay returned HTTP ${response.status}.`;
      const code = errorData?.error?.code ? ` (${errorData.error.code})` : "";
      throw new Error(`Razorpay order creation failed${code}: ${description}`);
    }

    if (!data || !("id" in data) || !data.id) {
      throw new Error("Razorpay returned an invalid order response.");
    }

    return data as RazorpayOrderResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Razorpay did not respond within 15 seconds. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

paymentRouter.get("/health", (_req, res) => {
  try {
    const { keyId, keySecret } = credentials();
    res.json({
      status: "configured",
      mode: keyId.startsWith("rzp_test_") ? "test" : "live",
      keyIdPresent: Boolean(keyId),
      secretPresent: Boolean(keySecret),
    });
  } catch (error) {
    res.status(503).json({
      status: "not_configured",
      error: error instanceof Error ? error.message : "Razorpay credentials are not configured.",
    });
  }
});

paymentRouter.post("/create-order", async (req, res) => {
  try {
    const { keyId, keySecret } = credentials();
    const input = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!input.length) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    let total = 0;

    for (const item of input) {
      const id = String(item?.id ?? "");
      const row = db
        .prepare("SELECT price FROM products WHERE id = ?")
        .get(id) as { price: number } | undefined;

      if (!row) {
        return res.status(400).json({ error: `Product ${id} was not found.` });
      }

      const quantity = Math.min(
        Math.max(Number(item?.quantity) || 1, 1),
        99,
      );

      total += row.price * quantity;
    }

    const amount = Math.round(total * 100);

    if (amount < 1000) {
      return res.status(400).json({
        error: "The payment amount must be at least ₹10.",
      });
    }

    // Razorpay's order API expects the amount in the smallest currency unit.
    const order = await createRazorpayOrder(
      amount,
      `shop_${Date.now()}`,
      keyId,
      keySecret,
    );

    return res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    console.error("create payment order error:", error);
    return res.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to create payment order.",
    });
  }
});

paymentRouter.post("/verify", (req, res) => {
  try {
    const { keySecret } = credentials();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body ?? {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        verified: false,
        error: "Incomplete payment response.",
      });
    }

    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const actual = String(razorpay_signature);

    const verified =
      expected.length === actual.length &&
      crypto.timingSafeEqual(
        Buffer.from(expected, "utf8"),
        Buffer.from(actual, "utf8"),
      );

    if (!verified) {
      return res.status(400).json({
        verified: false,
        error: "Payment signature verification failed.",
      });
    }

    return res.json({ verified: true });
  } catch (error) {
    console.error("payment verification error:", error);
    return res.status(500).json({
      verified: false,
      error: "Unable to verify payment.",
    });
  }
});
