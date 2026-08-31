import type { OrderRecord } from "@/store/orderStore";

function pdfEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(value: unknown, maxChars = 92): string[] {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function downloadOrderPdf(order: OrderRecord) {
  const pageWidth = 612;
  const pageHeight = 842;
  const left = 42;
  const right = 570;
  const top = 800;
  const bottom = 48;
  const lineHeight = 14;

  const logicalLines: Array<{ text: string; size?: number; bold?: boolean; gap?: number }> = [];

  logicalLines.push({ text: "SHOPPING AGENT", size: 20, bold: true, gap: 4 });
  logicalLines.push({ text: "Order Receipt", size: 13, bold: true, gap: 18 });
  logicalLines.push({ text: `Order ID: ${order.id}`, size: 10 });
  logicalLines.push({ text: `Razorpay Order ID: ${order.razorpayOrderId}`, size: 10 });
  logicalLines.push({ text: `Payment ID: ${order.paymentId}`, size: 10 });
  logicalLines.push({ text: `Date: ${new Date(order.createdAt).toLocaleString("en-IN")}`, size: 10 });
  logicalLines.push({ text: `Status: ${order.status.toUpperCase()}`, size: 10, gap: 12 });
  logicalLines.push({ text: "Purchased Products", size: 13, bold: true, gap: 8 });

  for (let index = 0; index < order.items.length; index += 1) {
    const { product, quantity } = order.items[index];
    const lineTotal = product.price * quantity;

    logicalLines.push({
      text: `${index + 1}. ${product.name}`,
      size: 11,
      bold: true,
      gap: 2,
    });
    logicalLines.push({ text: `Brand: ${product.brand}`, size: 9 });
    logicalLines.push({ text: `Category: ${product.category}`, size: 9 });
    logicalLines.push({ text: `Quantity: ${quantity}`, size: 9 });
    logicalLines.push({ text: `Unit price: INR ${product.price.toLocaleString("en-IN")}`, size: 9 });
    logicalLines.push({ text: `Line total: INR ${lineTotal.toLocaleString("en-IN")}`, size: 9 });
    logicalLines.push({ text: `Rating: ${product.rating.toFixed(1)}/5 (${product.reviewCount.toLocaleString("en-IN")} reviews)`, size: 9 });

    if (product.description) {
      logicalLines.push({ text: "Description:", size: 9, bold: true, gap: 2 });
      for (const line of wrapText(product.description, 92)) {
        logicalLines.push({ text: `  ${line}`, size: 9 });
      }
    }

    const specEntries = Object.entries(product.specs ?? {});
    if (specEntries.length) {
      logicalLines.push({ text: "Specifications:", size: 9, bold: true, gap: 2 });
      for (const [key, value] of specEntries) {
        const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
        for (const line of wrapText(`${label}: ${value}`, 88)) {
          logicalLines.push({ text: `  ${line}`, size: 9 });
        }
      }
    }

    logicalLines.push({ text: "", size: 9, gap: 6 });
  }

  logicalLines.push({ text: `TOTAL PAID: INR ${order.amount.toLocaleString("en-IN")}`, size: 13, bold: true, gap: 8 });
  logicalLines.push({ text: "Payment processed in Razorpay Test Mode.", size: 9 });
  logicalLines.push({ text: "Thank you for shopping with Shopping Agent.", size: 9, gap: 4 });

  const pages: Array<Array<{ text: string; size: number; bold: boolean; y: number }>> = [[]];
  let y = top;
  for (const entry of logicalLines) {
    const size = entry.size ?? 10;
    const bold = Boolean(entry.bold);
    const gap = entry.gap ?? 0;
    const wrapped = wrapText(entry.text, size >= 13 ? 70 : 92);

    for (const line of wrapped) {
      if (y < bottom) {
        pages.push([]);
        y = top;
      }
      pages[pages.length - 1].push({ text: line, size, bold, y });
      y -= lineHeight;
    }
    y -= gap;
  }

  // PDF object numbering is 1-based. The first three objects are fixed:
  // 1 Catalog, 2 Pages tree, 3 Helvetica font. This avoids the blank-page
  // issue caused by pointing /Root at a font object.
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  const pageObjectIds: number[] = [];
  let nextObjectId = 5;

  for (const pageLines of pages) {
    const commands: string[] = ["BT"];

    for (const line of pageLines) {
      const font = line.bold ? "/F2" : "/F1";
      commands.push(`${font} ${line.size} Tf`);
      commands.push(`1 0 0 1 ${left} ${line.y} Tm`);
      commands.push(`(${pdfEscape(line.text)}) Tj`);
    }

    commands.push("ET");
    const content = commands.join("\n");
    const contentId = nextObjectId++;
    objects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;

    const pageId = nextObjectId++;
    pageObjectIds.push(pageId);
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
  }

  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = new Array(objects.length).fill(0);

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${order.id}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
