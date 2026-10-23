import React, { useEffect, useState } from 'react';
import { AuditLogEntry } from '../types';
import { FileText, ShieldCheck, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';

export const AuditLogModal: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Audit & Safety Governance
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Immutable Agent Decision Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Every card recommendation, scraped evidence excerpt, mathematical reason, human approval status, and re-verification check is preserved here.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 text-xs text-slate-500">
          No agent evaluation runs recorded yet. Run the Offer Checker at checkout or execute the Test Lab scenarios.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Session & Input</th>
                  <th className="py-3 px-4">Selected Card</th>
                  <th className="py-3 px-4">Offer Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Final Payable</th>
                  <th className="py-3 px-4">Human Approval</th>
                  <th className="py-3 px-4">Re-verified</th>
                  <th className="py-3 px-4">Reasoning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {log.timestamp.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 truncate max-w-xs">{log.inputQuery}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Cart: ₹{log.cartTotal.toLocaleString('en-IN')} ({log.cartItemCount} items)</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {log.selectedCard}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-blue-600 font-bold whitespace-nowrap">
                      {log.winningOfferCode}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-emerald-600 font-bold whitespace-nowrap">
                      {log.discountGiven > 0 ? `₹${log.discountGiven.toLocaleString('en-IN')}` : '₹0'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                      ₹{log.finalPayable.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.approvalStatus === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.approvalStatus === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.approvalStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.reverified ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Passed</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                          <span>Pending / Flagged</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm truncate" title={log.reasoning}>
                      {log.reasoning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
