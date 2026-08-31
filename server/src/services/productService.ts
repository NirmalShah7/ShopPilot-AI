import { db } from "../db/client.js";
import { rowToProduct, type Product, type ProductRow } from "../types/product.js";
import type { IntentFilters, ClarifyOption } from "../types/chat.js";

export function getProductById(id: string): Product | null {
  const row = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as ProductRow | undefined;
  return row ? rowToProduct(row) : null;
}

export function listCategories(): string[] {
  const rows = db.prepare(`SELECT DISTINCT category FROM products`).all() as { category: string }[];
  return rows.map((r) => r.category);
}

export function getPriceRangeForCategory(category: string): { min: number; max: number } | null {
  const row = db
    .prepare(`SELECT MIN(price) as min, MAX(price) as max FROM products WHERE category = ?`)
    .get(category) as { min: number | null; max: number | null };

  if (row.min === null || row.max === null) return null;
  return { min: row.min, max: row.max };
}

export function buildBudgetOptions(category: string): ClarifyOption[] {
  const range = getPriceRangeForCategory(category);
  if (!range) return [];

  const { min, max } = range;
  const span = max - min;
  const low = Math.round(min + span * 0.33);
  const high = Math.round(min + span * 0.66);

  return [
    { label: `Under ₹${low.toLocaleString("en-IN")}`, value: `0-${low}` },
    { label: `₹${low.toLocaleString("en-IN")} - ₹${high.toLocaleString("en-IN")}`, value: `${low}-${high}` },
    { label: `Above ₹${high.toLocaleString("en-IN")}`, value: `${high}-999999999` },
  ];
}

function buildWhere(filters: IntentFilters) {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.category) {
    clauses.push("category = @category");
    params.category = filters.category;
  }
  if (filters.budgetMin !== null) {
    clauses.push("price >= @budgetMin");
    params.budgetMin = filters.budgetMin;
  }
  if (filters.budgetMax !== null) {
    clauses.push("price <= @budgetMax");
    params.budgetMax = filters.budgetMax;
  }
  if (filters.brand) {
    clauses.push("brand LIKE @brand");
    params.brand = `%${filters.brand}%`;
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

export function countMatchingProducts(filters: IntentFilters): number {
  const { where, params } = buildWhere(filters);
  const row = db.prepare(`SELECT COUNT(*) as total FROM products ${where}`).get(params) as { total: number };
  return row.total;
}

function inferredCategoryFromKeywords(filters: IntentFilters): string | null {
  const text = filters.keywords.join(" ").toLowerCase();
  if (/\b(?:laptop|laptops|notebook|macbook|chromebook|ultrabook)\b/.test(text)) return "laptop";
  if (/\b(?:phone|phones|mobile|mobiles|smartphone|smartphones|iphone|android)\b/.test(text)) return "smartphone";
  if (/\b(?:tablet|tablets|ipad)\b/.test(text)) return "tablet";
  if (/\b(?:watch|smartwatch|smart watches)\b/.test(text)) return "smartwatch";
  if (/\b(?:earbuds|earphones|headphones|headset|neckband|tws)\b/.test(text)) return "earbuds-headphones";
  if (/\b(?:speaker|speakers|soundbar)\b/.test(text)) return "speaker";
  if (/\b(?:tv|television|oled|qled)\b/.test(text)) return "television";
  if (/\b(?:camera|cameras|dslr|mirrorless|webcam)\b/.test(text)) return "camera";
  if (/\b(?:ssd|hdd|hard drive|storage|pendrive|pen drive|memory card|micro sd)\b/.test(text)) return "storage";
  return null;
}

function isAccessoryName(name: string): boolean {
  return /\b(?:backpack|back pack|laptop bag|laptop sleeve|sleeve|briefcase|case|cover|protector|tempered glass|stand|holder|mount|keyboard|mouse|cooling pad|cooling stand|cleaning kit|cleaner|stylus|hub|dock|adapter|charger|charging cable|usb cable|cable|power bank|strap|band|pouch|sticker|screen guard|tripod|remote control|lens protector|table|desk|controller|gamepad)\b/i.test(name);
}

function productRelevance(product: Product, keywords: string[]): number {
  const name = product.name.toLowerCase();
  const brand = product.brand.toLowerCase();
  const description = product.description.toLowerCase();
  const tags = product.tags.join(" ").toLowerCase();

  let score = product.rating * 3 + Math.log10(Math.max(product.reviewCount, 1));

  for (const keyword of keywords) {
    const k = keyword.toLowerCase().trim();
    if (!k) continue;
    if (name.includes(k)) score += 25;
    else if (brand.includes(k)) score += 15;
    else if (tags.includes(k)) score += 9;
    else if (description.includes(k)) score += 3;
  }

  return score;
}

export function searchProducts(filters: IntentFilters, limit = 6, offset = 0): Product[] {
  const effectiveCategory = filters.category ?? inferredCategoryFromKeywords(filters);
  const effectiveFilters: IntentFilters = effectiveCategory
    ? { ...filters, category: effectiveCategory }
    : filters;

  const { where, params } = buildWhere(effectiveFilters);
  const rows = db.prepare(`SELECT * FROM products ${where}`).all(params) as ProductRow[];
  let products = rows.map(rowToProduct);

  const keywords = effectiveFilters.keywords.map((k) => k.toLowerCase()).filter(Boolean);

  // Hard safety filter for device searches in case legacy/misclassified rows remain.
  if (effectiveCategory === "laptop") {
    products = products.filter((p) => !isAccessoryName(p.name));
  }
  if (effectiveCategory === "smartphone") {
    products = products.filter((p) => !isAccessoryName(p.name));
  }
  if (effectiveCategory === "tablet") {
    products = products.filter((p) => !isAccessoryName(p.name));
  }
  if (effectiveCategory === "smartwatch") {
    products = products.filter((p) => !isAccessoryName(p.name));
  }
  if (effectiveCategory === "earbuds-headphones") {
    products = products.filter((p) => !/\b(?:case|cover|stand|protector|cable|charger|adapter)\b/i.test(p.name));
  }

  products.sort((a, b) => {
    const scoreDiff = productRelevance(b, keywords) - productRelevance(a, keywords);
    if (scoreDiff !== 0) return scoreDiff;
    return b.rating - a.rating || b.reviewCount - a.reviewCount;
  });

  return products.slice(offset, offset + limit);
}

export function findProductsByText(query: string, limit = 8): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const like = `%${q}%`;
  const rows = db.prepare(`
    SELECT * FROM products
    WHERE LOWER(name) LIKE ?
       OR LOWER(brand) LIKE ?
       OR LOWER(category) LIKE ?
       OR LOWER(description) LIKE ?
       OR LOWER(tags_json) LIKE ?
    ORDER BY rating DESC, review_count DESC
    LIMIT ?
  `).all(like, like, like, like, like, limit) as ProductRow[];
  return rows.map(rowToProduct);
}

