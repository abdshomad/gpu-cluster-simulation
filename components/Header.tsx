

import React, { useState, useRef, useEffect } from 'react';
import { Activity, Database, Workflow, BookOpen, Play, Square, Users, ChevronDown, CheckSquare, Square as SquareIcon, Lock, Network } from 'lucide-react';
import { MODELS, NETWORK_CAPACITY } from '../constants';
import { LoadBalancingStrategy, NetworkSpeed } from '../types';

interface Props {
    activeModelIds: string[];
    onToggleModel: (id: string) => void;
    lbStrategy: LoadBalancingStrategy;
    setLbStrategy: (s: LoadBalancingStrategy) => void;
    networkSpeed: NetworkSpeed;
    setNetworkSpeed: (s: NetworkSpeed) => void;
    tutorialStep: number | null;
    setTutorialStep: (s: number | null) => void;
    isRunning: boolean;
    setIsRunning: (v: boolean) => void;
    targetUserCount: number;
    setTargetUserCount: (n: number) => void;
}

const Header: React.FC<Props> = ({ 
    activeModelIds, onToggleModel, 
    lbStrategy, setLbStrategy, 
    networkSpeed, setNetworkSpeed,
    tutorialStep, setTutorialStep, 
    isRunning, setIsRunning, 
    targetUserCount, setTargetUserCount 
}) => {
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Determine if distributed strategy is forced (if any active model is TP > 1)
    const isDistributed = activeModelIds.some(id => MODELS[id].tpSize > 1);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsModelDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getActiveModelLabel = () => {
        if (activeModelIds.length === 0) return "Select Model";
        if (activeModelIds.length === 1) return MODELS[activeModelIds[0]].name;
        return `${activeModelIds.length} Models Active`;
    };

    return (
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-4 md:px-6 fixed w-full top-0 z-50">
            <div className="flex items-center gap-3 shrink-0">
                <div className="p-2 bg-gradient-to-br from-ray to-vllm rounded-lg shadow-lg shadow-sky-900/20"><Activity size={20} className="text-white" /></div>
                <h1 className="font-bold text-lg tracking-tight hidden sm:block">Ray & vLLM <span className="font-light text-slate-400">Sim</span></h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end min-w-0">
                {/* Model Selector Dropdown */}
                <div id="model-selector" className="relative shrink-0" ref={dropdownRef}>
                    <button 
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="flex items-center gap-2 bg-slate-800 p-1.5 px-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors min-w-[140px] md:min-w-[200px] justify-between group"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <Database size={14} className="text-sky-500 group-hover:scale-110 transition-transform shrink-0" />
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-xs font-bold text-slate-200 truncate max-w-[90px] md:max-w-[140px]">{getActiveModelLabel()}</span>
                            </div>
                        </div>
                        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 shrink-0 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isModelDropdownOpen && (
                        <div className="absolute top-full right-0 md:left-0 mt-2 w-80 max-h-[60vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 animate-in zoom-in-95 duration-100 ring-1 ring-white/5">
                            <div className="p-1.5 space-y-1">
                                <div className="px-2 py-1.5 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Available Models</div>
                                {Object.values(MODELS).map((m) => {
                                    const isActive = activeModelIds.includes(m.id);
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => onToggleModel(m.id)}
                                            className={`w-full flex items-start gap-3 p-2.5 rounded-lg transition-all group text-left ${isActive ? 'bg-slate-800/80 ring-1 ring-sky-500/30' : 'hover:bg-slate-800'}`}
                                        >
                                            <div className={`mt-0.5 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                                                {isActive ? <CheckSquare size={16} /> : <SquareIcon size={16} />}
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>{m.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800">{m.paramSize}</span>
                                                    {m.tpSize > 1 ? (
                                                        <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">TP{m.tpSize}</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Single Node</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-tight group-hover:text-slate-400 transition-colors">{m.description}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Network Speed Selector */}
                <div className="hidden lg:flex items-center p-1 rounded-lg border bg-slate-800 border-slate-700 gap-2">
                     <div className="px-2 flex items-center gap-1 text-slate-500">
                        <Network size={12} />
                        <span className="text-[10px] font-bold uppercase">Net</span>
                     </div>
                     <select 
                        value={networkSpeed} 
                        onChange={(e) => setNetworkSpeed(e.target.value as any)}
                        className="bg-transparent text-xs font-medium text-slate-300 focus:outline-none cursor-pointer py-1 pr-2"
                    >
                        {Object.entries(NETWORK_CAPACITY).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                </div>

                {/* Load Balancing Strategy Selector */}
                <div className="relative group hidden xl:block">
                    <div className={`flex items-center p-1 rounded-lg border transition-colors ${
                        isDistributed 
                            ? 'bg-purple-500/10 border-purple-500/30' 
                            : 'bg-slate-800 border-slate-700'
                    }`}>
                        <div className={`px-2 flex items-center gap-1 ${isDistributed ? 'text-purple-400' : 'text-slate-500'}`}>
                            <Workflow size={12} />
                            <span className="text-[10px] font-bold uppercase">LB</span>
                        </div>
                        
                        {isDistributed ? (
                            <div className="flex items-center gap-2 px-2 py-1 cursor-not-allowed">
                                <span className="text-xs font-bold text-purple-300">Distributed</span>
                                <Lock size={12} className="text-purple-400/70" />
                            </div>
                        ) : (
                            <select 
                                value={lbStrategy} 
                                onChange={(e) => setLbStrategy(e.target.value as any)} 
                                className="bg-transparent text-xs font-medium text-slate-300 focus:outline-none cursor-pointer py-1 pr-2"
                            >
                                {Object.values(LoadBalancingStrategy).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                <div className="w-px h-4 bg-slate-700 hidden md:block"></div>
                
                <button onClick={() => setTutorialStep(tutorialStep === null ? 0 : null)} className={`hidden md:flex items-center gap-2 px-4 py-1.5 rounded-md font-medium text-sm border transition-all ${tutorialStep !== null ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                    <BookOpen size={14} /> {tutorialStep !== null ? 'Exit' : 'Tutorial'}
                </button>
                
                <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 shrink-0">
                    <button onClick={() => setIsRunning(!isRunning)} className={`flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-md font-medium text-sm transition-all ${isRunning ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}>
                        {isRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />} <span className="hidden sm:inline">{isRunning ? 'Pause' : 'Simulate'}</span>
                    </button>
                    <div className="w-px h-4 bg-slate-700 mx-2"></div>
                    <div className="flex items-center gap-2 px-2">
                        <Users size={14} className="text-slate-400" /><input type="range" min="0" max="50" step="5" value={targetUserCount} onChange={(e) => setTargetUserCount(parseInt(e.target.value))} disabled={tutorialStep !== null} className="w-16 md:w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                        <span className="text-xs font-mono w-6 text-right text-sky-400">{targetUserCount}</span>
                    </div>
                </div>
            </div>
        </header>
    );
};
export default Header;