
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TUTORIAL_STEPS } from '../constants';

interface Props {
    step: number;
    setStep: (s: number) => void;
}

const TutorialOverlay: React.FC<Props> = ({ step, setStep }) => {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const currentStep = TUTORIAL_STEPS[step];

    useEffect(() => {
        const updatePosition = () => {
            if (currentStep.targetId) {
                const element = document.getElementById(currentStep.targetId);
                if (element) {
                    setTargetRect(element.getBoundingClientRect());
                } else {
                    setTargetRect(null);
                }
            } else {
                setTargetRect(null);
            }
        };

        updatePosition();
        
        // Create resize observer to track the target element's size changes
        const observer = new ResizeObserver(updatePosition);
        const element = currentStep.targetId ? document.getElementById(currentStep.targetId) : null;
        if (element) observer.observe(element);

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            observer.disconnect();
        };
    }, [step, currentStep.targetId]);

    return (
        <>
            {/* Highlight Box */}
            {targetRect && (
                <div 
                    className="fixed z-[55] border-2 border-emerald-400 rounded-xl pointer-events-none transition-all duration-300 ease-out shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                    }}
                >
                    <div className="absolute -top-3 left-4 bg-emerald-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
                        STEP {step + 1}
                    </div>
                </div>
            )}

            {/* Tutorial Card */}
            <div className="fixed top-24 left-0 right-0 z-[60] px-6 pointer-events-none flex justify-center">
                <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 p-6 rounded-2xl shadow-2xl max-w-3xl w-full pointer-events-auto animate-in slide-in-from-top-4">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-bold text-emerald-400">{currentStep.title}</h2>
                        <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">Step {step + 1} / {TUTORIAL_STEPS.length}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed mb-6 text-lg">{currentStep.content}</p>
                    <div className="flex justify-between">
                        <button 
                            onClick={() => setStep(Math.max(0, step - 1))} 
                            disabled={step === 0}
                            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white px-3 py-2 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <button 
                            onClick={() => setStep(Math.min(TUTORIAL_STEPS.length - 1, step + 1))} 
                            disabled={step === TUTORIAL_STEPS.length - 1}
                            className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
export default TutorialOverlay;
