import React, { useState } from 'react';
import { api } from '../../services/api';
import { IUser, ICompany } from '../../types/client';
import { ShieldCheck, Building2, KeyRound, CheckCircle2, AlertCircle, Database, Sparkles } from 'lucide-react';

interface FirstRunSetupProps {
  onSetupComplete: (user: IUser, company: ICompany, token: string) => void;
  authorizedEmail: string;
  onOpenHealth: () => void;
}

export const FirstRunSetup: React.FC<FirstRunSetupProps> = ({
  onSetupComplete,
  authorizedEmail,
  onOpenHealth,
}) => {
  const [companyName, setCompanyName] = useState('Saylani Enterprise Global');
  const [companyCode, setCompanyCode] = useState('SEG');
  const [adminName, setAdminName] = useState('Super Admin (Asad Qadri)');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.bootstrapAdmin({
        companyName,
        companyCode,
        adminName,
        email: authorizedEmail,
        password,
      });

      api.setToken(res.token);
      onSetupComplete(res.user, res.company, res.token);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize system.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold tracking-tight text-lg shadow-sm">
              H
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 leading-tight">HCM Lite</h1>
              <p className="text-xs text-zinc-500">Saylani Hackathon · Enterprise HR Suite</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors shadow-xs"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Database Health</span>
          </button>
        </div>

        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-zinc-200 rounded-2xl">
          <div className="mb-6 pb-6 border-b border-zinc-100">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-medium mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Phase 1 · One-Time Super Admin Bootstrap</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              Initialize Your Organization
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              The database is currently clean and uninitialized. Create the company organization settings and activate the primary Super Admin account.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-sm text-rose-800">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Setup Validation Notice</p>
                <p className="text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Authorized Email Lock */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Authorized Super Admin Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={authorizedEmail}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 text-sm font-medium cursor-not-allowed select-none"
                />
                <span className="absolute right-3 top-2.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                  Authorized Initial Admin
                </span>
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">
                Security requirement: Only this email address may bootstrap the first Super Admin. A dedicated HCM Lite password will be established below.
              </p>
            </div>

            {/* Admin Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Admin Full Name
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="e.g. Asad Qadri"
                className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Company Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Saylani Enterprises"
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Company Code */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Company Code (Prefix)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SAY"
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  New HCM Lite Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Google Password Exposure:</strong> This password is created exclusively for HCM Lite and stored as an encrypted bcrypt hash. Your Google account password is never accessed or requested.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Bootstrapping Organization...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Initialize System & Open Admin Console</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
