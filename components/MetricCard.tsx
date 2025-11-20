
import React from 'react';
import { ResponsiveContainer, Tooltip, CartesianGrid, YAxis } from 'recharts';

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

export const MetricCard: React.FC<Props> = ({ title, colorClass, children, height = "h-48", colSpan = "" }) => (
  <div className={`bg-grafana-panel border border-slate-700 rounded-lg p-4 ${height} flex flex-col ${colSpan}`}>
    <div className="flex justify-between items-center mb-2">
        <h3 className={`text-xs font-semibold ${colorClass} flex items-center gap-2 uppercase tracking-wider`}>
           {title}
        </h3>
    </div>
    <div className="flex-grow w-full">
        <ResponsiveContainer width="100%" height="100%">
            {children}
        </ResponsiveContainer>
    </div>
  </div>
);
