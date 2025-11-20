
import React, { useState } from 'react';
import { ResponsiveContainer } from 'recharts';
import { Minimize2, Maximize2 } from 'lucide-react';

interface Props {
  title: string;
  colorClass: string;
  children: React.ReactNode;
  height?: string;
  colSpan?: string;
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

export const MetricCard: React.FC<Props> = ({ title, colorClass, children, height = "h-48", colSpan = "" }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className={`bg-grafana-panel border border-slate-700 rounded-lg p-4 flex flex-col ${colSpan} ${isMinimized ? 'h-auto' : height} transition-all duration-300`}>
      <div className="flex justify-between items-center mb-2 shrink-0">
          <h3 className={`text-xs font-semibold ${colorClass} flex items-center gap-2 uppercase tracking-wider`}>
             {title}
          </h3>
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title={isMinimized ? "Restore" : "Minimize"}
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
      </div>
      {!isMinimized && (
          <div className="flex-grow w-full min-h-0 animate-in fade-in duration-200">
              <ResponsiveContainer width="100%" height="100%">
                  {children}
              </ResponsiveContainer>
          </div>
      )}
    </div>
  );
};
