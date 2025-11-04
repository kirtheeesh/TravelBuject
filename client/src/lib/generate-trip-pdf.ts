import jsPDF from "jspdf";
import type { Trip, BudgetItem } from "@shared/schema";

interface TripSummary {
  trip: Trip;
  budgetItems: BudgetItem[];
}

export function generateTripPDF(summary: TripSummary) {
  const { trip, budgetItems } = summary;
  const pdf = new jsPDF();
  let yPosition = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - 2 * margin;

  const checkPageBreak = (space: number) => {
    if (yPosition + space > pageHeight - 15) {
      pdf.addPage();
      yPosition = 15;
    }
  };

  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(52, 152, 219);
  pdf.text(trip.name, margin, yPosition);
  yPosition += 12;

  const totalExpenses = budgetItems.reduce((sum, item) => sum + item.amount, 0);
  const expensePerMember = totalExpenses / trip.members.length;

  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Total Expenses:", margin, yPosition);
  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(220, 53, 69);
  pdf.text(`₹${totalExpenses.toFixed(2)}`, margin + 55, yPosition);
  yPosition += 8;

  pdf.setFont("Helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Members: ${trip.members.length}`, margin, yPosition);
  yPosition += 6;

  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Per Person Share:", margin, yPosition);
  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(34, 139, 34);
  pdf.text(`₹${expensePerMember.toFixed(2)}`, margin + 55, yPosition);
  yPosition += 15;

  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(52, 152, 219);
  pdf.text("MEMBER BREAKDOWN", margin, yPosition);
  yPosition += 10;

  checkPageBreak(30);

  trip.members.forEach((member) => {
    const memberExpenses = budgetItems.filter((item) =>
      item.memberIds.includes(member.id)
    );
    const memberTotal = memberExpenses.reduce((sum, item) => {
      const perPersonShare = item.amount / item.memberIds.length;
      return sum + perPersonShare;
    }, 0);

    checkPageBreak(8);

    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${member.name}`, margin + 5, yPosition);
    
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(220, 53, 69);
    pdf.text(`₹${memberTotal.toFixed(2)}`, margin + 90, yPosition);
    
    yPosition += 8;
  });

  yPosition += 5;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(52, 152, 219);
  pdf.text("SETTLEMENT", margin, yPosition);
  yPosition += 10;

  const settlements = calculateSettlements(trip.members, budgetItems, expensePerMember);

  if (settlements.length === 0) {
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(34, 139, 34);
    pdf.text("✓ All settled!", margin + 5, yPosition);
  } else {
    settlements.forEach((settlement) => {
      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${settlement.from}`, margin + 5, yPosition);
      pdf.text(`→ pays ₹${settlement.amount.toFixed(2)} to →`, margin + 50, yPosition);
      pdf.setFont("Helvetica", "bold");
      pdf.setTextColor(34, 139, 34);
      pdf.text(settlement.to, margin + 130, yPosition);
      yPosition += 7;
    });
  }

  pdf.setFont("Helvetica", "italic");
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    `Generated: ${new Date().toLocaleDateString("en-IN")}`,
    margin,
    pageHeight - 10
  );

  const fileName = `${trip.name.replace(/\s+/g, "_")}_Trip_Report.pdf`;
  pdf.save(fileName);
}

function calculateSettlements(
  members: any[],
  budgetItems: BudgetItem[],
  perPersonShare: number
): Array<{ from: string; to: string; amount: number }> {
  const memberBalances = new Map<string, number>();

  members.forEach((member) => {
    const memberExpenses = budgetItems.filter((item) =>
      item.memberIds.includes(member.id)
    );
    const memberTotal = memberExpenses.reduce((sum, item) => {
      const perPersonAmount = item.amount / item.memberIds.length;
      return sum + perPersonAmount;
    }, 0);

    memberBalances.set(member.id, memberTotal - perPersonShare);
  });

  const settlements: Array<{ from: string; to: string; amount: number }> = [];
  const debtors = Array.from(memberBalances.entries())
    .filter(([, balance]) => balance < -0.01)
    .sort((a, b) => a[1] - b[1]);

  const creditors = Array.from(memberBalances.entries())
    .filter(([, balance]) => balance > 0.01)
    .sort((a, b) => b[1] - a[1]);

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const [debtorId, debtAmount] = debtors[debtorIndex];
    const [creditorId, creditAmount] = creditors[creditorIndex];

    const debtorName = members.find((m) => m.id === debtorId)?.name || "Unknown";
    const creditorName = members.find((m) => m.id === creditorId)?.name || "Unknown";

    const settleAmount = Math.min(Math.abs(debtAmount), creditAmount);

    if (settleAmount > 0.01) {
      settlements.push({
        from: debtorName,
        to: creditorName,
        amount: settleAmount,
      });
    }

    debtors[debtorIndex][1] += settleAmount;
    creditors[creditorIndex][1] -= settleAmount;

    if (Math.abs(debtors[debtorIndex][1]) < 0.01) debtorIndex++;
    if (creditors[creditorIndex][1] < 0.01) creditorIndex++;
  }

  return settlements;
}
