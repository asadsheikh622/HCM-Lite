import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { downloadPayslipPdf } from '../../lib/payslipPdf';
import { IAttendance, IPayslip, IAnnouncement, ICompany } from '../../types/client';
import { Clock, Calendar, CheckCircle, AlertCircle, FileText, Download, Bell, Camera, MapPin, Sparkles } from 'lucide-react';

interface EmployeeDashboardProps {
  onNavigate: (tab: string) => void;
  company: ICompany | null;
  currentUser?: any;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ onNavigate, company, currentUser }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.mustChangePassword) {
      setLoading(false);
      return;
    }
    loadData();
  }, [currentUser?.mustChangePassword]);

  const loadData = async () => {
    if (currentUser?.mustChangePassword) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.getEmployeeAnalytics();
      setData(res);
    } catch (err: any) {
      if (err?.code === 'REQUIRE_PASSWORD_CHANGE' || err?.status === 403 || err?.message?.includes('Password change')) {
        setLoading(false);
        return;
      }
      console.warn('Employee analytics notice:', err?.message || err);
      setError(err?.message || 'Failed to load employee metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (withGeo = false) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;

      if (withGeo && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          console.warn('Geolocation unavailable or denied');
        }
      }

      const res = await api.checkIn({ lat, lng });
      setFeedback(res.message);
      loadData();
    } catch (err: any) {
      setFeedback(`Check-In Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.checkOut();
      setFeedback(res.message);
      loadData();
    } catch (err: any) {
      setFeedback(`Check-Out Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadSlip = (slip: IPayslip) => {
    downloadPayslipPdf(slip, null, company);
  };

  const att: IAttendance | null = data?.todayAttendance;
  const hoursThisWeek = data?.hoursThisWeek || 0;
  const lateCount = data?.lateCountMonth || 0;
  const leaveBalances = data?.leaveBalances || [];
  const lastPayslip: IPayslip | null = data?.lastPayslip;
  const announcements: IAnnouncement[] = data?.announcements || [];

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Title - Rendered immediately */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Personal Employee Portal</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time daily attendance check-in, weekly hours, leave allowances, and issued payslips.
          </p>
        </div>

        <button
          onClick={() => onNavigate('leave')}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          Request Time Off
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Check-In / Check-Out Widget & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Check-In Action Card */}
        <div className="p-6 bg-white rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Today's Attendance</span>
              {loading ? (
                <div className="h-5 w-20 bg-zinc-100 rounded-md animate-pulse"></div>
              ) : (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  att?.status === 'present'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                    : att?.status === 'late'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                    : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {att ? att.status.toUpperCase() : 'NOT CHECKED IN'}
                </span>
              )}
            </div>

            <div className="space-y-2 mt-4 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-100">
                <span className="text-zinc-500">Check-In Time:</span>
                <span className="font-mono font-semibold text-zinc-900">
                  {att?.checkInTime ? new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100">
                <span className="text-zinc-500">Check-Out Time:</span>
                <span className="font-mono font-semibold text-zinc-900">
                  {att?.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-500">Worked Hours Today:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {att?.workedHours ? `${att.workedHours} hrs` : '0.0 hrs'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-5 flex gap-2">
            {!att ? (
              <>
                <button
                  onClick={() => handleCheckIn(false)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Logging...' : 'Web Check-In'}
                </button>
                <button
                  onClick={() => handleCheckIn(true)}
                  disabled={actionLoading}
                  title="Check-In with GPS Geofence Verification"
                  className="p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl transition-colors cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </button>
              </>
            ) : !att.checkOutTime ? (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Logging...' : 'Web Check-Out'}
              </button>
            ) : (
              <div className="w-full py-2 text-center text-xs text-zinc-500 font-medium bg-zinc-50 rounded-xl border border-zinc-200">
                Day Completed ({att.workedHours}h logged)
              </div>
            )}
          </div>
        </div>

        {/* Weekly Hours Progress */}
        <div className="p-6 bg-white rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Weekly Target Progress</span>
              <Clock className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900">
              {hoursThisWeek} <span className="text-sm font-normal text-zinc-500">/ 40.0 hrs</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Standard 40-hour weekly operational baseline
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden mt-4">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (hoursThisWeek / 40) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex justify-between items-center text-xs">
            <span className="text-zinc-500">Late Arrivals This Month:</span>
            <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              {lateCount} times
            </span>
          </div>
        </div>

        {/* Latest Payslip Quick View */}
        <div className="p-6 bg-white rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Most Recent Payslip</span>
              <FileText className="w-4 h-4 text-zinc-400" />
            </div>

            {lastPayslip ? (
              <>
                <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
                  PKR {lastPayslip.netSalary.toLocaleString()}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Month of {lastPayslip.month} · {lastPayslip.isFinalized ? 'Finalized' : 'Draft'}
                </p>

                <div className="space-y-1.5 mt-3 text-xs text-zinc-600">
                  <div className="flex justify-between">
                    <span>Gross Salary:</span>
                    <span className="font-mono font-medium">PKR {lastPayslip.grossSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Tax:</span>
                    <span className="font-mono text-rose-600">- PKR {lastPayslip.monthlyTax.toLocaleString()}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-4 text-xs text-zinc-400">
                No payslips generated yet for your account. HR will prepare the monthly statement.
              </div>
            )}
          </div>

          {lastPayslip && (
            <button
              onClick={() => handleDownloadSlip(lastPayslip)}
              className="mt-4 flex items-center justify-center gap-2 py-2 px-3 border border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Statement</span>
            </button>
          )}
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Your Leave Quotas & Remaining Allowances</h3>
            <p className="text-xs text-zinc-500">Track paid and casual balance based on approved applications</p>
          </div>
          <button
            onClick={() => onNavigate('leave')}
            className="text-xs font-semibold text-zinc-900 hover:text-emerald-700"
          >
            Apply for Leave →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {leaveBalances.map((lt: any, idx: number) => (
            <div key={idx} className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="text-xs font-semibold text-zinc-700 block truncate">{lt.name}</span>
              <div className="text-xl font-bold font-mono tabular-nums text-zinc-900 mt-1">
                {lt.remaining} <span className="text-xs font-normal text-zinc-500">{typeof lt.remaining === 'number' ? 'days left' : ''}</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Quota: {lt.annualQuota > 0 ? `${lt.annualQuota} days` : 'Unlimited'} · Used: {lt.usedDays}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Company Announcements Noticeboard */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-6">
        <div className="flex items-center gap-2 pb-4 border-b border-zinc-100 mb-3">
          <Bell className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-bold text-zinc-900">Company Announcements & HR Bulletins</h3>
        </div>

        {announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann._id} className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-100 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-zinc-900">{ann.title}</span>
                  <span className="text-[10px] text-zinc-400">
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-zinc-600 leading-relaxed">{ann.content}</p>
                <p className="text-[10px] text-zinc-400 mt-2">Posted by {ann.postedByName}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 py-3">No announcements posted yet.</p>
        )}
      </div>
    </div>
  );
};
