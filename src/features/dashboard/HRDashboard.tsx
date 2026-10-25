import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Users, Clock, Calendar, CheckSquare, Sparkles, UserPlus, FileText, ArrowUpRight } from 'lucide-react';

interface HRDashboardProps {
  onNavigate: (tab: string) => void;
}

export const HRDashboard: React.FC<HRDashboardProps> = ({ onNavigate }) => {
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
      const res = await api.getHRAnalytics();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load HR analytics:', err);
      setError(err?.message || 'Failed to load HR operational metrics.');
    } finally {
      setLoading(false);
    }
  };

  const kpis = data?.kpis || {};
  const topLate = data?.topLateComers || [];
  const aiSummary = data?.aiSummary || [];

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Title & Actions - Rendered immediately */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">HR Operations Dashboard</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Daily attendance roster, leave adjudication, staff onboarding, and payroll drafts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('employees')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Employee</span>
          </button>
          <button
            onClick={() => onNavigate('leave')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Pending Approvals ({kpis.pendingApprovals ?? (loading ? '...' : 0)})</span>
          </button>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-50 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* AI Summary Banner */}
      {loading ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 text-white border border-zinc-800 shadow-sm animate-pulse">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Analyzing Real-Time Operational Briefing...</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-white/5 border border-white/10"></div>
            ))}
          </div>
        </div>
      ) : aiSummary.length > 0 ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 text-white border border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Operational Briefing</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {aiSummary.map((item: string, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-200 leading-relaxed">
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 5 Operational KPI Cards with progressive skeletons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
            Total Staff
          </span>
          {loading ? (
            <div className="h-7 w-16 bg-zinc-200 rounded-md animate-pulse my-1"></div>
          ) : (
            <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900">
              {kpis.headcount || 0}
            </div>
          )}
          <p className="text-[10px] text-zinc-500 mt-1">Active employee profiles</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
            Present Today
          </span>
          {loading ? (
            <div className="h-7 w-16 bg-zinc-200 rounded-md animate-pulse my-1"></div>
          ) : (
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {kpis.presentToday || 0}
            </div>
          )}
          <p className="text-[10px] text-zinc-500 mt-1">Verified on site</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block mb-1">
            Late Check-ins
          </span>
          {loading ? (
            <div className="h-7 w-16 bg-zinc-200 rounded-md animate-pulse my-1"></div>
          ) : (
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {kpis.lateToday || 0}
            </div>
          )}
          <p className="text-[10px] text-zinc-500 mt-1">Past grace period</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider block mb-1">
            On Leave Today
          </span>
          {loading ? (
            <div className="h-7 w-16 bg-zinc-200 rounded-md animate-pulse my-1"></div>
          ) : (
            <div className="text-2xl font-bold font-mono tabular-nums text-sky-700">
              {kpis.onLeaveToday || 0}
            </div>
          )}
          <p className="text-[10px] text-zinc-500 mt-1">Approved time-off</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block mb-1">
            Pending Actions
          </span>
          {loading ? (
            <div className="h-7 w-16 bg-zinc-200 rounded-md animate-pulse my-1"></div>
          ) : (
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-700">
              {kpis.pendingApprovals || 0}
            </div>
          )}
          <p className="text-[10px] text-zinc-500 mt-1">
            {kpis.pendingLeaves || 0} Leaves · {kpis.pendingCorrections || 0} Corrections
          </p>
        </div>
      </div>

      {/* Top Late Comers & Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Late-Comers */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Top Late Arrivals This Month</h3>
              <p className="text-xs text-zinc-500">Employees with multiple late check-ins (&gt; 09:15 AM)</p>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-zinc-900 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Daily Board</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topLate.length > 0 ? (
            <div className="divide-y divide-zinc-100">
              {topLate.map((item: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 font-mono text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-zinc-900">{item.employee}</span>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                    {item.lateCount} late days
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-zinc-500">
              Zero late arrivals recorded this month. Excellent punctuality record.
            </div>
          )}
        </div>

        {/* HR Action Shortcuts */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">Operational Workflows</h3>
            <p className="text-xs text-zinc-500 mb-4">Core HR execution modules for the current period</p>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('payroll')}
                className="w-full p-3 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50 transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">Prepare Monthly Payroll Draft</p>
                    <p className="text-[11px] text-zinc-500">Compute tax slabs, absent deductions, and draft payslips</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400" />
              </button>

              <button
                onClick={() => onNavigate('attendance')}
                className="w-full p-3 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50 transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">Review Daily Attendance & Corrections</p>
                    <p className="text-[11px] text-zinc-500">Examine timestamps, worked hours, and manual correction requests</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400" />
              </button>

              <button
                onClick={() => onNavigate('employees')}
                className="w-full p-3 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50 transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">Employee 360 & CSV Bulk Tools</p>
                    <p className="text-[11px] text-zinc-500">Dry-run batch import or export staff master directory</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
