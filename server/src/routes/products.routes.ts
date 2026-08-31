import { Router } from "express";
import { db } from "../db/client.js";
import { rowToProduct, type ProductRow } from "../types/product.js";
import { getCartRecommendations } from "../services/productService.js";

export const productsRouter = Router();

productsRouter.get("/meta", (_req, res) => {
  const categories = db
    .prepare(`SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC`)
    .all() as Array<{ category: string; count: number }>;

  const brands = db
    .prepare(`SELECT brand, COUNT(*) as count FROM products GROUP BY brand ORDER BY count DESC LIMIT 40`)
    .all() as Array<{ brand: string; count: number }>;

  const range = db
    .prepare(`SELECT MIN(price) as minPrice, MAX(price) as maxPrice, COUNT(*) as total FROM products`)
    .get() as { minPrice: number; maxPrice: number; total: number };

  res.json({ categories, brands, ...range });
});


productsRouter.post("/recommendations", (req, res) => {
  try {
    const productIds = Array.isArray(req.body?.productIds)
      ? req.body.productIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];
    const limit = Math.min(Math.max(Number(req.body?.limit) || 6, 1), 12);

    if (!productIds.length) {
      return res.json({ items: [] });
    }

    return res.json({
      items: getCartRecommendations(productIds, limit),
    });
  } catch (error) {
    console.error("cart recommendations error:", error);
    return res.status(500).json({ error: "Unable to load recommendations." });
  }
});

productsRouter.get("/", (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const category = String(req.query.category ?? "").trim();
  const brand = String(req.query.brand ?? "").trim();
  const minPrice = Number.isFinite(Number(req.query.minPrice)) ? Number(req.query.minPrice) : 0;
  const maxPrice = Number.isFinite(Number(req.query.maxPrice)) ? Number(req.query.maxPrice) : Number.MAX_SAFE_INTEGER;
  const sort = String(req.query.sort ?? "featured");
  const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 60);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const where: string[] = ["price BETWEEN ? AND ?"];
  const params: Array<string | number> = [minPrice, maxPrice];

  if (q) {
    where.push(`(LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(category) LIKE ? OR LOWER(tags_json) LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }
  if (category) {
    where.push(`category = ?`);
    params.push(category);
  }
  if (brand) {
    where.push(`brand = ?`);
    params.push(brand);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderBy =
    sort === "price-low" ? "price ASC" :
    sort === "price-high" ? "price DESC" :
    sort === "rating" ? "rating DESC, review_count DESC" :
    sort === "discount" ? "CASE WHEN mrp > 0 THEN (mrp - price) * 1.0 / mrp ELSE 0 END DESC" :
    sort === "name" ? "name COLLATE NOCASE ASC" :
    "rating DESC, review_count DESC";

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM products ${whereSql}`).get(...params) as { total: number };
  const rows = db
    .prepare(`SELECT * FROM products ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as ProductRow[];

  res.json({
    items: rows.map(rowToProduct),
    total: countRow.total,
    limit,
    offset,
  });
});

productsRouter.get("/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM products WHERE id = ?`).get(req.params.id) as
    | ProductRow
    | undefined;

  if (!row) return res.status(404).json({ error: "Product not found." });
  res.json(rowToProduct(row));
});
