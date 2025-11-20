
import React from 'react';
import { Activity, Database, Workflow, BookOpen, Play, Square, Users } from 'lucide-react';
import { MODELS, TUTORIAL_STEPS } from '../constants';
import { LoadBalancingStrategy } from '../types';

interface Props {
    activeModelId: string;
    onSwitchModel: (id: string) => void;
    lbStrategy: LoadBalancingStrategy;
    setLbStrategy: (s: LoadBalancingStrategy) => void;
    tutorialStep: number | null;
    setTutorialStep: (s: number | null) => void;
    isRunning: boolean;
    setIsRunning: (v: boolean) => void;
    targetUserCount: number;
    setTargetUserCount: (n: number) => void;
}

const Header: React.FC<Props> = ({ activeModelId, onSwitchModel, lbStrategy, setLbStrategy, tutorialStep, setTutorialStep, isRunning, setIsRunning, targetUserCount, setTargetUserCount }) => {
    const isDistributed = MODELS[activeModelId].tpSize > 1;
    return (
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 fixed w-full top-0 z-50">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-ray to-vllm rounded-lg shadow-lg shadow-sky-900/20"><Activity size={20} className="text-white" /></div>
                <h1 className="font-bold text-lg tracking-tight">Ray & vLLM <span className="font-light text-slate-400">Sim</span></h1>
            </div>
            <div className="flex items-center gap-4">
                <div id="model-selector" className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 hidden md:flex">
                    {Object.values(MODELS).map(m => (
                        <div key={m.id} className="relative group">
                            <button onClick={() => onSwitchModel(m.id)} className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all ${activeModelId === m.id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                <Database size={12} /> {m.name}
                            </button>
                            {/* Tooltip */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-left ring-1 ring-white/10 transform origin-top scale-95 group-hover:scale-100">
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-t border-l border-slate-700 rotate-45"></div>
                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                                        <Database size={14} className="text-sky-500" />
                                        <span className="font-bold text-slate-200 text-xs">{m.name}</span>
                                        <span className="ml-auto text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">{m.paramSize}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">{m.description}</p>
                                    <div className="mt-2 flex gap-2">
                                        {m.tpSize > 1 ? (
                                            <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">Tensor Parallel (TP{m.tpSize})</span>
                                        ) : (
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Data Parallel (Replica)</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="relative group hidden lg:block">
                    <div className={`flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 ${isDistributed ? 'opacity-50' : ''}`}>
                        <div className="px-2 flex items-center gap-1 text-slate-500"><Workflow size={12} /><span className="text-[10px] font-bold uppercase">LB</span></div>
                        <select value={lbStrategy} onChange={(e) => setLbStrategy(e.target.value as any)} disabled={isDistributed} className="bg-transparent text-xs font-medium text-slate-300 focus:outline-none cursor-pointer py-1 pr-2">
                            {Object.values(LoadBalancingStrategy).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    {isDistributed && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center z-50">
                            Load balancing is handled automatically by Tensor Parallelism for large models.
                        </div>
                    )}
                </div>
                <div className="w-px h-4 bg-slate-700 hidden md:block"></div>
                <button onClick={() => setTutorialStep(tutorialStep === null ? 0 : null)} className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-medium text-sm border ${tutorialStep !== null ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                    <BookOpen size={14} /> {tutorialStep !== null ? 'Exit' : 'Tutorial'}
                </button>
                <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button onClick={() => setIsRunning(!isRunning)} className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-medium text-sm ${isRunning ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {isRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />} <span className="hidden sm:inline">{isRunning ? 'Pause' : 'Simulate'}</span>
                    </button>
                    <div className="w-px h-4 bg-slate-700 mx-2"></div>
                    <div className="flex items-center gap-2 px-2">
                        <Users size={14} className="text-slate-400" /><input type="range" min="0" max="50" step="5" value={targetUserCount} onChange={(e) => setTargetUserCount(parseInt(e.target.value))} disabled={tutorialStep !== null} className="w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                        <span className="text-xs font-mono w-6 text-right text-sky-400">{targetUserCount}</span>
                    </div>
                </div>
            </div>
        </header>
    );
};
export default Header;
