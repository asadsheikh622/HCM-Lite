import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Database, X, CheckCircle2, AlertTriangle, RefreshCw, Terminal, Sparkles } from 'lucide-react';

interface DatabaseHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const DatabaseHealthModal: React.FC<DatabaseHealthModalProps> = ({ isOpen, onClose, isAdmin }) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await api.getHealth();
      setHealthData(data);
    } catch (err: any) {
      console.error('Health fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  const handleSeedDemo = async () => {
    if (!window.confirm('Seed fictional demo data? This will create 3 sample employees, departments, and attendance records for testing.')) {
      return;
    }
    setSeeding(true);
    setSeedNotice(null);
    try {
      const res = await api.seedDemo();
      setSeedNotice(res.message);
      fetchHealth();
    } catch (err: any) {
      setSeedNotice(`Seed failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Database & System Health</h3>
              <p className="text-xs text-zinc-500">MongoDB Atlas Connectivity & Diagnostic Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
              title="Refresh Health"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {healthData ? (
          <div className="mt-5 space-y-5">
            {/* Connection Status Banner */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              healthData.database.mode === 'atlas'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {healthData.database.mode === 'atlas' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-sm">
                  {healthData.database.mode === 'atlas'
                    ? 'Connected to MongoDB Atlas (Persistent Cluster)'
                    : 'Running in Standalone In-Memory Mode'}
                </p>
                <p className="text-xs mt-0.5 opacity-90">
                  {healthData.database.mode === 'atlas'
                    ? `Cluster Host: ${healthData.database.host} · Database: ${healthData.database.name}`
                    : 'Atlas connection string is not provided or connecting. HCM Lite is utilizing the embedded memory repository so all hackathon features and workflows can be evaluated instantly.'}
                </p>
              </div>
            </div>

            {/* Diagnostic Key-Values */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Database Mode</span>
                <p className="text-sm font-semibold text-zinc-900 mt-1 capitalize font-mono">{healthData.database.mode}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Database Name</span>
                <p className="text-sm font-semibold text-zinc-900 mt-1 font-mono">{healthData.database.name}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Super Admin Bootstrap</span>
                <p className="text-sm font-semibold text-zinc-900 mt-1">
                  {healthData.system.superAdminExists ? 'Active / Initialized' : 'Pending First-Run'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Authorized Initial Admin</span>
                <p className="text-xs font-semibold text-zinc-900 mt-1 truncate" title={healthData.system.initialAdminEmail}>
                  {healthData.system.initialAdminEmail}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Gemini AI Engine</span>
                <p className="text-sm font-semibold text-zinc-900 mt-1">
                  {healthData.system.geminiConfigured ? 'Connected (Gemini 3.8)' : 'Policy Fallback Mode'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">API Health</span>
                <p className="text-sm font-semibold text-emerald-600 mt-1 font-mono">200 OK</p>
              </div>
            </div>

            {/* Atlas Connection Guide */}
            <div className="p-4 rounded-xl bg-zinc-900 text-zinc-100 text-xs space-y-2">
              <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
                <Terminal className="w-3.5 h-3.5" />
                <span>MongoDB Atlas Setup Guide</span>
              </div>
              <p className="text-zinc-300">
                To connect to MongoDB Atlas in local Windows or production:
              </p>
              <div className="bg-black/50 p-2.5 rounded-lg font-mono text-[11px] text-emerald-400 select-all overflow-x-auto">
                MONGODB_URI="mongodb+srv://&lt;db_user&gt;:&lt;db_password&gt;@cluster0.abcde.mongodb.net/hcm_lite?retryWrites=true&amp;w=majority"
              </div>
              <p className="text-zinc-400 text-[11px]">
                1. In MongoDB Atlas, create a free M0 cluster.<br />
                2. Add Database User under Database Access.<br />
                3. Allow 0.0.0.0/0 under Network Access (IP Access List).<br />
                4. Paste your URI into .env or the AI Studio Secrets panel.
              </p>
            </div>

            {/* Optional Demo Seed Button */}
            {isAdmin && (
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-900">Optional Demo Test Data</p>
                  <p className="text-[11px] text-zinc-500">
                    Seed 3 fictional employees, departments, and attendance for testing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSeedDemo}
                  disabled={seeding}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
                  <span>{seeding ? 'Seeding...' : 'Seed Demo Data'}</span>
                </button>
              </div>
            )}

            {seedNotice && (
              <div className="p-3 rounded-lg bg-zinc-100 text-xs text-zinc-700">
                {seedNotice}
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-500">Loading diagnostic health probe...</div>
        )}
      </div>
    </div>
  );
};
