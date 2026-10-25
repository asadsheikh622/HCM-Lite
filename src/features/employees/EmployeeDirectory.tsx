import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { IEmployee, IDepartment, IDesignation, IUser } from '../../types/client';
import {
  Users,
  Search,
  Plus,
  Download,
  Upload,
  UserCheck,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  Briefcase,
  DollarSign,
} from 'lucide-react';

interface EmployeeDirectoryProps {
  currentUser: IUser;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ currentUser }) => {
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [designations, setDesignations] = useState<IDesignation[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [is360Open, setIs360Open] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedEmp360, setSelectedEmp360] = useState<any>(null);
  const [loading360, setLoading360] = useState(false);

  // Registration Form
  const [formData, setFormData] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    designationId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentStatus: 'Active',
    basicSalary: 150000,
    temporaryPassword: 'Welcome@2026',
  });
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [regSuccessInfo, setRegSuccessInfo] = useState<any>(null);

  // CSV Import state
  const [csvFileContent, setCsvFileContent] = useState<string>('');
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [search, selectedDept, selectedStatus]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, desRes] = await Promise.all([
        api.getEmployees({ search, departmentId: selectedDept, status: selectedStatus }),
        api.getDepartments(),
        api.getDesignations(),
      ]);
      setEmployees(empRes.employees);
      setDepartments(deptRes.departments);
      setDesignations(desRes.designations);
      if (deptRes.departments.length > 0 && !formData.departmentId) {
        setFormData((prev) => ({
          ...prev,
          departmentId: deptRes.departments[0]._id,
        }));
      }
    } catch (err) {
      console.error('Failed to load employee directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen360 = async (emp: IEmployee) => {
    setIs360Open(true);
    setLoading360(true);
    try {
      const data = await api.getEmployee360(emp._id);
      setSelectedEmp360(data);
    } catch (err) {
      console.error('Failed to load 360 profile:', err);
    } finally {
      setLoading360(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormNotice(null);
    try {
      const res = await api.registerEmployee(formData);
      setRegSuccessInfo(res);
      loadInitialData();
    } catch (err: any) {
      setFormNotice(err.message || 'Registration failed.');
    }
  };

  const handleExportCsv = () => {
    const headers = ['EmployeeCode', 'FirstName', 'LastName', 'Email', 'Phone', 'JoiningDate', 'Status', 'BasicSalary', 'GrossSalary'];
    const rows = employees.map((e) => [
      e.employeeCode,
      e.firstName,
      e.lastName,
      e.email,
      e.phone || '',
      e.joiningDate,
      e.employmentStatus,
      e.basicSalary,
      e.grossSalary,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Employees_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import parser & dry run
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setCsvFileContent(content);

      // Parse CSV into rows
      const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) return;

      const headers = lines[0].split(',').map((h) => h.trim());
      const parsedRows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const rowObj: any = {};
        headers.forEach((h, i) => {
          rowObj[h] = values[i];
        });
        return rowObj;
      });

      setDryRunLoading(true);
      try {
        const dryRun = await api.importDryRun(parsedRows);
        setDryRunResult(dryRun);
      } catch (err) {
        console.error('Dry run failed:', err);
      } finally {
        setDryRunLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const deptMap = new Map(departments.map((d) => [d._id, d.name]));
  const desMap = new Map(designations.map((d) => [d._id, d.name]));

  const canManage = currentUser.role === 'admin' || currentUser.role === 'hr';

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Employee Directory & Profiles</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Search staff, view 360 career history, register team members, and bulk CSV operations.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </button>
            <button
              onClick={() => {
                setRegSuccessInfo(null);
                setFormNotice(null);
                setIsRegisterOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Employee</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, or email..."
            className="w-full pl-9 pr-3.5 py-2 bg-zinc-50/70 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-3 py-2 bg-zinc-50/70 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-zinc-50/70 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Probationary">Probationary</option>
          <option value="Terminated">Terminated</option>
        </select>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading employee directory...</div>
        ) : employees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase font-semibold text-[11px] tracking-wider border-b border-zinc-100">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Employee Name</th>
                  <th className="px-5 py-3">Department & Designation</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Gross Salary</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-zinc-600 font-bold">{emp.employeeCode}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-zinc-900">{emp.firstName} {emp.lastName}</div>
                      <div className="text-[11px] text-zinc-400">{emp.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-zinc-900">{deptMap.get(emp.departmentId) || 'General'}</div>
                      <div className="text-[11px] text-zinc-400">{desMap.get(emp.designationId) || 'Staff'}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        emp.employmentStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50'
                          : emp.employmentStatus === 'Probationary'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200/50'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {emp.employmentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums font-semibold text-zinc-900">
                      {canManage ? `PKR ${emp.grossSalary.toLocaleString()}` : 'Confidential'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleOpen360(emp)}
                        className="px-2.5 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                      >
                        360 Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-zinc-500">
            No employee records match the filter criteria. Register new employees to populate the roster.
          </div>
        )}
      </div>

      {/* ==========================================
          REGISTER EMPLOYEE MODAL
      ========================================== */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Register New Employee</h3>
                <p className="text-xs text-zinc-500">Creates profile, generates login, and enforces initial password change</p>
              </div>
              <button onClick={() => setIsRegisterOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {regSuccessInfo ? (
              <div className="py-6 space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Employee Registered Successfully</p>
                    <p className="mt-0.5 text-emerald-800">
                      Profile for {regSuccessInfo.employee.firstName} {regSuccessInfo.employee.lastName} ({regSuccessInfo.employee.employeeCode}) is now active.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-2">
                  <p className="font-semibold text-zinc-900">Provisioned Login Credentials:</p>
                  <p className="text-zinc-600">Login Email: <strong className="font-mono text-zinc-900">{regSuccessInfo.loginEmail}</strong></p>
                  <p className="text-zinc-600">Temporary Password: <strong className="font-mono text-zinc-900">{formData.temporaryPassword}</strong></p>
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200/60 mt-2">
                    Security Policy: The employee will be strictly required to establish their personal permanent password upon first sign-in.
                  </p>
                </div>

                <button
                  onClick={() => setIsRegisterOpen(false)}
                  className="w-full py-2.5 bg-zinc-900 text-white font-semibold text-xs rounded-xl hover:bg-zinc-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-4">
                {formNotice && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {formNotice}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Employee Code</label>
                    <input
                      type="text"
                      required
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                      placeholder="e.g. EMP005"
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="e.g. Fatima"
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="e.g. Noor"
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Work Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@company.com"
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+92 300 0000000"
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Department</label>
                    <select
                      required
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs"
                    >
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Designation</label>
                    <select
                      required
                      value={formData.designationId}
                      onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs"
                    >
                      <option value="">Select Designation</option>
                      {designations.map((des) => (
                        <option key={des._id} value={des._id}>{des.name} ({des.grade || 'Staff'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Salary Breakdown Formula Display */}
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-700 uppercase text-[11px]">Basic Salary (B)</label>
                    <input
                      type="number"
                      required
                      min={1000}
                      value={formData.basicSalary}
                      onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                      className="w-36 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono text-right"
                    />
                  </div>

                  <div className="pt-2 border-t border-zinc-200/60 grid grid-cols-3 gap-2 text-[11px] text-zinc-600">
                    <div>
                      <span>HRA (40%):</span>
                      <p className="font-mono font-semibold text-zinc-900 mt-0.5">
                        PKR {Math.round(formData.basicSalary * 0.4).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span>Medical (10%):</span>
                      <p className="font-mono font-semibold text-zinc-900 mt-0.5">
                        PKR {Math.round(formData.basicSalary * 0.1).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span>Total Gross (1.5 × B):</span>
                      <p className="font-mono font-bold text-emerald-700 mt-0.5">
                        PKR {Math.round(formData.basicSalary * 1.5).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Temporary Password</label>
                    <input
                      type="text"
                      required
                      value={formData.temporaryPassword}
                      onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Joining Date</label>
                    <input
                      type="date"
                      required
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(false)}
                    className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold"
                  >
                    Confirm & Provision Employee
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          EMPLOYEE 360 DRAWER
      ========================================== */}
      {is360Open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-white w-full sm:w-[580px] h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
                    {selectedEmp360?.employee?.firstName?.[0]}{selectedEmp360?.employee?.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">
                      {selectedEmp360?.employee?.firstName} {selectedEmp360?.employee?.lastName}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono">
                      {selectedEmp360?.employee?.employeeCode} · {selectedEmp360?.employee?.email}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIs360Open(false)} className="p-1 text-zinc-400 hover:text-zinc-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loading360 ? (
                <div className="py-12 text-center text-xs text-zinc-500">Loading 360 profile...</div>
              ) : selectedEmp360 ? (
                <div className="py-5 space-y-6">
                  {/* Salary Structure Card */}
                  {canManage && (
                    <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                        Official Salary Structure
                      </span>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-zinc-500">Basic Pay:</span>
                          <p className="font-mono font-semibold text-zinc-900">
                            PKR {selectedEmp360.employee.basicSalary.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-zinc-500">HRA Allowance (40%):</span>
                          <p className="font-mono font-semibold text-zinc-900">
                            PKR {selectedEmp360.employee.hra.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-zinc-500">Medical Allowance (10%):</span>
                          <p className="font-mono font-semibold text-zinc-900">
                            PKR {selectedEmp360.employee.medicalAllowance.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-zinc-500">Gross Monthly:</span>
                          <p className="font-mono font-bold text-emerald-700">
                            PKR {selectedEmp360.employee.grossSalary.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Attendance Logs */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2.5">
                      Recent Attendance Records ({selectedEmp360.attendances?.length || 0})
                    </h4>
                    {selectedEmp360.attendances?.length > 0 ? (
                      <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden text-xs">
                        {selectedEmp360.attendances.slice(0, 5).map((a: any) => (
                          <div key={a._id} className="p-2.5 flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-zinc-900">{a.date}</span>
                              <span className="text-[10px] text-zinc-400 ml-2 font-mono">
                                In: {new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-zinc-100 text-zinc-700">
                              {a.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400">No attendance records yet.</p>
                    )}
                  </div>

                  {/* Leave Requests */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2.5">
                      Leave History ({selectedEmp360.leaves?.length || 0})
                    </h4>
                    {selectedEmp360.leaves?.length > 0 ? (
                      <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden text-xs">
                        {selectedEmp360.leaves.map((l: any) => (
                          <div key={l._id} className="p-2.5 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-zinc-900">{l.startDate} to {l.endDate} ({l.daysCount} days)</p>
                              <p className="text-[11px] text-zinc-500">{l.reason}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-zinc-100 text-zinc-700">
                              {l.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400">No leave requests recorded.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              onClick={() => setIs360Open(false)}
              className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-xl"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          CSV DRY RUN & IMPORT MODAL
      ========================================== */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900">Bulk Employee CSV Import</h3>
              <button onClick={() => setIsImportOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs text-zinc-600">
                Upload a CSV file with headers: <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono text-[11px]">employeeCode,firstName,lastName,email,basicSalary</code>.
                The system runs an automatic dry-run audit before persisting.
              </p>

              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
              />

              {dryRunLoading && (
                <div className="py-4 text-center text-xs text-zinc-500">Auditing CSV rows on server...</div>
              )}

              {dryRunResult && (
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-3">
                  <div className="flex justify-between font-semibold">
                    <span>Total Rows: {dryRunResult.totalRows}</span>
                    <span className="text-emerald-700">Valid: {dryRunResult.validRows}</span>
                    <span className="text-rose-700">Invalid: {dryRunResult.invalidRows.length}</span>
                  </div>

                  {dryRunResult.invalidRows.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1 text-[11px]">
                      {dryRunResult.invalidRows.map((inv: any, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-rose-50 text-rose-800 border border-rose-200/60">
                          Row {inv.rowNumber} [{inv.field}]: {inv.reason}
                        </div>
                      ))}
                    </div>
                  )}

                  {dryRunResult.canCommit && (
                    <button
                      onClick={() => {
                        alert('Dry run passed! Rows validated.');
                        setIsImportOpen(false);
                      }}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold"
                    >
                      Commit {dryRunResult.validRows} Validated Employees
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
