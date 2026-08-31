import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./client.js";
import type { Product } from "../types/product.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "../data/products.seed.json");
const products: Product[] = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

function deriveSpecs(product: Product): Record<string, string> {
  const text = `${product.name} ${product.description}`;
  const specs: Record<string, string> = { ...product.specs };

  const capture = (key: string, pattern: RegExp) => {
    if (specs[key]) return;
    const match = text.match(pattern);
    if (match) specs[key] = match[0].trim();
  };

  capture("RAM", /\b\d+\s*GB\s*(?:RAM|memory)\b/i);
  capture("Storage", /\b\d+\s*(?:GB|TB)\s*(?:SSD|HDD|ROM|storage|eMMC)\b/i);
  capture("Display", /\b\d+(?:\.\d+)?[- ]?(?:inch|inches|")\b[^|,]*/i);
  capture("Processor", /\b(?:Intel|AMD|Apple|Qualcomm|MediaTek|Snapdragon|Ryzen|Core\s*i[3579])[^|,]*/i);
  capture("Battery", /\b\d{3,6}\s*mAh\b/i);
  capture("Camera", /\b\d+\s*MP\b[^|,]*/i);
  capture("Operating System", /\b(?:Android\s*\d+(?:\.\d+)?|Windows\s*\d+|iOS\s*\d+|macOS)\b/i);
  capture("Connectivity", /\b(?:5G|4G|Wi-?Fi|Bluetooth\s*[0-9.]*)\b/i);

  return specs;
}

/**
 * Normalize noisy source categories using strong product-type signals.
 * Accessories are checked FIRST so phrases like "laptop backpack" or
 * "compatible with iPhone" never turn the accessory into the device itself.
 */
function normalizeCategory(product: Product): string {
  const n = product.name.toLowerCase().replace(/\s+/g, " ").trim();
  const original = product.category.toLowerCase().trim();

  // Accessory signals are intentionally strong and are evaluated before device signals.
  const accessorySignal = /\b(?:backpack(?:s)?|back[ -]?pack(?:s)?|laptop bag(?:s)?|laptop sleeve(?:s)?|bag(?:s)?|briefcase(?:s)?|sleeve(?:s)?|case(?:s)?|cover(?:s)?|screen protector(?:s)?|tempered glass|protector(?:s)?|stand(?:s)?|holder(?:s)?|mount(?:s)?|keyboard(?:s)?|mouse(?:s)?|mice|webcam cover(?:s)?|cooling pad(?:s)?|cooling stand(?:s)?|cleaning kit(?:s)?|cleaner(?:s)?|stylus(?:es)?|stylus pen(?:s)?|pen tablet(?:s)?|hub(?:s)?|dock(?:s)?|adapter(?:s)?|charger(?:s)?|charging cable(?:s)?|usb cable(?:s)?|type[- ]?c cable(?:s)?|lightning cable(?:s)?|cable(?:s)?|power bank(?:s)?|battery replacement(?:s)?|laptop battery(?:ies)?|memory module(?:s)?|laptop memory|laptop ram|ram memory|sodimm|mouse pad(?:s)?|desk mat(?:s)?|skin(?:s)?|strap(?:s)?|watch band(?:s)?|pouch(?:es)?|organizer(?:s)?|tripod(?:s)?|tripod mount(?:s)?|remote control(?:s)?|lens protector(?:s)?|gimbal(?:s)?|microphone(?:s)?|audio interface(?:s)?|replacement screen(?:s)?|replacement keyboard(?:s)?|table(?:s)?|desk(?:s)?|controller(?:s)?|gamepad(?:s)?|gaming pad(?:s)?|lamp(?:s)?|reading light(?:s)?|monitor arm(?:s)?|monitor(?:s)?|display(?:s)?|sticker(?:s)?|thermal paste|printer(?:s)?|toner(?:s)?|ink cartridge(?:s)?|socket(?:s)?|timer(?:s)?|plug(?:s)?|ring light(?:s)?|web camera(?:s)?|camera mount(?:s)?)\b/i;

  const mobileAccessory = /\b(?:phone|smartphone|iphone|ipad|android|samsung|galaxy|redmi|oneplus|pixel|realme|oppo|vivo|mi|moto)\b/i.test(n)
    && /\b(?:case|cover|protector|tempered glass|screen guard|screen protector|cable|charger|adapter|power bank|holder|mount|stand|grip|skin|pouch|strap|lens|gimbal|microphone|audio interface|repair|charging station)\b/i.test(n);

  const computerAccessory = /\b(?:laptop|macbook|notebook|chromebook|thinkpad|ideapad|vivobook|inspiron|vostro|pavilion|aspire|latitude|zenbook|surface|desktop|pc|computer)\b/i.test(n)
    && accessorySignal.test(n);

  if (mobileAccessory) return "mobile-accessories";
  if (computerAccessory) return "computer-accessories";

  // Device mentions used only as compatibility text must not turn an accessory into a device.
  const compatibilityOnly = /\b(?:compatible with|fits|for use with|works with|suitable for|designed for|for)\s+(?:apple\s*)?(?:iphone|ipad|android|samsung|galaxy|redmi|oneplus|pixel|macbook|laptop|notebook)\b/i.test(n);

  const television = /\b(?:television|smart\s*tv|led\s*tv|oled\s*tv|qled\s*tv|\btv\b)\b/i.test(n);
  const camera = /\b(?:dslr|mirrorless|action camera|security camera|cctv|webcam|web camera|digital camera)\b/i.test(n);
  const storage = /\b(?:ssd|solid state drive|hard disk|external hdd|portable hdd|pen drive|flash drive|micro\s*sd(?:xc)?|memory card|sd card)\b/i.test(n);
  const audio = /\b(?:airpods|earbuds?|earphones?|headphones?|headset|neckband|tws)\b/i.test(n);
  const speaker = /\b(?:speaker|speakers|soundbar)\b/i.test(n);
  const smartwatch = /\b(?:apple\s*watch|galaxy\s*watch|smart\s*watch|smartwatch|noise\s*(?:fit|colorfit|pulse|icon|evolve)|boat\s+(?:wave|storm|xtend|watch)|fire[- ]?boltt|amazfit)\b/i.test(n);
  const tablet = /\b(?:ipad(?:\s+(?:air|pro|mini))?|galaxy\s*tab|redmi\s*pad|oneplus\s*pad|lenovo\s*tab|realme\s*pad|tablet)\b/i.test(n);

  const hasComputerSpecs = /\b(?:\d+\s*gb\s*ram|intel\s+core|core\s*i[3579]|amd\s+ryzen|ryzen\s+[3579])/i.test(n);

  const smartphone = !compatibilityOnly && (
    /^(?:apple\s+)?iphone\b/i.test(n) ||
    /^samsung\s+galaxy\s+(?!buds\b)/i.test(n) ||
    /^oneplus\s+(?:\d|nord\b)(?!.*\b(?:buds|watch|band)\b)/i.test(n) ||
    /^redmi\s+(?:note|a\d|\d)/i.test(n) ||
    /^realme\s+(?:narzo|c\d|\d|gt)/i.test(n) ||
    /^oppo\s+(?:a\d|f\d|reno)/i.test(n) ||
    /^vivo\s+(?:a\d|v\d|y\d|x\d)/i.test(n) ||
    /^iqoo\s+[a-z]?\d/i.test(n) ||
    /^google\s+pixel\s+\d/i.test(n) ||
    /^motorola\s+(?:g|e|edge)\b/i.test(n) ||
    /^tecno\s+(?:pop|spark|camon)\b/i.test(n) ||
    /^infinix\s+(?:note|hot|zero|smart)\b/i.test(n) ||
    /^nokia\s+(?:g\d|c\d|\d{3,4})\b/i.test(n) ||
    /\b(?:smartphone|mobile phone|android phone)\b/i.test(n) && !accessorySignal.test(n)
  );

  const laptop = !compatibilityOnly && (
    /^\s*(?:apple\s+)?macbook\b/i.test(n) ||
    /\b(?:chromebook|magicbook|ideapad|idea\s*pad|thinkpad|thinkbook|vivobook|zenbook)\b/i.test(n) ||
    ( /\b(?:vostro|inspiron|latitude|xps|pavilion|aspire|surface\s+laptop|surface\s+pro|legion|rog|tuf|nitro|predator|swift|yoga|gram)\b/i.test(n)
      && (hasComputerSpecs || /\blaptop\b/i.test(n)) ) ||
    /\blaptop\b/i.test(n) && !accessorySignal.test(n) && !audio && !speaker && !television && !camera
  );

  // Compatibility/drive products can mention a laptop while still being storage.
  const storageWithLaptopCompatibility = storage && /\b(?:for|compatible with|fits|works with|laptop|notebook)\b/i.test(n) && !hasComputerSpecs;

  // Device classes before generic storage catch phrases like "speaker for laptop".
  if (television) return "television";
  if (camera) return "camera";
  if (smartwatch && !/\b(?:strap|band|case|cover|protector)\b/i.test(n)) return "smartwatch";
  if (tablet && !accessorySignal.test(n)) return "tablet";
  if (audio && !accessorySignal.test(n)) return "earbuds-headphones";
  if (speaker && !accessorySignal.test(n)) return "speaker";
  if (smartphone) return "smartphone";
  if (laptop && !storageWithLaptopCompatibility) return "laptop";
  if (storage) return "storage";
  if (/\b(?:monitor|computer monitor|lcd monitor|led monitor|display monitor)\b/i.test(n)) return "other-electronics";

  if (accessorySignal.test(n)) {
    if (/\b(?:charger|charging|adapter|power bank|usb cable|type[- ]?c cable|lightning cable|cable)\b/i.test(n)) return "charger-adapter";
    if (/\b(?:phone|smartphone|iphone|ipad|android|samsung|galaxy|redmi|oneplus|pixel)\b/i.test(n)) return "mobile-accessories";
    return "computer-accessories";
  }

  return original || "other-electronics";
}

const normalizedProducts = products.map((product) => ({
  ...product,
  category: normalizeCategory(product),
  specs: deriveSpecs(product),
}));

const insert = db.prepare(`
  INSERT INTO products
    (id, name, category, brand, price, mrp, rating, review_count, image_url, description, specs_json, tags_json)
  VALUES
    (@id, @name, @category, @brand, @price, @mrp, @rating, @reviewCount, @imageUrl, @description, @specsJson, @tagsJson)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    category = excluded.category,
    brand = excluded.brand,
    price = excluded.price,
    mrp = excluded.mrp,
    rating = excluded.rating,
    review_count = excluded.review_count,
    image_url = excluded.image_url,
    description = excluded.description,
    specs_json = excluded.specs_json,
    tags_json = excluded.tags_json
`);

const insertMany = db.transaction((items: Product[]) => {
  for (const p of items) {
    insert.run({
      id: p.id,
      name: p.name,
      category: p.category,
      brand: p.brand,
      price: p.price,
      mrp: p.mrp,
      rating: p.rating,
      reviewCount: p.reviewCount,
      imageUrl: p.imageUrl,
      description: p.description,
      specsJson: JSON.stringify(p.specs),
      tagsJson: JSON.stringify(p.tags),
    });
  }
});

insertMany(normalizedProducts);
console.log(`Synchronized ${normalizedProducts.length} products with normalized categories and specifications.`);
