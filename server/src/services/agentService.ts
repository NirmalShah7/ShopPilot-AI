import Groq from "groq-sdk";
import type { ExtractedIntent, IntentFilters } from "../types/chat.js";
import type { Product } from "../types/product.js";
import {
  findProductsByText,
  listCategories,
  getProductById,
} from "./productService.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL =
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const threadFilters = new Map<string, IntentFilters>();
const threadProducts = new Map<string, Product[]>();

function emptyFilters(): IntentFilters {
  return {
    category: null,
    budgetMin: null,
    budgetMax: null,
    brand: null,
    keywords: [],
  };
}

export function getThreadFilters(threadId: string): IntentFilters {
  return threadFilters.get(threadId) ?? emptyFilters();
}

export function setThreadFilters(
  threadId: string,
  filters: IntentFilters
): void {
  threadFilters.set(threadId, filters);
}

export function clearThreadFilters(threadId: string): void {
  threadFilters.delete(threadId);
  threadProducts.delete(threadId);
}

export function setThreadProducts(
  threadId: string,
  products: Product[]
): void {
  threadProducts.set(threadId, products);
}

export function getThreadProducts(threadId: string): Product[] {
  return threadProducts.get(threadId) ?? [];
}

export function getContextProduct(
  threadId: string,
  productId?: string | null
): Product | null {
  if (productId) {
    const byId = getProductById(productId);
    if (byId) return byId;
  }

  return getThreadProducts(threadId)[0] ?? null;
}

export function findProductForQuestion(
  threadId: string,
  message: string,
  contextProductId?: string
): Product | null {
  const recent = getThreadProducts(threadId);
  const lower = message.toLowerCase();
  const contextProduct = getContextProduct(threadId, contextProductId);

  const ordinalMatch = lower.match(
    /\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th)\b/
  );

  if (ordinalMatch && recent.length) {
    const ordinalMap: Record<string, number> = {
      first: 0,
      "1st": 0,
      second: 1,
      "2nd": 1,
      third: 2,
      "3rd": 2,
      fourth: 3,
      "4th": 3,
      fifth: 4,
      "5th": 4,
      sixth: 5,
      "6th": 5,
    };

    const ordinalProduct =
      recent[ordinalMap[ordinalMatch[1]]];

    if (ordinalProduct) return ordinalProduct;
  }

  if (
    contextProduct &&
    /\b(?:this|that|it|this product|that product|this device|that device|this one|that one)\b/.test(
      lower
    )
  ) {
    return contextProduct;
  }

  const found = findProductsByText(message, 8);

  if (found.length) {
    return found[0];
  }

  if (
    recent.length &&
    /\b(?:spec|specs|specification|specifications|features|details|explain|tell me|what|how|is it|does it|worth|good|price|camera|battery|display|processor|ram|storage|performance|gaming|review|availability|stock|warranty|delivery|shipping|return|quality)\b/.test(
      lower
    )
  ) {
    return contextProduct ?? recent[0];
  }

  return null;
}

function deriveSpecs(product: Product): Record<string, string> {
  const specs: Record<string, string> = {
    ...product.specs,
  };

  const text = `${product.name} ${product.description}`;

  const capture = (key: string, pattern: RegExp) => {
    if (!specs[key]) {
      const match = text.match(pattern);

      if (match) {
        specs[key] = match[0].trim();
      }
    }
  };

  capture("RAM", /\b\d+\s*GB\s*(?:RAM|memory)\b/i);

  capture(
    "Storage",
    /\b\d+\s*(?:GB|TB)\s*(?:SSD|HDD|ROM|storage|eMMC)\b/i
  );

  capture(
    "Display",
    /\b\d+(?:\.\d+)?[- ]?(?:inch|inches|")\b[^|,]*/i
  );

  capture(
    "Processor",
    /\b(?:Intel|AMD|Apple|Qualcomm|MediaTek|Snapdragon|Ryzen|Core\s*i[3579])[^|,]*/i
  );

  capture("Battery", /\b\d{3,6}\s*mAh\b/i);

  capture("Camera", /\b\d+\s*MP\b[^|,]*/i);

  capture(
    "Operating System",
    /\b(?:Android\s*\d+(?:\.\d+)?|Windows\s*\d+|iOS\s*\d+|macOS)\b/i
  );

  capture(
    "Connectivity",
    /\b(?:5G|4G|Wi-?Fi|Bluetooth\s*[0-9.]*)\b/i
  );

  return specs;
}

function formatSpecLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase());
}

