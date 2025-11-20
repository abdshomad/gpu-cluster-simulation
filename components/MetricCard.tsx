
import React, { useState } from 'react';
import { ResponsiveContainer } from 'recharts';
import { Minimize2, Maximize2, Info } from 'lucide-react';

interface Props {
  title: string;
  colorClass: string;
  children: React.ReactNode;
  height?: string;
  colSpan?: string;
  description?: string;
}

export const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-lg text-xs font-mono z-50">
          <p className="text-slate-300 mb-1">{`T: ${label}`}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex justify-between gap-4">
                <span style={{ color: p.color }}>{p.name}:</span>
                <span className="text-slate-100 font-bold">{Number(p.value).toFixed(1)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
};

export const MetricCard: React.FC<Props> = ({ title, colorClass, children, height = "h-48", colSpan = "", description }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className={`bg-grafana-panel border border-slate-700 rounded-lg p-4 flex flex-col ${colSpan} ${isMinimized ? 'h-auto' : height} transition-all duration-300 relative group`}>
      <div className="flex justify-between items-center mb-2 shrink-0 relative z-20">
          <h3 className={`text-xs font-semibold ${colorClass} flex items-center gap-2 uppercase tracking-wider`}>
             {title}
          </h3>
          <div className="flex items-center gap-1">
            {description && (
                <button 
                    onClick={() => setShowInfo(!showInfo)}
                    className={`p-1 rounded transition-colors ${showInfo ? 'text-sky-400 bg-sky-500/10' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                    title="Info"
                >
                    <Info size={14} />
                </button>
            )}
            <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                title={isMinimized ? "Restore" : "Minimize"}
            >
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
          </div>
      </div>
      {!isMinimized && (
          <div className="flex-grow w-full min-h-0 animate-in fade-in duration-200 relative">
              {/* Description Overlay */}
              {showInfo && description && (
                  <div className="absolute inset-0 z-10 bg-slate-900/95 backdrop-blur-sm rounded border border-slate-700 p-4 flex items-center justify-center text-center animate-in fade-in duration-200">
                      <div>
                          <p className="text-sm text-slate-300 leading-relaxed font-medium">{description}</p>
                          <button 
                            onClick={() => setShowInfo(false)}
                            className="mt-3 text-xs text-sky-400 hover:text-sky-300 font-bold uppercase tracking-wider"
                          >
                            Dismiss
                          </button>
                      </div>
                  </div>
              )}
              
              <ResponsiveContainer width="100%" height="100%">
                  {children}
              </ResponsiveContainer>
          </div>
      )}
    </div>
  );
};
