import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { loadBranding } from "./branding";

export interface MilkReportData {
  range: { from: string; to: string };
  totals: { total: number; avg: number; peak: { date: string; litres: number } };
  herd: { am: number; noon: number; pm: number; total: number };
  cows: { name: string; tag: string | null; litres: number; am: number; noon: number; pm: number; days: number; avg: number }[];
  series: { date: string; litres: number }[];
}

async function loadLogoDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateMilkPDF(data: MilkReportData): Promise<jsPDF> {
  const brand = loadBranding();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Brand color (sage green)
  const accent: [number, number, number] = [47, 138, 77];
  const muted: [number, number, number] = [120, 130, 125];
  const ink: [number, number, number] = [25, 35, 30];

  // Header
  const logo = await loadLogoDataUrl(brand.logoUrl);
  if (logo) {
    try { doc.addImage(logo, "PNG", margin, margin - 6, 44, 44); } catch {}
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...ink);
  doc.text(brand.name, margin + 56, margin + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text("Milk Production Report", margin + 56, margin + 28);

  // Right meta
  doc.setFontSize(9);
  const rangeStr = `${format(parseISO(data.range.from), "d MMM yyyy")} — ${format(parseISO(data.range.to), "d MMM yyyy")}`;
  doc.text(rangeStr, pageW - margin, margin + 12, { align: "right" });
  doc.text(`Generated ${format(new Date(), "d MMM yyyy, HH:mm")}`, pageW - margin, margin + 26, { align: "right" });

  // Divider
  doc.setDrawColor(220, 225, 222);
  doc.setLineWidth(0.6);
  doc.line(margin, margin + 50, pageW - margin, margin + 50);

  // KPI cards
  let y = margin + 70;
  const cardW = (pageW - margin * 2 - 24) / 4;
  const kpis = [
    { label: "TOTAL", value: `${data.totals.total.toFixed(0)} L` },
    { label: "DAILY AVG", value: `${data.totals.avg.toFixed(1)} L` },
    { label: "PEAK DAY", value: data.totals.peak.litres ? `${data.totals.peak.litres.toFixed(0)} L` : "—" },
    { label: "COWS MILKED", value: String(data.cows.length) },
  ];
  kpis.forEach((k, i) => {
    const x = margin + i * (cardW + 8);
    doc.setFillColor(247, 250, 247);
    doc.roundedRect(x, y, cardW, 56, 6, 6, "F");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.text(k.label, x + 12, y + 16);
    doc.setFontSize(16);
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.text(k.value, x + 12, y + 40);
  });

  y += 76;

  // Herd session totals
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ink);
  doc.text("Herd sessions", margin, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [["Morning", "Noon", "Evening", "Total"]],
    body: [[`${data.herd.am.toFixed(1)} L`, `${data.herd.noon.toFixed(1)} L`, `${data.herd.pm.toFixed(1)} L`, `${data.herd.total.toFixed(1)} L`]],
    theme: "plain",
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 8, textColor: ink as any },
    headStyles: { fillColor: [240, 245, 240], textColor: muted as any, fontStyle: "normal", fontSize: 8 },
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [255, 255, 255] },
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  // Cow production table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Production by cow", margin, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [["#", "Cow", "Tag", "Morning", "Noon", "Evening", "Total", "Avg/day", "Days"]],
    body: data.cows.map((c, i) => [
      String(i + 1),
      c.name,
      c.tag ?? "—",
      c.am.toFixed(1),
      c.noon.toFixed(1),
      c.pm.toFixed(1),
      c.litres.toFixed(1),
      c.avg.toFixed(1),
      String(c.days),
    ]),
    foot: [["", "Herd total", "", data.herd.am.toFixed(1), data.herd.noon.toFixed(1), data.herd.pm.toFixed(1), data.herd.total.toFixed(1), "", ""]],
    theme: "plain",
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: ink as any, lineColor: [232, 235, 232] as any, lineWidth: 0.4 },
    headStyles: { fillColor: [247, 250, 247], textColor: muted as any, fontStyle: "bold", fontSize: 8, halign: "left" },
    footStyles: { fillColor: [247, 250, 247], textColor: ink as any, fontStyle: "bold", fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 22, textColor: muted as any },
      3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" },
      6: { halign: "right", textColor: accent as any, fontStyle: "bold" },
      7: { halign: "right" }, 8: { halign: "right" },
    },
    didDrawPage: () => {
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text(`${brand.name} · v1.0`, margin, pageH - 20);
      doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageW - margin, pageH - 20, { align: "right" });
    },
  });

  return doc;
}

export async function downloadMilkPDF(data: MilkReportData) {
  const doc = await generateMilkPDF(data);
  const fname = `kibet-farm-milk-${data.range.from}-to-${data.range.to}.pdf`;
  doc.save(fname);
}