export function buildProductSpecsAnswer(product: Product): string {
  const specs = deriveSpecs(product);
  const entries = Object.entries(specs);

  const specText = entries.length
    ? entries
        .map(
          ([key, value]) =>
            `• **${formatSpecLabel(key)}:** ${value}`
        )
        .join("\n")
    : "• No additional specifications are available in the catalog.";

  return `Absolutely — here’s a clear breakdown of **${product.name}**.

### Specifications
${specText}

### Quick details
• **Price:** ₹${product.price.toLocaleString("en-IN")}
• **Rating:** ${product.rating.toFixed(1)}/5 (${product.reviewCount.toLocaleString(
    "en-IN"
  )} reviews)
• **Category:** ${formatSpecLabel(product.category)}

I’m using the information available in your product catalog. If a detail isn't listed there, I’ll say so rather than guess.`;
}

export function buildComparisonAnswer(
  products: Product[],
  userMessage: string
): string {
  if (products.length < 2) {
    return "I need at least two products to compare. Try something like: compare iPhone and Redmi.";
  }

  const keys = [
    ...new Set(
      products.flatMap((p) => Object.keys(deriveSpecs(p)))
    ),
  ].slice(0, 12);

  const preference = userMessage.toLowerCase();

  const score = (p: Product) => {
    let value =
      p.rating * 10 +
      Math.log10(Math.max(p.reviewCount, 1));

    if (
      /price|cheap|budget|value|affordable/.test(
        preference
      )
    ) {
      value += 100000 / Math.max(p.price, 1);
    }

    if (/battery|backup/.test(preference)) {
      const v =
        Object.entries(deriveSpecs(p)).find(
          ([k]) => /battery/i.test(k)
        )?.[1] ?? "";

      value +=
        Number(
          (v.match(/\d+(?:\.\d+)?/) || ["0"])[0]
        ) / 100;
    }

    if (
      /camera|photo|photography/.test(preference)
    ) {
      const v =
        Object.entries(deriveSpecs(p)).find(
          ([k]) => /camera/i.test(k)
        )?.[1] ?? "";

      value +=
        Number(
          (v.match(/\d+(?:\.\d+)?/) || ["0"])[0]
        ) / 10;
    }

    if (
      /performance|gaming|processor|speed/.test(
        preference
      )
    ) {
      value +=
        Object.entries(deriveSpecs(p)).filter(
          ([k, v]) =>
            /processor|chip|ram/i.test(k) &&
            /\d/.test(v)
        ).length * 2;
    }

    return value;
  };

  const ranked = [...products].sort(
    (a, b) => score(b) - score(a)
  );

  const header = `| Feature | ${products
    .map((p) => p.name.replace(/\|/g, " "))
    .join(" | ")} |`;

  const separator = `| --- | ${products
    .map(() => "---")
    .join(" | ")} |`;

  const rows = keys.map(
    (key) =>
      `| ${formatSpecLabel(key)} | ${products
        .map(
          (p) =>
            deriveSpecs(p)[key] ?? "Not listed"
        )
        .join(" | ")} |`
  );

  const price = `| Price | ${products
    .map(
      (p) =>
        `₹${p.price.toLocaleString("en-IN")}`
    )
    .join(" | ")} |`;

  const rating = `| Rating | ${products
    .map(
      (p) =>
        `${p.rating.toFixed(1)}/5 (${p.reviewCount.toLocaleString(
          "en-IN"
        )} reviews)`
    )
    .join(" | ")} |`;

  return `Here’s a side-by-side comparison based on the catalog data.

${[
    header,
    separator,
    ...rows,
    price,
    rating,
  ].join("\n")}

### My recommendation
**${ranked[0].name}** is my pick for your request based on the factors you mentioned. I’m only using information available in the catalog.`;
}

