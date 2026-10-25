import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ICompany, IDepartment, IDesignation, ILeaveType, IHoliday, IUser } from '../../types/client';
import {
  Building2,
  Clock,
  MapPin,
  Calendar,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface OrgSettingsProps {
  currentUser: IUser;
  company: ICompany | null;
  onCompanyUpdate: (company: ICompany) => void;
}

export const OrgSettings: React.FC<OrgSettingsProps> = ({ currentUser, company, onCompanyUpdate }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'departments' | 'designations' | 'leave' | 'holidays' | 'hr'>('rules');

  // Rules form state
  const [officeStartTime, setOfficeStartTime] = useState(company?.officeStartTime || '09:00');
  const [graceMinutes, setGraceMinutes] = useState(company?.graceMinutes || 15);
  const [halfDayHoursThreshold, setHalfDayHoursThreshold] = useState(company?.halfDayHoursThreshold || 5);
  const [lat, setLat] = useState(company?.officeCoordinates?.lat || 24.8607);
  const [lng, setLng] = useState(company?.officeCoordinates?.lng || 67.0011);
  const [radiusMeters, setRadiusMeters] = useState(company?.officeCoordinates?.radiusMeters || 150);
  const [rulesFeedback, setRulesFeedback] = useState<string | null>(null);

  // Departments
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');

  // Designations
  const [designations, setDesignations] = useState<IDesignation[]>([]);
  const [desName, setDesName] = useState('');
  const [desDeptId, setDesDeptId] = useState('');
  const [desGrade, setDesGrade] = useState('L3');

  // Leave Types
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
  const [ltName, setLtName] = useState('');
  const [ltCode, setLtCode] = useState('');
  const [ltQuota, setLtQuota] = useState(10);

  // Holidays
  const [holidays, setHolidays] = useState<IHoliday[]>([]);
  const [holName, setHolName] = useState('');
  const [holDate, setHolDate] = useState('');

  // HR Account
  const [hrName, setHrName] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [hrPassword, setHrPassword] = useState('HrStaff@2026');
  const [hrFeedback, setHrFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadAllOrgData();
  }, []);

  const loadAllOrgData = async () => {
    try {
      const [deptRes, desRes, ltRes, holRes] = await Promise.all([
        api.getDepartments(),
        api.getDesignations(),
        api.getLeaveTypes(),
        api.getHolidays(),
      ]);
      setDepartments(deptRes.departments);
      setDesignations(desRes.designations);
      setLeaveTypes(ltRes.leaveTypes);
      setHolidays(holRes.holidays);
      if (deptRes.departments.length > 0 && !desDeptId) {
        setDesDeptId(deptRes.departments[0]._id);
      }
    } catch (err) {
      console.error('Failed to load org data:', err);
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setRulesFeedback(null);
    try {
      const res = await api.updateCompany({
        officeStartTime,
        graceMinutes: Number(graceMinutes),
        halfDayHoursThreshold: Number(halfDayHoursThreshold),
        officeCoordinates: {
          lat: Number(lat),
          lng: Number(lng),
          radiusMeters: Number(radiusMeters),
        },
      });
      onCompanyUpdate(res.company);
      setRulesFeedback('Company attendance and geofence rules updated.');
    } catch (err: any) {
      setRulesFeedback(`Error: ${err.message}`);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName || !deptCode) return;
    try {
      await api.createDepartment({ name: deptName, code: deptCode });
      setDeptName('');
      setDeptCode('');
      loadAllOrgData();
    } catch (err: any) {
      alert(`Failed to create department: ${err.message}`);
    }
  };

  const handleAddDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desName || !desDeptId) return;
    try {
      await api.createDesignation({ departmentId: desDeptId, name: desName, grade: desGrade });
      setDesName('');
      loadAllOrgData();
    } catch (err: any) {
      alert(`Failed to create designation: ${err.message}`);
    }
  };

  const handleAddLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ltName || !ltCode) return;
    try {
      await api.createLeaveType({ name: ltName, code: ltCode, annualQuota: Number(ltQuota), isPaid: true });
      setLtName('');
      setLtCode('');
      loadAllOrgData();
    } catch (err: any) {
      alert(`Failed to create leave type: ${err.message}`);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holName || !holDate) return;
    try {
      await api.createHoliday({ name: holName, date: holDate });
      setHolName('');
      setHolDate('');
      loadAllOrgData();
    } catch (err: any) {
      alert(`Failed to add holiday: ${err.message}`);
    }
  };

  const handleCreateHR = async (e: React.FormEvent) => {
    e.preventDefault();
    setHrFeedback(null);
    try {
      const res = await api.createHRAccount({ name: hrName, email: hrEmail, password: hrPassword });
      setHrFeedback(res.message);
      setHrName('');
      setHrEmail('');
    } catch (err: any) {
      setHrFeedback(`Failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Organization & Governance</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Attendance rules, geofence radius, departments, designations, leave quotas, and HR accounts.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 transition-colors ${
            activeTab === 'rules' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Attendance & Geofence Rules
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 transition-colors ${
            activeTab === 'departments' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Departments ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('designations')}
          className={`pb-3 transition-colors ${
            activeTab === 'designations' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Designations ({designations.length})
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`pb-3 transition-colors ${
            activeTab === 'leave' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Leave Types & Quotas
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`pb-3 transition-colors ${
            activeTab === 'holidays' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Public Holidays ({holidays.length})
        </button>
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('hr')}
            className={`pb-3 transition-colors ${
              activeTab === 'hr' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Provision HR Accounts
          </button>
        )}
      </div>

      {/* Tab 1: Rules Form */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-6 max-w-2xl">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Company Operating Rules</h3>
          <p className="text-xs text-zinc-500 mb-5">
            Default challenge rules: 09:00 shift start, 15m grace period, &lt; 5 hours half-day threshold.
          </p>

          {rulesFeedback && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs">
              {rulesFeedback}
            </div>
          )}

          <form onSubmit={handleSaveRules} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Office Start Time</label>
                <input
                  type="time"
                  required
                  value={officeStartTime}
                  onChange={(e) => setOfficeStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Grace Period (Minutes)</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={60}
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Half-Day Threshold (Hrs)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={12}
                  value={halfDayHoursThreshold}
                  onChange={(e) => setHalfDayHoursThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100">
              <span className="text-[11px] font-semibold text-zinc-700 uppercase block mb-3">
                Office Geofence Coordinates
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Geofence Radius (m)</label>
                  <input
                    type="number"
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs"
              >
                Save Organizational Rules
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Departments */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-5 h-fit">
            <h3 className="text-sm font-bold text-zinc-900 mb-3">Add Department</h3>
            <form onSubmit={handleAddDepartment} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Finance & Accounts"
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FIN"
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono uppercase"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl"
              >
                Create Department
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 font-bold text-xs text-zinc-900">
              Configured Departments ({departments.length})
            </div>
            <div className="divide-y divide-zinc-100 text-xs">
              {departments.map((d) => (
                <div key={d._id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-zinc-900">{d.name}</span>
                    <span className="text-[11px] text-zinc-400 font-mono ml-2">[{d.code}]</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Designations */}
      {activeTab === 'designations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-5 h-fit">
            <h3 className="text-sm font-bold text-zinc-900 mb-3">Add Designation</h3>
            <form onSubmit={handleAddDesignation} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Department</label>
                <select
                  required
                  value={desDeptId}
                  onChange={(e) => setDesDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl"
                >
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Designation Title</label>
                <input
                  type="text"
                  required
                  value={desName}
                  onChange={(e) => setDesName(e.target.value)}
                  placeholder="e.g. Lead Software Architect"
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Career Grade</label>
                <input
                  type="text"
                  value={desGrade}
                  onChange={(e) => setDesGrade(e.target.value)}
                  placeholder="e.g. L4"
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl"
              >
                Create Designation
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 font-bold text-xs text-zinc-900">
              Configured Designations ({designations.length})
            </div>
            <div className="divide-y divide-zinc-100 text-xs">
              {designations.map((des) => (
                <div key={des._id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-zinc-900">{des.name}</span>
                    <span className="text-[11px] text-zinc-400 font-mono ml-2">Grade: {des.grade || 'Standard'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Leave Types */}
      {activeTab === 'leave' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-5 h-fit">
            <h3 className="text-sm font-bold text-zinc-900 mb-3">Add Custom Leave Type</h3>
            <form onSubmit={handleAddLeaveType} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Leave Name</label>
                <input
                  type="text"
                  required
                  value={ltName}
                  onChange={(e) => setLtName(e.target.value)}
                  placeholder="e.g. Paternity Leave"
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={ltCode}
                  onChange={(e) => setLtCode(e.target.value.toUpperCase())}
                  placeholder="e.g. PATERNITY"
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Annual Working Days Quota</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={ltQuota}
                  onChange={(e) => setLtQuota(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl"
              >
                Add Leave Type
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 font-bold text-xs text-zinc-900">
              Active Leave Types & Quotas ({leaveTypes.length})
            </div>
            <div className="divide-y divide-zinc-100 text-xs">
              {leaveTypes.map((lt) => (
                <div key={lt._id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-zinc-900">{lt.name}</span>
                    <span className="text-[11px] text-zinc-400 font-mono ml-2">[{lt.code}]</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900">
                    {lt.annualQuota > 0 ? `${lt.annualQuota} Days / Year` : 'Unlimited / Deducted'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Holidays */}
      {activeTab === 'holidays' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-5 h-fit">
            <h3 className="text-sm font-bold text-zinc-900 mb-3">Add Public Holiday</h3>
            <form onSubmit={handleAddHoliday} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Holiday Name</label>
                <input
                  type="text"
                  required
                  value={holName}
                  onChange={(e) => setHolName(e.target.value)}
                  placeholder="e.g. Independence Day"
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={holDate}
                  onChange={(e) => setHolDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl"
              >
                Add Holiday
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 font-bold text-xs text-zinc-900">
              Calendar of Public Holidays ({holidays.length})
            </div>
            <div className="divide-y divide-zinc-100 text-xs">
              {holidays.length > 0 ? (
                holidays.map((h) => (
                  <div key={h._id} className="p-3.5 flex items-center justify-between">
                    <span className="font-semibold text-zinc-900">{h.name}</span>
                    <span className="font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                      {h.date}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-zinc-400">No public holidays added yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Provision HR Accounts */}
      {activeTab === 'hr' && currentUser.role === 'admin' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-6 max-w-xl">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Create HR Staff Account</h3>
          <p className="text-xs text-zinc-500 mb-4">
            HR users can register employees, review leave and attendance corrections, and prepare payroll drafts.
          </p>

          {hrFeedback && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs">
              {hrFeedback}
            </div>
          )}

          <form onSubmit={handleCreateHR} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                value={hrName}
                onChange={(e) => setHrName(e.target.value)}
                placeholder="e.g. Sarah Khan"
                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Login Email</label>
              <input
                type="email"
                required
                value={hrEmail}
                onChange={(e) => setHrEmail(e.target.value)}
                placeholder="sarah.hr@company.com"
                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Temporary Password</label>
              <input
                type="text"
                required
                value={hrPassword}
                onChange={(e) => setHrPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl"
            >
              Provision HR Account
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
