import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ILeaveRequest, ILeaveType, IEmployee, IUser } from '../../types/client';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  AlertCircle,
  Plus,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

interface LeaveManagerProps {
  currentUser: IUser;
  prefilledLeave?: any;
}

export const LeaveManager: React.FC<LeaveManagerProps> = ({ currentUser, prefilledLeave }) => {
  const [leaves, setLeaves] = useState<ILeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Natural Language input
  const [nlText, setNlText] = useState('');
  const [parsingNL, setParsingNL] = useState(false);

  // HR Review modal
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (prefilledLeave) {
      if (prefilledLeave.leaveTypeId) setSelectedType(prefilledLeave.leaveTypeId);
      if (prefilledLeave.startDate) setStartDate(prefilledLeave.startDate);
      if (prefilledLeave.endDate) setEndDate(prefilledLeave.endDate);
      if (prefilledLeave.reason) setReason(prefilledLeave.reason);
      setIsApplyOpen(true);
    }
  }, [prefilledLeave]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [typesRes, empRes] = await Promise.all([
        api.getLeaveTypes(),
        api.getEmployees(),
      ]);
      setLeaveTypes(typesRes.leaveTypes);
      setEmployees(empRes.employees);

      if (typesRes.leaveTypes.length > 0 && !selectedType) {
        setSelectedType(typesRes.leaveTypes[0]._id);
      }

      if (currentUser.role === 'employee') {
        const myRes = await api.getMyLeave();
        setLeaves(myRes.leaves);
        setBalances(myRes.balances);
      } else {
        const allRes = await api.getAllLeave();
        setLeaves(allRes.leaves);
      }
    } catch (err) {
      console.error('Failed to load leave records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartParse = async () => {
    if (!nlText.trim()) return;
    setParsingNL(true);
    setApplyError(null);
    try {
      const res = await api.parseSmartLeave(nlText);
      if (res.leaveTypeId) setSelectedType(res.leaveTypeId);
      if (res.startDate) setStartDate(res.startDate);
      if (res.endDate) setEndDate(res.endDate);
      if (res.reason) setReason(res.reason);
      setIsApplyOpen(true);
      setApplyFeedback('Fields populated using Gemini Natural Language extraction. Please review and submit.');
    } catch (err: any) {
      setApplyError(`Smart leave extraction notice: ${err.message}`);
    } finally {
      setParsingNL(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);
    setApplyFeedback(null);
    try {
      const res = await api.applyLeave({
        leaveTypeId: selectedType,
        startDate,
        endDate,
        reason,
      });
      setApplyFeedback(res.message);
      setReason('');
      loadData();
      setTimeout(() => setIsApplyOpen(false), 2000);
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit leave.');
    }
  };

  const handleCancelLeave = async (id: string) => {
    if (!window.confirm('Cancel this pending leave request?')) return;
    try {
      await api.cancelLeave(id);
      loadData();
    } catch (err: any) {
      alert(`Error cancelling leave: ${err.message}`);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewId) return;
    try {
      await api.reviewLeave(reviewId, reviewAction, reviewComment);
      setReviewId(null);
      setReviewComment('');
      loadData();
    } catch (err: any) {
      alert(`Error updating leave status: ${err.message}`);
    }
  };

  const empMap = new Map(employees.map((e) => [e._id, `${e.firstName} ${e.lastName} (${e.employeeCode})`]));
  const typeMap = new Map(leaveTypes.map((lt) => [lt._id, lt.name]));
  const canManage = currentUser.role === 'admin' || currentUser.role === 'hr';

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Leave Management & Time Off</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Quota balances, natural language requests, working-day validation, and HR adjudications.
          </p>
        </div>

        {currentUser.role === 'employee' && (
          <button
            onClick={() => {
              setApplyError(null);
              setApplyFeedback(null);
              setIsApplyOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Apply for Leave</span>
          </button>
        )}
      </div>

      {/* Smart Leave Natural Language Assistant Box (Employee) */}
      {currentUser.role === 'employee' && (
        <div className="p-5 rounded-2xl bg-zinc-900 text-white border border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Smart Leave Natural Language Assistant</span>
          </div>
          <p className="text-xs text-zinc-300 mb-3">
            Type your request naturally (e.g. <em>"I need 3 days of sick leave starting next Monday because of high fever"</em>). Gemini parses the schedule and populates your form for review.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              placeholder="e.g. Taking 2 days casual leave this Thursday and Friday for a family wedding"
              className="flex-1 px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleSmartParse}
              disabled={parsingNL || !nlText.trim()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {parsingNL ? 'Parsing...' : 'Parse & Autofill'}
            </button>
          </div>
        </div>
      )}

      {/* Leave Balances Strip (Employee) */}
      {currentUser.role === 'employee' && balances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {balances.map((b: any, idx: number) => (
            <div key={idx} className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block truncate">
                {b.name}
              </span>
              <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900 mt-1">
                {b.remainingDays} <span className="text-xs font-normal text-zinc-500">days</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">
                Used: {b.usedDays} / {b.annualQuota > 0 ? `${b.annualQuota} days` : 'Unlimited'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Leave Records Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900">
            {currentUser.role === 'employee' ? 'My Leave Applications' : 'Company Leave Applications & Approvals'}
          </h3>
          <span className="text-xs text-zinc-500 font-mono">
            {leaves.length} Requests
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading leave requests...</div>
        ) : leaves.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase font-semibold text-[11px] tracking-wider border-b border-zinc-100">
                <tr>
                  {canManage && <th className="px-5 py-3">Employee</th>}
                  <th className="px-5 py-3">Leave Type</th>
                  <th className="px-5 py-3">Dates</th>
                  <th className="px-5 py-3 text-right">Working Days</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {leaves.map((l) => (
                  <tr key={l._id} className="hover:bg-zinc-50/60 transition-colors">
                    {canManage && (
                      <td className="px-5 py-3.5 font-semibold text-zinc-900">
                        {empMap.get(l.employeeId) || l.employeeId}
                      </td>
                    )}
                    <td className="px-5 py-3.5 font-semibold text-zinc-900">
                      {typeMap.get(l.leaveTypeId) || 'Leave'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-600">
                      {l.startDate} → {l.endDate}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums font-bold text-zinc-900">
                      {l.daysCount}d
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 max-w-xs truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        l.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50'
                          : l.status === 'rejected'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200/50'
                          : l.status === 'cancelled'
                          ? 'bg-zinc-100 text-zinc-500'
                          : 'bg-amber-50 text-amber-800 border border-amber-200/50'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {canManage && l.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setReviewId(l._id);
                              setReviewAction('approved');
                            }}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setReviewId(l._id);
                              setReviewAction('rejected');
                            }}
                            className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : currentUser.role === 'employee' && l.status === 'pending' ? (
                        <button
                          onClick={() => handleCancelLeave(l._id)}
                          className="px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-xs text-zinc-500">
            No leave requests recorded. Submit an application above.
          </div>
        )}
      </div>

      {/* ==========================================
          APPLY LEAVE MODAL
      ========================================== */}
      {isApplyOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900">Apply for Leave</h3>
              <button onClick={() => setIsApplyOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600">
                &times;
              </button>
            </div>

            {applyFeedback && (
              <div className="my-3 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs">
                {applyFeedback}
              </div>
            )}
            {applyError && (
              <div className="my-3 p-3 rounded-lg bg-rose-50 text-rose-800 text-xs">
                {applyError}
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Leave Category</label>
                <select
                  required
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl"
                >
                  {leaveTypes.map((lt) => (
                    <option key={lt._id} value={lt._id}>
                      {lt.name} ({lt.annualQuota > 0 ? `${lt.annualQuota}d quota` : 'Unpaid/No Quota'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Reason for Absence</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide concise details for HR record..."
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl"
                />
              </div>

              <p className="text-[11px] text-zinc-500">
                Note: Server automatically excludes weekends and gazetted public holidays from working-day counts.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApplyOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          HR REVIEW COMMENTS MODAL
      ========================================== */}
      {reviewId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200">
            <h3 className="text-base font-bold text-zinc-900">
              {reviewAction === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Add optional adjudication notes for the employee notification
            </p>

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">
                  HR Review Comment
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="e.g. Approved per project schedule coverage..."
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewId(null)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-semibold ${
                    reviewAction === 'approved' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  Confirm {reviewAction.toUpperCase()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