function extractBudgetValue(
  text: string
): number | null {
  const match = text.match(
    /(?:₹|rs\.?|inr\s*)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lakh|lakhs)?/i
  );

  if (!match) return null;

  let value = Number(match[1]);

  const unit = (match[2] || "").toLowerCase();

  if (
    unit === "k" ||
    unit === "thousand"
  ) {
    value *= 1000;
  }

  if (
    unit === "lakh" ||
    unit === "lakhs"
  ) {
    value *= 100000;
  }

  return Math.round(value);
}

function normalizeRequestedCategory(
  message: string
): string | null {
  const lower = message.toLowerCase();

  if (
    /\b(?:laptop|laptops|notebook|macbook|chromebook|ultrabook)\b/.test(
      lower
    )
  ) {
    return "laptop";
  }

  if (
    /\b(?:phone|phones|mobile|mobiles|smartphone|smartphones|iphone|android)\b/.test(
      lower
    )
  ) {
    return "smartphone";
  }

  if (
    /\b(?:tablet|tablets|ipad)\b/.test(lower)
  ) {
    return "tablet";
  }

  if (
    /\b(?:watch|smartwatch|smart watches)\b/.test(
      lower
    )
  ) {
    return "smartwatch";
  }

  if (
    /\b(?:earbuds|earphones|headphones|headset|neckband|tws)\b/.test(
      lower
    )
  ) {
    return "earbuds-headphones";
  }

  if (
    /\b(?:speaker|speakers|soundbar)\b/.test(
      lower
    )
  ) {
    return "speaker";
  }

  if (
    /\b(?:tv|television|oled|qled)\b/.test(lower)
  ) {
    return "television";
  }

  if (
    /\b(?:camera|cameras|dslr|mirrorless|webcam)\b/.test(
      lower
    )
  ) {
    return "camera";
  }

  if (
    /\b(?:ssd|hdd|hard drive|storage|pendrive|pen drive|memory card|micro sd)\b/.test(
      lower
    )
  ) {
    return "storage";
  }

  return null;
}

function normalizeBrandForCategory(
  brand: string | null,
  category: string | null
): string | null {
  if (!brand) return null;

  const b = brand.trim().toLowerCase();

  const computerBrands = new Set([
    "dell",
    "hp",
    "lenovo",
    "asus",
    "acer",
    "msi",
    "apple",
    "microsoft",
    "lg",
    "honor",
    "xiaomi",
  ]);

  const phoneBrands = new Set([
    "apple",
    "samsung",
    "oneplus",
    "redmi",
    "xiaomi",
    "realme",
    "oppo",
    "vivo",
    "iqoo",
    "google",
    "motorola",
    "tecno",
    "infinix",
    "nokia",
  ]);

  if (
    category === "laptop" &&
    !computerBrands.has(b)
  ) {
    return null;
  }

  if (
    category === "smartphone" &&
    !phoneBrands.has(b)
  ) {
    return null;
  }

  return brand;
}