export function findProductsForComparison(message: string, limitPerTerm = 2): Product[] {
  const all = db.prepare(`SELECT * FROM products`).all() as ProductRow[];
  const products = all.map(rowToProduct);
  const text = message.toLowerCase();
  const matches = products.filter((p) =>
    text.includes(p.brand.toLowerCase()) ||
    text.includes(p.name.toLowerCase())
  );
  const unique = new Map<string, Product>();
  for (const p of matches) {
    if (!unique.has(p.brand.toLowerCase())) unique.set(p.brand.toLowerCase(), p);
  }
  if (unique.size >= 2) return [...unique.values()].slice(0, 4);

  const tokens = text
    .split(/\s+(?:and|vs|versus|with|against|between)\s+|[,/]+/i)
    .map((x) => x.trim())
    .filter(Boolean);
  const candidates: Product[] = [];
  for (const token of tokens) {
    const found = findProductsByText(token, limitPerTerm);
    if (found[0] && !candidates.some((p) => p.id === found[0].id)) candidates.push(found[0]);
  }
  return candidates.slice(0, 4);
}


const complementMap: Record<string, string[]> = {
  laptop: ["computer-accessories", "storage", "earbuds-headphones"],
  smartphone: ["mobile-accessories", "charger-adapter", "earbuds-headphones", "storage", "smartwatch"],
  tablet: ["mobile-accessories", "computer-accessories", "charger-adapter", "earbuds-headphones", "storage"],
  camera: ["storage", "computer-accessories", "mobile-accessories"],
  television: ["speaker", "computer-accessories"],
  "earbuds-headphones": ["charger-adapter", "mobile-accessories", "smartphone", "smartwatch"],
  speaker: ["television", "smartphone", "tablet"],
  smartwatch: ["smartphone", "charger-adapter", "mobile-accessories", "earbuds-headphones"],
  storage: ["laptop", "smartphone", "camera", "computer-accessories"],
  "computer-accessories": ["laptop", "storage", "earbuds-headphones"],
  "mobile-accessories": ["smartphone", "charger-adapter", "earbuds-headphones", "smartwatch"],
  "charger-adapter": ["smartphone", "laptop", "tablet", "earbuds-headphones", "smartwatch"],
  "personal-care-electronics": ["smartphone", "earbuds-headphones"],
  "other-electronics": ["computer-accessories", "charger-adapter", "storage", "earbuds-headphones"],
};

