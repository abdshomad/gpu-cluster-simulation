
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TUTORIAL_STEPS } from '../constants';

interface Props {
    step: number;
    setStep: (s: number) => void;
}

const TutorialOverlay: React.FC<Props> = ({ step, setStep }) => (
    <div className="fixed top-20 left-0 right-0 z-40 px-6 pointer-events-none flex justify-center">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 p-6 rounded-2xl shadow-2xl max-w-3xl w-full pointer-events-auto animate-in slide-in-from-top-4">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-emerald-400">{TUTORIAL_STEPS[step].title}</h2>
                <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">Step {step + 1} / {TUTORIAL_STEPS.length}</span>
            </div>
            <p className="text-slate-300 leading-relaxed mb-6 text-lg">{TUTORIAL_STEPS[step].content}</p>
            <div className="flex justify-between">
                <button onClick={() => setStep(Math.max(0, step - 1))} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white px-3 py-2 rounded hover:bg-slate-800"><ChevronLeft size={16} /> Previous</button>
                <button onClick={() => setStep(Math.min(TUTORIAL_STEPS.length - 1, step + 1))} className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium"><ChevronRight size={16} /> Next</button>
            </div>
        </div>
    </div>
);
export default TutorialOverlay;
