import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MetricPoint } from '../types';
import { COLORS } from '../constants';

interface Props {
  data: MetricPoint[];
}

const MetricsDashboard: React.FC<Props> = ({ data }) => {
  // Limit data points for performance
  const recentData = data.slice(-30);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-lg text-xs font-mono">
          <p className="text-slate-300">{`Time: ${label}`}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }}>
              {`${p.name}: ${Number(p.value).toFixed(1)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Throughput Panel */}
      <div className="bg-grafana-panel border border-slate-700 rounded-lg p-4 h-64 flex flex-col">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
               <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
               Token Throughput (tok/s)
            </h3>
            <span className="text-xs text-slate-500">Prometheus / vLLM</span>
        </div>
        <div className="flex-grow w-full">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={recentData}>
                <defs>
                    <linearGradient id="colorTp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="timestamp" hide />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => val.toFixed(0)} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="totalThroughput" stroke="#fbbf24" strokeWidth={2} fillOpacity={1} fill="url(#colorTp)" isAnimationActive={false} />
            </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Latency Panel */}
      <div className="bg-grafana-panel border border-slate-700 rounded-lg p-4 h-64 flex flex-col">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
               <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
               Latency P99 (ms)
            </h3>
            <span className="text-xs text-slate-500">Ray / Serve</span>
        </div>
        <div className="flex-grow w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="timestamp" hide />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avgLatency" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* GPU Util Panel */}
      <div className="bg-grafana-panel border border-slate-700 rounded-lg p-4 h-64 flex flex-col md:col-span-2">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-green-500 flex items-center gap-2">
               <span className="w-2 h-2 bg-green-500 rounded-full"></span>
               Cluster GPU Utilization (%)
            </h3>
            <span className="text-xs text-slate-500">DCGM Exporter</span>
        </div>
        <div className="flex-grow w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="timestamp" hide />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="stepAfter" dataKey="clusterUtilization" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;