const recommendationGroups: Record<string, Array<{ key: string; category: string[]; pattern: RegExp }>> = {
  laptop: [
    { key: "laptop-bag", category: ["computer-accessories"], pattern: /\b(?:laptop\s*(?:bag|backpack)|backpack|briefcase|sleeve)\b/i },
    { key: "mouse", category: ["computer-accessories"], pattern: /\b(?:mouse|mice)\b/i },
    { key: "keyboard", category: ["computer-accessories"], pattern: /\bkeyboard\b/i },
    { key: "stand", category: ["computer-accessories"], pattern: /\b(?:laptop\s*stand|cooling\s*pad|cooling\s*stand)\b/i },
    { key: "storage", category: ["storage"], pattern: /\b(?:ssd|hdd|hard\s*drive|memory\s*card|pendrive|pen\s*drive|usb\s*drive|storage)\b/i },
    { key: "audio", category: ["earbuds-headphones"], pattern: /\b(?:earbuds|earphones|headphones|headset|neckband)\b/i },
  ],
  smartphone: [
    { key: "case", category: ["mobile-accessories"], pattern: /\b(?:case|cover|screen\s*protector|tempered\s*glass|screen\s*guard)\b/i },
    { key: "charger", category: ["charger-adapter"], pattern: /\b(?:charger|charging|adapter|cable|power\s*adapter)\b/i },
    { key: "power-bank", category: ["charger-adapter"], pattern: /\b(?:power\s*bank|powerbank)\b/i },
    { key: "audio", category: ["earbuds-headphones"], pattern: /\b(?:earbuds|earphones|headphones|headset|neckband)\b/i },
    { key: "storage", category: ["storage"], pattern: /\b(?:memory\s*card|micro\s*sd|sd\s*card|pendrive|pen\s*drive|storage)\b/i },
    { key: "watch", category: ["smartwatch"], pattern: /\b(?:smartwatch|smart\s*watch|watch)\b/i },
  ],
  tablet: [
    { key: "cover", category: ["mobile-accessories"], pattern: /\b(?:tablet\s*case|cover|screen\s*protector|tempered\s*glass)\b/i },
    { key: "keyboard", category: ["computer-accessories", "mobile-accessories"], pattern: /\bkeyboard\b/i },
    { key: "stylus", category: ["mobile-accessories", "computer-accessories"], pattern: /\bstylus\b/i },
    { key: "charger", category: ["charger-adapter"], pattern: /\b(?:charger|charging|adapter|cable)\b/i },
    { key: "audio", category: ["earbuds-headphones"], pattern: /\b(?:earbuds|earphones|headphones|headset|neckband)\b/i },
    { key: "storage", category: ["storage"], pattern: /\b(?:memory\s*card|micro\s*sd|sd\s*card|storage)\b/i },
  ],
  camera: [
    { key: "storage", category: ["storage"], pattern: /\b(?:memory\s*card|sd\s*card|micro\s*sd|storage)\b/i },
    { key: "camera-bag", category: ["computer-accessories", "mobile-accessories"], pattern: /\b(?:camera\s*bag|camera\s*backpack|camera\s*case|sling)\b/i },
    { key: "tripod", category: ["computer-accessories", "other-electronics"], pattern: /\btripod\b/i },
    { key: "battery", category: ["charger-adapter"], pattern: /\b(?:battery|charger|charging)\b/i },
    { key: "audio", category: ["earbuds-headphones"], pattern: /\b(?:microphone|mic|headset)\b/i },
  ],
  television: [
    { key: "sound", category: ["speaker"], pattern: /\b(?:soundbar|speaker|home\s*theatre|home\s*theater)\b/i },
    { key: "remote", category: ["other-electronics", "computer-accessories"], pattern: /\bremote\b/i },
    { key: "streaming", category: ["other-electronics", "computer-accessories"], pattern: /\b(?:streaming|fire\s*tv|chromecast|media\s*player)\b/i },
    { key: "power", category: ["charger-adapter", "other-electronics"], pattern: /\b(?:surge|power\s*strip|extension)\b/i },
  ],
  "earbuds-headphones": [
    { key: "charger", category: ["charger-adapter"], pattern: /\b(?:charger|charging|adapter|cable)\b/i },
    { key: "case", category: ["mobile-accessories"], pattern: /\b(?:case|cover|pouch)\b/i },
    { key: "phone", category: ["smartphone"], pattern: /\b(?:phone|smartphone|iphone|galaxy|oneplus|pixel)\b/i },
    { key: "watch", category: ["smartwatch"], pattern: /\b(?:smartwatch|smart\s*watch)\b/i },
  ],
  smartwatch: [
    { key: "phone", category: ["smartphone"], pattern: /\b(?:phone|smartphone|iphone|galaxy|oneplus|pixel)\b/i },
    { key: "charger", category: ["charger-adapter"], pattern: /\b(?:charger|charging|adapter|cable)\b/i },
    { key: "band", category: ["mobile-accessories"], pattern: /\b(?:watch\s*band|strap|watch\s*strap)\b/i },
    { key: "audio", category: ["earbuds-headphones"], pattern: /\b(?:earbuds|earphones|headphones|headset)\b/i },
  ],
  storage: [
    { key: "computer", category: ["laptop", "computer-accessories"], pattern: /\b(?:laptop|notebook|macbook|computer|keyboard|mouse)\b/i },
    { key: "phone", category: ["smartphone", "mobile-accessories"], pattern: /\b(?:phone|smartphone|iphone|galaxy|oneplus|pixel)\b/i },
    { key: "camera", category: ["camera"], pattern: /\bcamera\b/i },
    { key: "bag", category: ["computer-accessories"], pattern: /\b(?:bag|backpack|sleeve|pouch)\b/i },
  ],
};

