import React from 'react';
import {
  Bell, X, ShieldAlert, CheckCircle2, Lock, Terminal, Activity,
  Clock, Trash2, ArrowRight, Shield
} from 'lucide-react';

export default function NotificationCenter({
  isOpen,
  onClose,
  attacks = [],
  onSelectAttack,
  onSelectIp,
  onClearAll
}) {
  if (!isOpen) return null;

  // Build telemetry alert events from attacks
  const alerts = attacks.slice(0, 30).map((atk, idx) => ({
    id: atk.session_id || idx,
    ip: atk.source_ip || '198.51.100.88',
    service: (atk.service || 'ssh').toUpperCase(),
    risk: atk.risk_level || (atk.risk_score >= 80 ? 'CRITICAL' : 'HIGH'),
    status: atk.status || 'ACTIVE',
    event: atk.event || `${atk.service || 'Honeypot'} deception trip detected`,
    time: atk.last_seen || atk.timestamp || atk.start_time || new Date().toISOString(),
    session_id: atk.session_id
  }));

  return (
    <div className="fixed inset-0 z-[250] flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md h-full bg-white border-l border-neutral-200 shadow-2xl flex flex-col slide-in-from-right duration-200">

        {/* Drawer Header */}
        <div className="p-5 border-b border-neutral-200 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f8c858]/20 flex items-center justify-center text-[#f8c858]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">TRINETRA Security Alerts</h3>
              <p className="text-[11px] text-neutral-400">{alerts.length} live telemetry events</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {alerts.length > 0 && onClearAll && (
              <button
                onClick={onClearAll}
                className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-white/10 rounded-lg transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Clear all alerts"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-neutral-100">
          {alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-neutral-800">All Systems Clear</p>
              <p className="text-xs text-neutral-500 mt-1">No unread security alerts captured</p>
            </div>
          ) : (
            alerts.map((al) => {
              const isCritical = al.risk === 'CRITICAL';
              const isContained = al.status === 'CONTAINED';

              return (
                <div key={al.id} className="pt-2.5 first:pt-0">
                  <div className="p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100/80 transition border border-neutral-200/70 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <button
                          onClick={() => {
                            if (onSelectIp) onSelectIp(al.ip);
                          }}
                          className="font-mono text-xs font-bold text-neutral-900 hover:text-blue-600 underline cursor-pointer"
                        >
                          {al.ip}
                        </button>
                        <span className="px-2 py-0.2 rounded-md bg-neutral-200/80 text-[9px] font-bold text-neutral-700">
                          {al.service}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isCritical ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {al.risk}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-700 font-medium leading-snug">
                      {al.event}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-200/50">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(al.time).toLocaleTimeString('en-GB')}
                      </span>

                      <div className="flex items-center gap-2">
                        {isContained ? (
                          <span className="text-emerald-600 font-bold">✓ Contained</span>
                        ) : (
                          <button
                            onClick={() => {
                              if (onSelectAttack && al.session_id) {
                                onSelectAttack(al.session_id);
                                onClose();
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Investigate</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200 bg-neutral-50 text-center text-[11px] text-neutral-500">
          TRINETRA Threat Monitoring Grid · Live Ingestion
        </div>

      </div>
    </div>
  );
}
