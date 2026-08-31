import "dotenv/config";
import express from "express";
import cors from "cors";
import { chatRouter } from "./routes/chat.routes.js";
import { productsRouter } from "./routes/products.routes.js";
import { paymentRouter } from "./routes/payment.routes.js";
import { db } from "./db/client.js";

// Always synchronize the bundled seed catalog on startup. The seed step
// also normalizes product categories, so an existing SQLite database cannot
// retain stale categories such as laptops under `storage`.
await import("./db/seed.js");

const finalProductCount = (db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number }).count;
console.log(`Product catalog ready: ${finalProductCount} products.`);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/chat", chatRouter);
app.use("/api/products", productsRouter);
app.use("/api/payment", paymentRouter);

app.listen(PORT, () => {
  console.log(`Shopping agent server listening on port ${PORT}.`);
});