function getRecommendationGroups(cartProducts: Product[]) {
  const groupMap = new Map<string, { key: string; category: string[]; pattern: RegExp }>();
  for (const product of cartProducts) {
    for (const group of recommendationGroups[product.category] ?? []) {
      if (!groupMap.has(group.key)) groupMap.set(group.key, group);
    }
  }
  return [...groupMap.values()];
}

export function getCartRecommendations(productIds: string[], limit = 6): Product[] {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (!ids.length) return [];

  const placeholders = ids.map(() => "?").join(",");
  const baseRows = db
    .prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
    .all(...ids) as ProductRow[];
  const cartProducts = baseRows.map(rowToProduct);
  if (!cartProducts.length) return [];

  const cartCategories = new Set(cartProducts.map((p) => p.category));
  const desiredCategories = [...new Set(cartProducts.flatMap((p) => complementMap[p.category] ?? []))]
    .filter((category) => !cartCategories.has(category));

  const groups = getRecommendationGroups(cartProducts);
  const remainingRows = db
    .prepare(`SELECT * FROM products WHERE id NOT IN (${placeholders})`)
    .all(...ids) as ProductRow[];
  const candidates = remainingRows.map(rowToProduct).filter((product) => {
    if (desiredCategories.includes(product.category)) return true;
    const name = product.name.toLowerCase();
    return groups.some((group) => group.category.includes(product.category) && group.pattern.test(name));
  });

  const scoreCandidate = (product: Product) => {
    const name = product.name.toLowerCase();
    let score = product.rating * 3 + Math.log10(Math.max(product.reviewCount, 1));
    const groupHits = groups.filter((group) => group.category.includes(product.category) && group.pattern.test(name));
    if (groupHits.length) score += 50;
    if (desiredCategories.includes(product.category)) score += 20;
    if (cartProducts.some((cart) => cart.brand && product.brand.toLowerCase() === cart.brand.toLowerCase())) score += 3;
    return score;
  };

  candidates.sort((a, b) => scoreCandidate(b) - scoreCandidate(a) || b.reviewCount - a.reviewCount);

  // Pick at least one strong product for each useful companion type first.
  const selected: Product[] = [];
  const selectedIds = new Set<string>();
  const coveredGroups = new Set<string>();

  for (const group of groups) {
    const match = candidates.find((product) =>
      !selectedIds.has(product.id) &&
      group.category.includes(product.category) &&
      group.pattern.test(product.name),
    );
    if (!match) continue;
    selected.push(match);
    selectedIds.add(match.id);
    coveredGroups.add(group.key);
    if (selected.length >= limit) break;
  }

  // Fill remaining slots with the strongest compatible products.
  if (selected.length < limit) {
    for (const product of candidates) {
      if (selectedIds.has(product.id)) continue;
      selected.push(product);
      selectedIds.add(product.id);
      if (selected.length >= limit) break;
    }
  }

  return selected;
}

