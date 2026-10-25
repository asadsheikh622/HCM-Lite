import jsPDF from 'jspdf';
import { IPayslip, IEmployee, ICompany } from '../types/client';

export function downloadPayslipPdf(
  payslip: IPayslip,
  employee: IEmployee | null,
  company: ICompany | null
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [24, 24, 27]; // Charcoal #18181B
  const accentColor = [5, 150, 105]; // Emerald #059669
  const mutedColor = [113, 113, 122]; // Zinc #71717A

  // 1. Company Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(company?.name || 'HCM ENTERPRISES', 20, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Official Salary Statement · ${payslip.month}`, 20, 31);
  doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 20, 36);

  // Status Badge
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(145, 18, 45, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(payslip.isFinalized ? 'FINALIZED PAYSLIP' : 'DRAFT STATEMENT', 148, 23.5);

  // Divider
  doc.setDrawColor(228, 228, 231);
  doc.line(20, 42, 190, 42);

  // 2. Employee Info Grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Employee Information', 20, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

  const empName = employee ? `${employee.firstName} ${employee.lastName}` : payslip.employeeId;
  const empCode = employee?.employeeCode || 'N/A';
  const empEmail = employee?.email || 'N/A';

  doc.text('Employee Name:', 20, 58);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(empName, 60, 58);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Employee Code:', 20, 65);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(empCode, 60, 65);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Email Address:', 110, 58);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(empEmail, 145, 58);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Working Days in Month:', 110, 65);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${payslip.workingDays} Days`, 155, 65);

  // Divider
  doc.setDrawColor(228, 228, 231);
  doc.line(20, 72, 190, 72);

  // 3. Earnings & Deductions Tables
  let y = 82;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Earnings Breakdown', 20, y);
  doc.text('Statutory & Attendance Deductions', 110, y);

  y += 8;
  doc.setFontSize(9);

  // Earnings Rows
  const earnings = [
    { label: 'Basic Salary (B)', amount: payslip.basicSalary },
    { label: 'House Rent Allowance (40%)', amount: payslip.hra },
    { label: 'Medical Allowance (10%)', amount: payslip.medicalAllowance },
  ];

  // Deductions Rows
  const deductions = [
    { label: `Absent Days (${payslip.absentDays} days)`, amount: payslip.absentDeduction },
    { label: `Half-Day Deductions (${payslip.halfDays} days)`, amount: payslip.halfDayDeduction },
    { label: 'Income Tax (Monthly Deduction)', amount: payslip.monthlyTax },
  ];

  for (let i = 0; i < 3; i++) {
    const curY = y + i * 8;
    // Left earnings
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(earnings[i].label, 20, curY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`PKR ${earnings[i].amount.toLocaleString()}`, 85, curY, { align: 'right' });

    // Right deductions
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(deductions[i].label, 110, curY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38); // Red
    doc.text(`- PKR ${deductions[i].amount.toLocaleString()}`, 190, curY, { align: 'right' });
  }

  y += 28;
  // Subtotal lines
  doc.setDrawColor(228, 228, 231);
  doc.line(20, y, 90, y);
  doc.line(110, y, 190, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Gross Earnings:', 20, y);
  doc.text(`PKR ${payslip.grossSalary.toLocaleString()}`, 85, y, { align: 'right' });

  const totalDeductions = payslip.absentDeduction + payslip.halfDayDeduction + payslip.monthlyTax;
  doc.text('Total Deductions:', 110, y);
  doc.setTextColor(220, 38, 38);
  doc.text(`- PKR ${totalDeductions.toLocaleString()}`, 190, y, { align: 'right' });

  // 4. NET PAY BANNER
  y += 18;
  doc.setFillColor(244, 244, 245);
  doc.roundedRect(20, y, 170, 24, 3, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('NET DISBURSED SALARY', 30, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(`PKR ${payslip.netSalary.toLocaleString()}`, 30, y + 18);

  // 5. Tax Details note
  y += 34;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Tax Note: Annualized Taxable Gross is PKR ${payslip.taxableIncomeAnnual.toLocaleString()}.`, 20, y);
  doc.text(`Annual Tax liability of PKR ${payslip.annualTax.toLocaleString()} amortized monthly at PKR ${payslip.monthlyTax.toLocaleString()}.`, 20, y + 5);

  // 6. Signatures
  y += 35;
  doc.setDrawColor(200, 200, 200);
  doc.line(25, y, 75, y);
  doc.line(135, y, 185, y);

  doc.setFontSize(8);
  doc.text('Employee Signature', 35, y + 5);
  doc.text('Authorized HR Signatory', 142, y + 5);

  // Save PDF
  const filename = `Payslip_${empCode}_${payslip.month}.pdf`;
  doc.save(filename);
}
