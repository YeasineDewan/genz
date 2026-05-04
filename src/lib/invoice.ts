import jsPDF from "jspdf";
import type { Order, Product } from "./types";
import { formatPrice } from "./store";

export function downloadInvoice(order: Order, products: Product[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("GenZ", margin, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("genz.shop · hello@genz.shop", margin, y + 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("INVOICE", W - margin, y + 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`#${order.id.slice(0, 8).toUpperCase()}`, W - margin, y + 28, { align: "right" });
  doc.text(new Date(order.createdAt).toLocaleDateString(), W - margin, y + 42, { align: "right" });

  y += 70;
  doc.setDrawColor(20);
  doc.setLineWidth(1);
  doc.line(margin, y, W - margin, y);
  y += 20;

  // Bill to
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BILL TO", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const s = order.shipping;
  const lines = [
    s.name,
    s.email,
    s.phone,
    s.company,
    s.address,
    s.address2,
    [s.city, s.state, s.zip].filter(Boolean).join(", "),
    s.country,
  ].filter(Boolean) as string[];
  lines.forEach((ln, i) => doc.text(ln, margin, y + 16 + i * 14));

  // Order meta
  doc.setFont("helvetica", "bold");
  doc.text("ORDER", W - margin - 180, y);
  doc.setFont("helvetica", "normal");
  const meta = [
    `Status: ${order.status}`,
    order.trackingNumber ? `Tracking: ${order.trackingNumber}` : "",
    order.carrier ? `Carrier: ${order.carrier}` : "",
    s.deliveryMethod ? `Delivery: ${s.deliveryMethod}` : "",
  ].filter(Boolean);
  meta.forEach((m, i) => doc.text(m, W - margin - 180, y + 16 + i * 14));

  y += 16 + Math.max(lines.length, meta.length) * 14 + 20;

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, W - margin * 2, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ITEM", margin + 8, y + 16);
  doc.text("QTY", W - margin - 200, y + 16);
  doc.text("PRICE", W - margin - 130, y + 16);
  doc.text("TOTAL", W - margin - 8, y + 16, { align: "right" });
  y += 30;

  doc.setFont("helvetica", "normal");
  order.items.forEach((it) => {
    const p = products.find((x) => x.id === it.productId);
    const name = p?.name ?? it.productId;
    const price = p?.price ?? 0;
    doc.text(doc.splitTextToSize(`${name}  (${it.size} / ${it.color})`, 280), margin + 8, y);
    doc.text(String(it.qty), W - margin - 200, y);
    doc.text(formatPrice(price), W - margin - 130, y);
    doc.text(formatPrice(price * it.qty), W - margin - 8, y, { align: "right" });
    y += 22;
  });

  y += 8;
  doc.setLineWidth(0.5);
  doc.line(W - margin - 220, y, W - margin, y);
  y += 16;

  const subtotal = order.subtotal ?? order.total;
  const discount = order.discount ?? 0;
  const shipping = order.shippingFee ?? 0;
  const row = (label: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 12 : 10);
    doc.text(label, W - margin - 220, y);
    doc.text(val, W - margin - 8, y, { align: "right" });
    y += bold ? 22 : 16;
  };
  row("Subtotal", formatPrice(subtotal));
  if (discount > 0) row(`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, `-${formatPrice(discount)}`);
  row("Shipping", shipping > 0 ? formatPrice(shipping) : "FREE");
  row("Total", formatPrice(order.total), true);

  y += 30;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Thank you for shopping with GenZ. Questions? hello@genz.shop", margin, y);

  doc.save(`GenZ-Invoice-${order.id.slice(0, 8).toUpperCase()}.pdf`);
}
