
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { MetricPoint } from '../types';

interface Props {
  data: MetricPoint[];
}

const WORKER_COLORS = [
  '#f87171', // red
  '#fb923c', // orange
  '#fbbf24', // amber
  '#a3e635', // lime
  '#4ade80', // green
  '#34d399', // emerald
  '#22d3ee', // cyan
  '#60a5fa', // blue
  '#818cf8', // indigo
  '#c084fc', // fuchsia
];

const MetricsDashboard: React.FC<Props> = ({ data }) => {
  const recentData = data.slice(-50);

  // Flatten data for stacked chart
  const chartData = recentData.map(d => ({
      ...d,
      ...d.nodeActiveTokens
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Throughput Panel */}
      <div className="bg-grafana-panel border border-slate-700 rounded-lg p-4 h-48 flex flex-col">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-yellow-400 flex items-center gap-2 uppercase tracking-wider">
               Throughput (tok/s)
            </h3>
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
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
                <Area type="monotone" dataKey="totalThroughput" stroke="#fbbf24" strokeWidth={2} fill="url(#colorTp)" isAnimationActive={false} />
            </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Latency Panel */}
      <div className="bg-grafana-panel border border-slate-700 rounded-lg p-4 h-48 flex flex-col">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-cyan-400 flex items-center gap-2 uppercase tracking-wider">
               Latency P99 (ms)
            </h3>
        </div>
        <div className="flex-grow w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
                <Line type="monotone" dataKey="avgLatency" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* GPU Utilization Panel */}
      <div className="bg-grafana-panel border border-slate-700 rounded-lg p-4 h-48 flex flex-col">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-violet-400 flex items-center gap-2 uppercase tracking-wider">
               GPU Utilization (%)
            </h3>
        </div>
        <div className="flex-grow w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recentData}>
                <defs>
                    <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
                <Line type="monotone" dataKey="clusterUtilization" name="GPU Util" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="clusterUtilization" stroke="none" fill="url(#colorUtil)" isAnimationActive={false} />
            </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Queue Depth Panel */}
      <div className="bg-grafana-panel border border-slate-700 rounded-lg p-4 h-48 flex flex-col">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-rose-400 flex items-center gap-2 uppercase tracking-wider">
               Queue Depth
            </h3>
        </div>
        <div className="flex-grow w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
                <Line type="stepAfter" dataKey="queueDepth" name="Pending Reqs" stroke="#f43f5e" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Avg GPU Temp Panel (Resized to half) */}
      <div className="bg-grafana-panel border border-slate-700 rounded-lg p-4 h-48 flex flex-col md:col-span-2 lg:col-span-2">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-orange-400 flex items-center gap-2 uppercase tracking-wider">
               Avg GPU Temp (°C)
            </h3>
        </div>
        <div className="flex-grow w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <YAxis hide domain={[30, 90]} />
                <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
                <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'Threshold (80°C)', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="avgGpuTemp" name="Temp" stroke="#fb923c" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Active Tokens per Node (New Panel) */}
      <div className="bg-grafana-panel border border-slate-700 rounded-lg p-4 h-48 flex flex-col md:col-span-2 lg:col-span-2">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
               Active Tokens / Node
            </h3>
        </div>
        <div className="flex-grow w-full">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
                {Array.from({ length: 10 }, (_, i) => (
                  <Area 
                    key={`server-${i+1}`}
                    type="monotone" 
                    dataKey={`server-${i+1}`} 
                    stackId="1" 
                    stroke="none" 
                    fill={WORKER_COLORS[i]} 
                    isAnimationActive={false}
                  />
                ))}
            </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default MetricsDashboard;
