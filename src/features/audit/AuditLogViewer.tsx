import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { IAuditLog } from '../../types/client';
import { Shield, Search, Eye, X, Terminal, Filter } from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [inspectLog, setInspectLog] = useState<IAuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs();
      setLogs(res.logs);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(term) ||
      l.actorName.toLowerCase().includes(term) ||
      l.entity.toLowerCase().includes(term) ||
      l.entityId.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Immutable Audit Trail</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Cryptographically recorded state modifications, payroll finalizations, and role operations (Admin Only).
        </p>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs flex items-center gap-3">
        <Search className="w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by action (e.g. BOOTSTRAP, REGISTER_EMPLOYEE, FINALIZE_PAYROLL), actor, or entity..."
          className="flex-1 bg-transparent text-xs text-zinc-900 focus:outline-none"
        />
        <span className="text-xs text-zinc-400 font-mono">
          {filteredLogs.length} Records
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading immutable audit feed...</div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase font-semibold text-[11px] tracking-wider border-b border-zinc-100">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Actor & Role</th>
                  <th className="px-5 py-3">Target Entity</th>
                  <th className="px-5 py-3 text-center">State Diffs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-zinc-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-zinc-900">{log.actorName}</div>
                      <div className="text-[10px] text-zinc-400 uppercase font-mono">{log.actorRole}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-zinc-800">{log.entity}</div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate max-w-xs">{log.entityId}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setInspectLog(log)}
                        className="px-2.5 py-1 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Inspect JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-zinc-500">
            No audit events matched your filter.
          </div>
        )}
      </div>

      {/* State JSON Inspector Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-950 text-zinc-100 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-800 font-mono text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">{inspectLog.action} · State Audit</span>
              </div>
              <button onClick={() => setInspectLog(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {inspectLog.beforeState && (
                <div>
                  <span className="text-rose-400 font-bold block mb-1 text-[11px] uppercase">Before State:</span>
                  <pre className="p-3 bg-black/60 rounded-xl overflow-x-auto text-zinc-300 border border-zinc-800/80">
                    {JSON.stringify(inspectLog.beforeState, null, 2)}
                  </pre>
                </div>
              )}

              {inspectLog.afterState && (
                <div>
                  <span className="text-emerald-400 font-bold block mb-1 text-[11px] uppercase">After State:</span>
                  <pre className="p-3 bg-black/60 rounded-xl overflow-x-auto text-zinc-300 border border-zinc-800/80">
                    {JSON.stringify(inspectLog.afterState, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
