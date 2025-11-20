
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
                <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 hidden md:flex">
                    {Object.values(MODELS).map(m => (
                        <button key={m.id} onClick={() => onSwitchModel(m.id)} className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all ${activeModelId === m.id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                            <Database size={12} /> {m.name}
                        </button>
                    ))}
                </div>
                <div className="relative group hidden lg:block">
                    <div className={`flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 ${isDistributed ? 'opacity-50' : ''}`}>
                        <div className="px-2 flex items-center gap-1 text-slate-500"><Workflow size={12} /><span className="text-[10px] font-bold uppercase">LB</span></div>
                        <select value={lbStrategy} onChange={(e) => setLbStrategy(e.target.value as any)} disabled={isDistributed} className="bg-transparent text-xs font-medium text-slate-300 focus:outline-none cursor-pointer py-1 pr-2">
                            {Object.values(LoadBalancingStrategy).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    {/* Tooltip omitted for brevity in this view, functionality remains in main App if needed or can be re-added */}
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