function heuristicIntent(
  message: string,
  existingFilters: IntentFilters,
  categories: string[]
): ExtractedIntent {
  const lower = message.toLowerCase();

  const requestedCategory =
    normalizeRequestedCategory(message);

  let category =
    requestedCategory ?? existingFilters.category;

  const budget = extractBudgetValue(lower);

  let budgetMax = existingFilters.budgetMax;
  let budgetMin = existingFilters.budgetMin;

  if (
    /\b(under|below|less than|max|upto|up to)\b/.test(
      lower
    ) &&
    budget !== null
  ) {
    budgetMax = budget;
  }

  if (
    /\b(over|above|more than|from)\b/.test(lower) &&
    budget !== null
  ) {
    budgetMin = budget;
  }

  if (
    /\b(around|about|approximately|approx|near)\b/.test(
      lower
    ) &&
    budget !== null
  ) {
    budgetMin = Math.round(budget * 0.8);
    budgetMax = Math.round(budget * 1.2);
  }

  const categoryChanged =
    category !== existingFilters.category &&
    category !== null;

  const rawBrand =
    /\b(apple|samsung|oneplus|redmi|xiaomi|realme|oppo|vivo|iqoo|google|motorola|tecno|infinix|nokia|dell|hp|lenovo|asus|acer|sony|jbl|boat|honor|msi|microsoft)\b/i.exec(
      lower
    )?.[1] ?? null;

  const brand = normalizeBrandForCategory(
    rawBrand ??
      (categoryChanged
        ? null
        : existingFilters.brand),
    category
  );

  const keywords = [
    "gaming",
    "lightweight",
    "noise cancelling",
    "camera",
    "battery",
    "performance",
    "student",
    "college",
    "work",
    "office",
    "budget",
    "cheap",
    "premium",
    "fast",
    "portable",
    "wireless",
  ].filter((k) => lower.includes(k));

  return {
    filters: {
      category:
        category &&
        categories.includes(category)
          ? category
          : existingFilters.category,

      budgetMin,

      budgetMax,

      brand,

      keywords: categoryChanged
        ? keywords
        : [
            ...new Set([
              ...existingFilters.keywords,
              ...keywords,
            ]),
          ],
    },

    needsClarification: false,

    clarificationField: null,

    clarificationQuestion: null,

    assistantMessage: category
      ? `Sure — here are some strong ${formatSpecLabel(
          category
        ).toLowerCase()} options for you.`
      : "Sure — I’ll help you find the right product.",

    resultMode:
      /\b(only one|just one|the best one|which one is best|one best|single best)\b/.test(
        lower
      )
        ? "single"
        : "multiple",
  };
}

export async function extractIntent(
  message: string,
  existingFilters: IntentFilters
): Promise<ExtractedIntent> {
  const categories = listCategories();

  const system = `You are the structured shopping intent parser for an electronics ecommerce website. Return ONLY valid JSON with exactly these fields: category, budgetMin, budgetMax, brand, keywords, needsClarification, clarificationField, clarificationQuestion, assistantMessage, resultMode.

Known categories: ${categories.join(", ")}.

Use null, never empty strings.

Map:
- laptop/notebook/macbook/chromebook to laptop
- phone/mobile/iPhone/Android to smartphone
- tablet/iPad to tablet
- watch/smartwatch to smartwatch
- earbuds/headphones/TWS to earbuds-headphones
- speakers/soundbar to speaker
- TV/television to television
- camera/DSLR/mirrorless to camera
- SSD/HDD/storage/memory card to storage

When the user clearly changes category, discard incompatible previous brand and descriptive keywords.

Preserve a budget only when it still makes sense.

resultMode=single only for explicit one-product requests such as "only one", "just one", "the best one", "which one is best", or "one best"; otherwise multiple.

Keep assistantMessage warm and concise.`;

  try {
    const response =
      await groq.chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: 550,
        temperature: 0,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: system,
          },
          {
            role: "user",
            content: `Existing filters: ${JSON.stringify(
              existingFilters
            )}\nUser message: ${JSON.stringify(
              message
            )}`,
          },
        ],
      });

    const content =
      response.choices[0]?.message?.content?.trim();

    if (!content) {
      return heuristicIntent(
        message,
        existingFilters,
        categories
      );
    }

    const raw =
      JSON.parse(content) as Partial<ExtractedIntent> & {
        category?: string | null;
        budgetMin?: number | null;
        budgetMax?: number | null;
        brand?: string | null;
        keywords?: string[];
        needsClarification?: boolean;
        clarificationField?:
          | "budget"
          | "category"
          | "brand"
          | null;
        clarificationQuestion?: string | null;
        assistantMessage?: string;
        resultMode?: "single" | "multiple";
      };

    const aiCategory = raw.category
      ? categories.find(
          (c) =>
            c.toLowerCase() ===
            String(raw.category).toLowerCase()
        ) ?? null
      : null;

    const requestedCategory =
      normalizeRequestedCategory(message);

    const resolvedCategory =
      requestedCategory ??
      aiCategory ??
      existingFilters.category;

    const categoryChanged =
      !!requestedCategory &&
      requestedCategory !== existingFilters.category;

    /*
     * FIX:
     *
     * x.trim() returns a string.
     * TypeScript therefore sees:
     *
     * string | false
     *
     * instead of boolean.
     *
     * Using x.trim().length > 0 guarantees boolean.
     */
    const cleanKeywords = (
      values: unknown
    ): string[] => {
      if (!Array.isArray(values)) {
        return [];
      }

      return values.filter(
        (x): x is string =>
          typeof x === "string" &&
          x.trim().length > 0
      );
    };

    const aiKeywords = cleanKeywords(raw.keywords);

    const merged: IntentFilters = {
      category: resolvedCategory,

      budgetMin:
        typeof raw.budgetMin === "number"
          ? raw.budgetMin
          : existingFilters.budgetMin,

      budgetMax:
        typeof raw.budgetMax === "number"
          ? raw.budgetMax
          : existingFilters.budgetMax,

      brand: normalizeBrandForCategory(
        categoryChanged
          ? raw.brand?.trim() || null
          : raw.brand?.trim() ||
              existingFilters.brand,
        resolvedCategory
      ),

      keywords: categoryChanged
        ? aiKeywords
        : aiKeywords.length
        ? aiKeywords
        : existingFilters.keywords,
    };

    if (requestedCategory) {
      const noun: Record<string, string> = {
        laptop: "laptop",
        smartphone: "smartphone",
        tablet: "tablet",
        smartwatch: "smartwatch",
        "earbuds-headphones": "headphones",
        speaker: "speaker",
        television: "tv",
        camera: "camera",
        storage: "storage",
      };

      const required =
        noun[requestedCategory];

      if (
        required &&
        !merged.keywords.some(
          (k) =>
            k.toLowerCase() === required
        )
      ) {
        merged.keywords.push(required);
      }
    }

    return {
      filters: merged,

      needsClarification:
        raw.needsClarification === true,

      clarificationField:
        raw.clarificationField ?? null,

      clarificationQuestion:
        raw.clarificationQuestion?.trim() ||
        null,

      assistantMessage:
        raw.assistantMessage?.trim() ||
        "Sure — here are the strongest options I found.",

      resultMode:
        raw.resultMode === "single"
          ? "single"
          : "multiple",
    };
  } catch (error) {
    console.error(
      "shopping intent extraction error:",
      error
    );

    return heuristicIntent(
      message,
      existingFilters,
      categories
    );
  }
}

