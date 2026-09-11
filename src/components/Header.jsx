import React from 'react';
import { 
  Shield, 
  Activity, 
  Terminal, 
  Dna, 
  Database, 
  Cpu, 
  FileText, 
  Zap,
  Play
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  useMock, 
  setUseMock, 
  wsConnected, 
  onTriggerDemoAttack,
  activeAttackCount
}) {
  return (
    <header className="bg-zinc-950 border-b border-zinc-800 w-full px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brand logo & title */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-zinc-900 border border-zinc-700 rounded text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide font-mono flex items-center">
              SOC DECEPTION PLATFORM
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-sans border border-zinc-700">v3.4</span>
            </h1>
            <p className="text-[11px] text-zinc-400">Cyber Deception & Threat Intelligence Console</p>
          </div>
        </div>

        {/* Minimal Navigation Bar */}
        <nav className="flex items-center space-x-1 bg-zinc-900/80 p-1 rounded border border-zinc-800 font-mono text-xs">
          {[
            { id: 'command', label: 'Command Center', icon: Activity },
            { id: 'live', label: 'Live Attacks', icon: Zap, count: activeAttackCount },
            { id: 'investigation', label: 'Investigation & Flow', icon: Terminal },
            { id: 'dna', label: 'Attacker DNA', icon: Dna },
            { id: 'ioc', label: 'IOC Intelligence', icon: Database },
            { id: 'mitre', label: 'MITRE ATT&CK', icon: Cpu },
            { id: 'report', label: 'Threat Reports', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-1.5 rounded transition ${
                  isActive
                    ? 'bg-white text-black font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    isActive ? 'bg-black text-white' : 'bg-white text-black'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Status controls */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-2 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 text-zinc-300">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-white' : 'bg-zinc-600'}`}></span>
            <span>{useMock ? 'MOCK API' : 'LIVE API'}</span>
            <button 
              onClick={() => setUseMock(!useMock)} 
              className="text-[10px] underline text-zinc-400 hover:text-white ml-1"
            >
              TOGGLE
            </button>
          </div>

          <button 
            onClick={onTriggerDemoAttack}
            className="flex items-center bg-white hover:bg-zinc-200 text-black border border-white px-3 py-1 rounded text-xs font-bold transition"
          >
            <Play className="w-3 h-3 mr-1 fill-current" />
            SIMULATE ATTACK
          </button>
        </div>
      </div>
    </header>
  );
}
