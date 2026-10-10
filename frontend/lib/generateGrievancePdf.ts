/**
 * generateGrievancePdf.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Client-side PDF generation for SANCHAL municipal grievance reports.
 * Generates a CPGRAMS/RTI-compatible PDF using jsPDF + jspdf-autotable.
 *
 * Usage:
 *   import { generatePDF } from "@/lib/generateGrievancePdf";
 *   await generatePDF({ dept1, dept2, location, delayProbability, date });
 * ─────────────────────────────────────────────────────────────────────────
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ConflictData {
  dept1: string;
  dept1Sub: string;
  dept2: string;
  dept2Sub: string;
  location: string;
  delayProbability: number;
  since: string;
  risk: string;
}

// ---------------------------------------------------------------------------
// Colour palette (matches the dashboard dark theme in print-safe form)
// ---------------------------------------------------------------------------
const BRAND_BLUE: [number, number, number] = [37, 99, 235];   // blue-600
const DANGER_RED: [number, number, number] = [220, 38, 38];   // red-600
const TEXT_DARK: [number, number, number] = [17, 24, 39];     // gray-900
const MUTED: [number, number, number] = [107, 114, 128];       // gray-500
const LIGHT_BG: [number, number, number] = [249, 250, 251];   // gray-50
const HEADER_BG: [number, number, number] = [30, 41, 59];     // slate-800

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function generatePDF(conflictData: ConflictData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;

  // ── 1. Background header band ──────────────────────────────────────────
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, pageW, 42, "F");

  // ── 2. Brand / Title ───────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("SANCHAL", pageW / 2, 14, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("MUNICIPAL GRIEVANCE REPORT", pageW / 2, 20, { align: "center" });

  // ── 3. CPGRAMS sub-header pill ─────────────────────────────────────────
  const pillText = "Auto-Generated CPGRAMS Draft";
  const pillW = 70;
  const pillX = (pageW - pillW) / 2;
  doc.setFillColor(...DANGER_RED);
  doc.roundedRect(pillX, 25, pillW, 8, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(pillText, pageW / 2, 30.5, { align: "center" });

  // ── 4. Report metadata row ─────────────────────────────────────────────
  let y = 52;
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(margin, y, contentW, 18, 2, 2, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);

  const metaItems = [
    ["Report ID", `SANCHAL-${Date.now().toString().slice(-8)}`],
    ["Generated On", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
    ["Status", "Pending Resolution"],
    ["Risk Level", conflictData.risk],
  ];

  const colW = contentW / metaItems.length;
  metaItems.forEach(([label, value], i) => {
    const x = margin + i * colW + 4;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_DARK);
    doc.text(value, x, y + 12);
  });

  // ── 5. Section title: Conflict Details ────────────────────────────────
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("CONFLICT DETAILS", margin, y);

  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 1.5, margin + contentW, y + 1.5);

  // ── 6. autoTable — conflict data ───────────────────────────────────────
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Field", "Details"]],
    body: [
      ["Department 1", `${conflictData.dept1}\n(${conflictData.dept1Sub})`],
      ["Department 2", `${conflictData.dept2}\n(${conflictData.dept2Sub})`],
      ["Conflict Location", conflictData.location],
      ["Delay Probability", `${conflictData.delayProbability}%  ← AI-estimated risk`],
      ["Conflict Reported On", conflictData.since],
      ["Risk Classification", conflictData.risk],
    ],
    headStyles: {
      fillColor: BRAND_BLUE,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: "bold", textColor: TEXT_DARK, fillColor: [243, 244, 246] },
      1: { cellWidth: "auto", textColor: TEXT_DARK },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    bodyStyles: { fontSize: 9, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.2 },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.2,
  });

  // ── 7. Section title: Recommended Action ──────────────────────────────
  // @ts-expect-error – lastAutoTable is injected by jspdf-autotable at runtime
  const afterTable: number = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("RECOMMENDED ACTION", margin, afterTable);

  doc.setDrawColor(...BRAND_BLUE);
  doc.line(margin, afterTable + 1.5, margin + contentW, afterTable + 1.5);

  autoTable(doc, {
    startY: afterTable + 6,
    margin: { left: margin, right: margin },
    head: [["#", "Action Item", "Responsible Authority"]],
    body: [
      ["1", "Coordinate digging schedules between departments", "Chennai Corporation – Roads Dept."],
      ["2", "Issue joint work order to avoid overlap", `${conflictData.dept1} & ${conflictData.dept2}`],
      ["3", "File delay escalation if unresolved within 7 days", "District Collector, Chennai"],
    ],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 100 },
      2: { cellWidth: "auto" },
    },
    bodyStyles: { fontSize: 8.5, cellPadding: 3.5, textColor: TEXT_DARK, lineColor: [226, 232, 240], lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // ── 8. Footer ──────────────────────────────────────────────────────────
  const footerY = pageH - 14;
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, footerY - 4, pageW, 20, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Generated by Sanchal AI  •  Valid for Official Submission  •  Government of Tamil Nadu – Municipal Administration",
    pageW / 2,
    footerY + 2,
    { align: "center" }
  );

  // ── 9. Page border ─────────────────────────────────────────────────────
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.6);
  doc.rect(4, 4, pageW - 8, pageH - 8);

  // ── 10. Save ───────────────────────────────────────────────────────────
  doc.save("Sanchal_Grievance_Report.pdf");
}
