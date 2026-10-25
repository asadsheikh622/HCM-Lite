import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { downloadPayslipPdf } from '../../lib/payslipPdf';
import { IPayrollRun, IPayslip, IEmployee, IUser, ICompany } from '../../types/client';
import {
  FileText,
  DollarSign,
  Download,
  Lock,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

interface PayrollManagerProps {
  currentUser: IUser;
  company: ICompany | null;
}

export const PayrollManager: React.FC<PayrollManagerProps> = ({ currentUser, company }) => {
  const [runs, setRuns] = useState<IPayrollRun[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [payslips, setPayslips] = useState<IPayslip[]>([]);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showTaxSlabs, setShowTaxSlabs] = useState(false);

  useEffect(() => {
    loadPayrollData();
  }, [selectedMonth]);

  const loadPayrollData = async () => {
    setLoading(true);
    try {
      const [runsRes, empRes] = await Promise.all([
        currentUser.role !== 'employee' ? api.getPayrollRuns() : Promise.resolve({ runs: [] }),
        api.getEmployees(),
      ]);
      setRuns(runsRes.runs);
      setEmployees(empRes.employees);

      if (currentUser.role === 'employee') {
        const mySlips = await api.getMyPayslips();
        setPayslips(mySlips.payslips);
      } else {
        const slipsRes = await api.getRunPayslips(selectedMonth);
        setPayslips(slipsRes.payslips);
      }
    } catch (err) {
      console.error('Failed to load payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraft = async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await api.generatePayrollDraft(selectedMonth);
      setFeedback(res.message);
      loadPayrollData();
    } catch (err: any) {
      setFeedback(`Draft Generation Failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalize = async (runId: string) => {
    if (!window.confirm('Finalize and lock this payroll run? This will freeze calculations and make payslips official for download.')) {
      return;
    }
    try {
      const res = await api.finalizePayroll(runId);
      setFeedback(res.message);
      loadPayrollData();
    } catch (err: any) {
      alert(`Finalization Error: ${err.message}`);
    }
  };

  const handleDownloadSlip = (slip: IPayslip) => {
    const emp = employees.find((e) => e._id === slip.employeeId) || null;
    downloadPayslipPdf(slip, emp, company);
  };

  const currentRun = runs.find((r) => r.month === selectedMonth);
  const empMap = new Map(employees.map((e) => [e._id, e]));
  const canManage = currentUser.role === 'admin' || currentUser.role === 'hr';
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Payroll Lite & Disbursals</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Automated statutory tax slabs, absent deductions, monthly drafts, and PDF generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTaxSlabs(!showTaxSlabs)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-colors shadow-2xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
            <span>Tax Slabs & Formula</span>
          </button>

          {canManage && (!currentRun || currentRun.status === 'draft') && (
            <button
              onClick={handleGenerateDraft}
              disabled={generating}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{generating ? 'Calculating Formulas...' : 'Generate Monthly Draft'}</span>
            </button>
          )}

          {isAdmin && currentRun && currentRun.status === 'draft' && (
            <button
              onClick={() => handleFinalize(currentRun._id)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Finalize & Lock Payroll</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="font-bold text-emerald-900">Dismiss</button>
        </div>
      )}

      {/* Tax Slabs Reference Drawer */}
      {showTaxSlabs && (
        <div className="p-5 rounded-2xl bg-zinc-900 text-white border border-zinc-800 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
              Annualized Gross Income Tax Brackets (Saylani Hackathon Specification)
            </span>
            <button onClick={() => setShowTaxSlabs(false)} className="text-zinc-400 hover:text-white">&times;</button>
          </div>
          <p className="text-zinc-300 text-[11px]">
            Gross salary = 1.5 × Basic Salary (Basic + 40% HRA + 10% Medical). Annualized = Gross × 12. Monthly Tax deduction = Annual Tax / 12.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-zinc-800 border border-zinc-700">
              <span className="text-zinc-400 block text-[10px]">Tier 1 (Up to 600K)</span>
              <strong className="text-emerald-400">0% Tax</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-800 border border-zinc-700">
              <span className="text-zinc-400 block text-[10px]">Tier 2 (600K - 1.2M)</span>
              <strong className="text-zinc-200">5% of excess</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-800 border border-zinc-700">
              <span className="text-zinc-400 block text-[10px]">Tier 3 (1.2M - 2.4M)</span>
              <strong className="text-zinc-200">30K + 15% excess</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-800 border border-zinc-700">
              <span className="text-zinc-400 block text-[10px]">Tier 4 (2.4M - 3.6M)</span>
              <strong className="text-zinc-200">210K + 25% excess</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-800 border border-zinc-700">
              <span className="text-zinc-400 block text-[10px]">Tier 5 (Above 3.6M)</span>
              <strong className="text-zinc-200">510K + 35% excess</strong>
            </div>
          </div>
        </div>
      )}

      {/* Month Selector & Summary Bar (Admin/HR) */}
      {canManage && (
        <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Payroll Period:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">Status:</span>
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase ${
              currentRun?.status === 'finalized'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                : currentRun?.status === 'draft'
                ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                : 'bg-zinc-100 text-zinc-500'
            }`}>
              {currentRun ? currentRun.status : 'No Run Created'}
            </span>
            {currentRun?.finalizedAt && (
              <span className="text-[11px] text-zinc-400">
                (Finalized on {new Date(currentRun.finalizedAt).toLocaleDateString()})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Financial Summary Cards */}
      {canManage && currentRun && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
              Total Gross
            </span>
            <div className="text-xl font-bold font-mono tabular-nums text-zinc-900">
              PKR {currentRun.totalGross.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Pre-deduction commitment</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block mb-1">
              Attendance Deductions
            </span>
            <div className="text-xl font-bold font-mono tabular-nums text-rose-700">
              - PKR {currentRun.totalDeductions.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Absent & half-day deductions</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
            <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wider block mb-1">
              Income Tax
            </span>
            <div className="text-xl font-bold font-mono tabular-nums text-zinc-900">
              - PKR {currentRun.totalTax.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Monthly amortized tax</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
              Net Disbursed
            </span>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-700">
              PKR {currentRun.totalNet.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Final take-home payable</p>
          </div>
        </div>
      )}

      {/* Payslips Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900">
            {currentUser.role === 'employee' ? 'My Issued Payslips' : `Employee Payslip Breakdown (${selectedMonth})`}
          </h3>
          <span className="text-xs text-zinc-500 font-mono">
            {payslips.length} Statements
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading payroll statements...</div>
        ) : payslips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase font-semibold text-[11px] tracking-wider border-b border-zinc-100">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3 text-right">Basic (B)</th>
                  <th className="px-5 py-3 text-right">Gross (1.5×B)</th>
                  <th className="px-5 py-3 text-right">Absent Deductions</th>
                  <th className="px-5 py-3 text-right">Monthly Tax</th>
                  <th className="px-5 py-3 text-right">Net Payable</th>
                  <th className="px-5 py-3 text-center">Payslip PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {payslips.map((ps) => {
                  const emp = empMap.get(ps.employeeId);
                  const name = emp ? `${emp.firstName} ${emp.lastName}` : ps.employeeId;
                  const code = emp?.employeeCode || '';

                  return (
                    <tr key={ps._id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-zinc-900">{name}</div>
                        <div className="text-[11px] font-mono text-zinc-400">{code}</div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-zinc-700">
                        PKR {ps.basicSalary.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-zinc-900 font-semibold">
                        PKR {ps.grossSalary.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-rose-700">
                        {ps.totalDeductions > 0 ? `- PKR ${ps.totalDeductions.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-zinc-700">
                        {ps.monthlyTax > 0 ? `- PKR ${ps.monthlyTax.toLocaleString()}` : 'PKR 0'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums font-bold text-emerald-700 text-sm">
                        PKR {ps.netSalary.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleDownloadSlip(ps)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-zinc-500" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-zinc-500">
            {canManage ? (
              <div className="space-y-3">
                <p>No payroll draft generated for {selectedMonth}.</p>
                <button
                  onClick={handleGenerateDraft}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs"
                >
                  Prepare Monthly Payroll Draft
                </button>
              </div>
            ) : (
              <p>No finalized payslips available yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