export function buildGreeting(): string {
  const messages = [
    "Hi! 👋 I’m your Agentic Shopping Assistant. I can help you discover electronics based on your budget, preferences and what you actually need.",

    "Hey! 👋 Welcome to Agentic Shopping. Tell me what gadget you’re looking for, your budget or your use case, and I’ll narrow it down for you.",

    "Hi there! I’m your shopping assistant. You can ask me to find, compare or explain electronics and I’ll help you choose from the catalog.",
  ];

  return messages[
    Math.floor(Math.random() * messages.length)
  ];
}

export function buildWebsiteAnswer(): string {
  return `This website is an **agentic electronics shopping assistant**. You can use it to:

• **Browse** real products from the seeded electronics catalog.
• **Search and filter** by category, brand and price.
• Ask the **AI shopping agent** for recommendations based on your needs.
• Click **Ask AI** on a product to ask about that exact item.
• **Explain specifications**, features, price and value using catalog data.
• **Compare products** and get a recommendation based on what matters to you.
• **Add products to your cart** from Browse or the Agent.
• Pay using **Razorpay Test Mode**.
• See completed purchases in **Orders** and download an order PDF.

Just tell me what you’re looking for in normal language — for example, “I need a laptop for college under ₹60,000.”`;
}

export async function answerGeneralQuestion(
  userMessage: string
): Promise<string> {
  const fallback =
    "I’m your agentic electronics shopping assistant. I can help you find products, compare them, explain specifications, check value for your budget, and guide you to the right choice.";

  try {
    const response =
      await groq.chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: 500,
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content:
              "You are the friendly conversational assistant for an agentic electronics shopping website. Be natural and useful. Explain the website's actual shopping capabilities when asked. Do not invent unavailable features.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

    return (
      response.choices[0]?.message?.content?.trim() ||
      fallback
    );
  } catch (error) {
    console.error(
      "general chat AI error:",
      error
    );

    return fallback;
  }
}