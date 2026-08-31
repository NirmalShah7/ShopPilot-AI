import { Router } from "express";
import type { ChatRequestBody, ChatResponse } from "../types/chat.js";
import { buildComparisonAnswer, buildProductSpecsAnswer, buildGreeting, buildWebsiteAnswer, answerGeneralQuestion, extractIntent, findProductForQuestion, getThreadFilters, setThreadFilters, setThreadProducts, getThreadProducts } from "../services/agentService.js";
import { buildBudgetOptions, countMatchingProducts, findProductsForComparison, searchProducts } from "../services/productService.js";

export const chatRouter = Router();

chatRouter.post("/", async (req, res) => {
  const body = req.body as ChatRequestBody;

  if (!body?.threadId || !body?.message?.trim()) {
    return res.status(400).json({ error: "threadId and message are required." });
  }

  try {
    const lowerMessage = body.message.trim().toLowerCase();

    // Deterministic follow-up commands should reuse the current catalog context
    // instead of being sent through the general LLM intent parser.
    if (/^(show|open)\s+(the\s+)?(?:catalog|catalogue|products?)$/i.test(lowerMessage)) {
      const filters = getThreadFilters(body.threadId);
      const items = searchProducts(filters, 6, 0);
      const total = countMatchingProducts(filters);
      if (items.length > 0) {
        setThreadProducts(body.threadId, items);
        return res.json({
          type: "products",
          message: "Absolutely — here are the products from your current search:",
          items, offset: 0, limit: 6, total,
          hasMore: items.length < total,
          filters,
        });
      }
    }

    if (/^(show|open)\s+(the\s+)?(?:images?|photos?)$/i.test(lowerMessage)) {
      const recent = getThreadProducts(body.threadId);
      if (recent.length > 0) {
        return res.json({ type: "products", message: "Here are the products with their images:", items: recent.slice(0, 6), offset: 0, limit: 6, total: recent.length, hasMore: false, filters: getThreadFilters(body.threadId) });
      }
    }

    if (/^(show|find|give me)\s+(?:some\s+)?(?:earphones|headphones|headsets|earbuds|tws)$/i.test(lowerMessage)) {
      const intent = await extractIntent("best headphones", getThreadFilters(body.threadId));
      setThreadFilters(body.threadId, intent.filters);
      const items = searchProducts(intent.filters, 6, 0);
      const total = countMatchingProducts(intent.filters);
      setThreadProducts(body.threadId, items);
      return res.json({ type: "products", message: "Here are some strong audio picks:", items, offset: 0, limit: 6, total, hasMore: items.length < total, filters: intent.filters });
    }

    if (/^(show|find|give me)\s+(?:some\s+)?(?:phones?|smartphones?|mobiles?|iphones?)$/i.test(lowerMessage)) {
      const intent = await extractIntent("best smartphone", getThreadFilters(body.threadId));
      setThreadFilters(body.threadId, intent.filters);
      const items = searchProducts(intent.filters, 6, 0);
      const total = countMatchingProducts(intent.filters);
      setThreadProducts(body.threadId, items);
      return res.json({ type: "products", message: "Here are some strong smartphone picks:", items, offset: 0, limit: 6, total, hasMore: items.length < total, filters: intent.filters });
    }

    if (/^(show|find|give me)\s+(?:some\s+)?(?:laptops?|notebooks?|macbooks?)$/i.test(lowerMessage)) {
      const intent = await extractIntent("best laptop", getThreadFilters(body.threadId));
      setThreadFilters(body.threadId, intent.filters);
      const items = searchProducts(intent.filters, 6, 0);
      const total = countMatchingProducts(intent.filters);
      setThreadProducts(body.threadId, items);
      return res.json({ type: "products", message: "Here are some strong laptop picks:", items, offset: 0, limit: 6, total, hasMore: items.length < total, filters: intent.filters });
    }

    if (/^(hi|hello|hey|hii|helo|good morning|good afternoon|good evening|how are you)[!.?\s]*$/i.test(lowerMessage)) {
      return res.json({ type: "text", message: buildGreeting() });
    }

    if (/\b(what does this website do|what can this website do|what is this website|what do you do|what can you do|how does this website work|about this website|tell me about this website)\b/i.test(lowerMessage)) {
      return res.json({ type: "text", message: buildWebsiteAnswer() });
    }

    const isComparison = /\b(compare|comparison|versus|\bvs\b|against|difference between)\b/.test(lowerMessage);
    const isSpecsQuestion = /\b(spec|specs|specification|specifications|features|details|configuration|ram|storage|processor|battery|display|camera|explain|tell me about|how is|is this|does this|worth|good|price|performance|gaming|review|availability|stock|warranty|delivery|shipping|return|quality)\b/i.test(lowerMessage);

    if (isComparison) {
      const recent = getThreadProducts(body.threadId);
      const products = recent.length >= 2 && /\b(these|them|both|these devices)\b/.test(lowerMessage)
        ? recent.slice(0, 4)
        : findProductsForComparison(body.message);
      if (products.length >= 2) {
        setThreadProducts(body.threadId, products);
        return res.json({ type: "text", message: buildComparisonAnswer(products, body.message) });
      }
    }

    if (isSpecsQuestion) {
      const product = findProductForQuestion(body.threadId, body.message, body.contextProductId);
      if (product) {
        setThreadProducts(body.threadId, [product]);
        return res.json({ type: "text", message: buildProductSpecsAnswer(product) });
      }
      if (/\b(this|that|it|this product|that product|this device|that device)\b/i.test(lowerMessage)) {
        return res.json({ type: "text", message: "I can explain the exact product. Click **Ask AI** on the product you mean, or mention its name/model so I can use the right catalog entry." });
      }
    }

    const existingFilters = getThreadFilters(body.threadId);
    const intent = await extractIntent(body.message, existingFilters);

    setThreadFilters(body.threadId, intent.filters);

    if (intent.needsClarification && intent.clarificationField === "budget" && intent.filters.category) {
      const options = buildBudgetOptions(intent.filters.category);

      if (options.length > 0) {
        const response: ChatResponse = {
          type: "clarify",
          message: intent.clarificationQuestion || "What's your budget?",
          field: "budget",
          options,
        };
        return res.json(response);
      }
    }

    if (intent.needsClarification && intent.clarificationQuestion) {
      const response: ChatResponse = {
        type: "text",
        message: intent.clarificationQuestion,
      };
      return res.json(response);
    }

    const isSingle = intent.resultMode === "single";
    // Always return a useful set of suggestions. For explicit "best/one" requests,
    // the relevance-ranked first product is the primary recommendation and the
    // remaining products are alternatives shown as "more suggestions".
    const limit = 6;
    const offset = 0;
    const items = searchProducts(intent.filters, limit, offset);
    const total = countMatchingProducts(intent.filters);

    const responseMessage = isSingle
      ? `My top pick is **${items[0]?.name ?? "this product"}**. Here are more suggestions you can consider:`
      : (intent.assistantMessage || "Here are the top picks I found:");

    if (items.length === 0) {
      const looksLikeShoppingRequest = /\b(show|find|search|buy|need|want|looking|recommend|suggest|laptop|phone|smartphone|mobile|tablet|watch|earbuds|headphones|speaker|camera|tv|television|ssd|storage|charger|cable|accessor|gaming|product|products)\b/i.test(lowerMessage);
      if (!looksLikeShoppingRequest) {
        return res.json({ type: "text", message: await answerGeneralQuestion(body.message) });
      }
      return res.json({ type: "text", message: "I couldn't find anything matching that in the current electronics catalog. Try another model, category, brand or budget." });
    }

    const response: ChatResponse = {
      type: "products",
      message: responseMessage,
      items,
      offset,
      limit,
      total,
      hasMore: offset + items.length < total,
      filters: intent.filters,
    };
    setThreadProducts(body.threadId, items);
    return res.json(response);
  } catch (err) {
    console.error("chat route error:", err);
    return res.status(500).json({ error: "Something went wrong processing that request." });
  }
});


chatRouter.post("/more", (req, res) => {
  const body = req.body as {
    filters?: {
      category: string | null;
      budgetMin: number | null;
      budgetMax: number | null;
      brand: string | null;
      keywords: string[];
    };
    offset?: number;
    limit?: number;
  };

  if (!body?.filters) {
    return res.status(400).json({ error: "filters are required." });
  }

  try {
    const limit = Math.min(Math.max(body.limit ?? 6, 2), 12);
    const offset = Math.max(body.offset ?? 0, 0);
    const items = searchProducts(body.filters, limit, offset);
    const total = countMatchingProducts(body.filters);

    return res.json({
      type: "products",
      items,
      offset,
      limit,
      total,
      hasMore: offset + items.length < total,
      filters: body.filters,
    });
  } catch (err) {
    console.error("chat more route error:", err);
    return res.status(500).json({ error: "Unable to load more products." });
  }
});
