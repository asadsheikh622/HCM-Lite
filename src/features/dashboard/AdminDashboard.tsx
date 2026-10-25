import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Users, DollarSign, TrendingUp, Building, ShieldCheck, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminAnalytics();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load admin analytics:', err);
      setError(err?.message || 'Failed to load executive dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const kpis = data?.kpis || {};
  const deptBreakdown = data?.deptBreakdown || [];
  const aiSummary = data?.aiSummary || [];
  const auditLogs = data?.recentAuditLogs || [];

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Context Header - Rendered immediately */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Executive Admin Console</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Enterprise-wide human capital metrics, payroll expenditures, and organizational governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('payroll')}
            className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
          >
            Review Payroll
          </button>
          <button
            onClick={() => onNavigate('organization')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            Organization Settings
          </button>
        </div>
      </div>

      {/* Error state with retry */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* AI Executive Summary Banner */}
      {loading ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 text-white shadow-sm border border-zinc-800 animate-pulse">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-4 h-4" />
            <span>Generating AI Executive Operational Briefing...</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-white/5 border border-white/10"></div>
            ))}
          </div>
        </div>
      ) : aiSummary.length > 0 ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white shadow-sm border border-zinc-800">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-4 h-4" />
            <span>AI Executive Operational Briefing</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {aiSummary.map((insight: string, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs leading-relaxed text-zinc-200">
                {insight}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 4 Primary KPI Cards with progressive skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Headcount */}
        <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Headcount</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          {loading ? (
            <div className="space-y-2 py-1 animate-pulse">
              <div className="h-7 w-20 bg-zinc-200 rounded-md"></div>
              <div className="h-3.5 w-32 bg-zinc-100 rounded-md"></div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900">
                {kpis.headcount || 0}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                {kpis.activeHeadcount || 0} Active · {kpis.probationaryHeadcount || 0} Probationary
              </p>
            </>
          )}
        </div>

        {/* Monthly Payroll Cost */}
        <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Payroll Cost</span>
            <DollarSign className="w-4 h-4 text-zinc-400" />
          </div>
          {loading ? (
            <div className="space-y-2 py-1 animate-pulse">
              <div className="h-7 w-28 bg-zinc-200 rounded-md"></div>
              <div className="h-3.5 w-36 bg-zinc-100 rounded-md"></div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900">
                PKR {(kpis.totalMonthlyPayroll || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Gross commitment across all active personnel
              </p>
            </>
          )}
        </div>

        {/* Average Monthly Gross */}
        <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Monthly Gross</span>
            <TrendingUp className="w-4 h-4 text-zinc-400" />
          </div>
          {loading ? (
            <div className="space-y-2 py-1 animate-pulse">
              <div className="h-7 w-24 bg-zinc-200 rounded-md"></div>
              <div className="h-3.5 w-32 bg-zinc-100 rounded-md"></div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900">
                PKR {(kpis.averageSalary || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Mean compensation per employee
              </p>
            </>
          )}
        </div>

        {/* Attrition Rate */}
        <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Attrition Rate</span>
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
          </div>
          {loading ? (
            <div className="space-y-2 py-1 animate-pulse">
              <div className="h-7 w-16 bg-zinc-200 rounded-md"></div>
              <div className="h-3.5 w-28 bg-zinc-100 rounded-md"></div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900">
                {kpis.attritionRate || 0}%
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                YTD exits divided by average headcount
              </p>
            </>
          )}
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Departmental Distribution & Payroll Allocation</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Real-time aggregate totals by registered department</p>
          </div>
          <button
            onClick={() => onNavigate('employees')}
            className="text-xs font-semibold text-zinc-900 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>View All Staff</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {deptBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 text-zinc-500 uppercase font-semibold text-[11px] tracking-wider border-b border-zinc-100">
                <tr>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3 text-right">Headcount</th>
                  <th className="px-5 py-3 text-right">Monthly Gross Payroll</th>
                  <th className="px-5 py-3 text-right">Avg. Compensation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {deptBreakdown.map((dept: any) => (
                  <tr key={dept.departmentId} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-zinc-900">{dept.name}</td>
                    <td className="px-5 py-3.5 text-zinc-500 font-mono">{dept.code}</td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums text-zinc-900">{dept.headcount}</td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums text-zinc-900">
                      PKR {dept.totalPayroll.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums text-zinc-600">
                      PKR {dept.avgSalary.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500">
            No departments created yet. Navigate to Organization Settings to configure your structure.
          </div>
        )}
      </div>

      {/* Recent Audit Logs Feed */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-5">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Immutable Audit Feed</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Append-only administrative operations log</p>
          </div>
          <button
            onClick={() => onNavigate('audit')}
            className="text-xs font-semibold text-zinc-900 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Full Audit Trail</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {auditLogs.length > 0 ? (
          <div className="divide-y divide-zinc-100 mt-2">
            {auditLogs.map((log: any) => (
              <div key={log._id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900">{log.action}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono">
                      {log.entity}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Actor: <span className="text-zinc-700 font-medium">{log.actorName}</span> ({log.actorRole})
                  </p>
                </div>
                <div className="text-right text-[11px] text-zinc-400 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-zinc-500">
            No administrative events recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};
