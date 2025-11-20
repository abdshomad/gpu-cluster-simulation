
import React, { useState } from 'react';
import { LineChart, Line, AreaChart, Area, CartesianGrid, YAxis, Tooltip, ReferenceLine, Legend } from 'recharts';
import { Activity, DollarSign, Clock, Server, Database } from 'lucide-react';
import { MetricPoint, VirtualUser } from '../types';
import { MetricCard, CustomTooltip } from './MetricCard';
import { MODELS } from '../constants';

interface Props { 
  data: MetricPoint[]; 
  users: VirtualUser[];
}
const WORKER_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc'];

// Fixed colors for models to ensure consistency
const MODEL_COLORS = ['#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6'];

const MetricsDashboard: React.FC<Props> = ({ data, users }) => {
  const [viewMode, setViewMode] = useState<'health' | 'billing'>('health');
  const recent = data.slice(-50);
  
  // Flatten per-node and per-model data for Recharts
  const flattenedData = recent.map(d => ({ 
    ...d, 
    ...d.nodeActiveTokens,
    ...d.modelVramUsage 
  }));
  
  const currentLimit = recent.slice(-1)[0]?.networkLimit || 100;
  const activeModelIds = recent.length > 0 ? Object.keys(recent[recent.length - 1].modelVramUsage || {}) : [];

  return (
    <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800 shadow-sm min-h-[500px]">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-200">
          {viewMode === 'health' ? (
             <> <Activity size={20} className="text-sky-400" /> Cluster Telemetry <span className="text-xs font-normal text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">Prometheus</span> </>
          ) : (
             <> <DollarSign size={20} className="text-emerald-400" /> User Attribution <span className="text-xs font-normal text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">Loki</span> </>
          )}
        </h2>
        
        <div className="bg-slate-800/50 p-1 rounded-lg flex border border-slate-700/50">
          <button
            onClick={() => setViewMode('health')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              viewMode === 'health' 
                ? 'bg-sky-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Activity size={14} /> Health
          </button>
          <button
            onClick={() => setViewMode('billing')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              viewMode === 'billing' 
                ? 'bg-emerald-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Database size={14} /> Billing
          </button>
        </div>
      </div>

      {viewMode === 'health' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
          {/* Latency Metrics */}
          <MetricCard 
            title="Time to First Token (TTFT)" 
            colorClass="text-yellow-400"
            description="The latency (ms) between the user sending a prompt and receiving the very first word. Heavily impacted by network speed and 'Prefill' computation."
          >
            <AreaChart data={recent}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
                <Area type="monotone" dataKey="avgTtft" name="TTFT (ms)" stroke="#fbbf24" strokeWidth={2} fill="#fbbf2440" isAnimationActive={false} />
            </AreaChart>
          </MetricCard>

          <MetricCard 
            title="Total Req Latency (ms)" 
            colorClass="text-cyan-400"
            description="The total time from request start to completion. Depends on output length (Decode) and network overhead."
          >
            <LineChart data={recent}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
                <Line type="monotone" dataKey="avgLatency" name="Total Latency" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </MetricCard>

          {/* Compute Metrics */}
          <MetricCard 
            title="Cluster GPU Util (%)" 
            colorClass="text-violet-400"
            description="Average utilization of CUDA cores across all active worker nodes. High >90% means good ROI but risks saturation."
          >
            <LineChart data={recent}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
                <Line type="monotone" dataKey="clusterUtilization" name="Utilization" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </MetricCard>

          <MetricCard 
            title="Generation T/s" 
            colorClass="text-emerald-400"
            description="Global Throughput. The total number of tokens generated per second across all users. The primary measure of cluster 'horsepower'."
          >
            <AreaChart data={recent}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
                <Area type="monotone" dataKey="totalThroughput" name="Gen Throughput" stroke="#34d399" strokeWidth={2} fill="#34d39940" isAnimationActive={false} />
            </AreaChart>
          </MetricCard>

          {/* Row 2: Data Transfer & VRAM Usage */}
          <MetricCard 
            title="Data Transfer Rates (GB/s)" 
            colorClass="text-indigo-400" 
            colSpan="md:col-span-2"
            description="Visualizes the bottleneck. 'Inter-Node' is slow network (Ethernet/IB). 'Intra-Node' is fast NVLink. Distributed jobs (TP > 1) spike Inter-Node traffic."
          >
            <AreaChart data={recent}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              
              <ReferenceLine y={currentLimit} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'NET LIMIT', fill: '#ef4444', fontSize: 10 }} />
              
              <Area type="monotone" name="Intra-Node (NVLink)" dataKey="totalNvLinkBandwidth" stroke="#a855f7" strokeWidth={2} fill="#a855f740" isAnimationActive={false} stackId="1" />
              <Area type="monotone" name="Inter-Node (Network)" dataKey="totalBandwidth" stroke="#818cf8" strokeWidth={2} fill="#818cf840" isAnimationActive={false} stackId="2" />
            </AreaChart>
          </MetricCard>

          <MetricCard 
            title="Cluster VRAM Consumption (GB)" 
            colorClass="text-pink-400" 
            colSpan="md:col-span-2"
            description="High-Bandwidth Memory usage. Includes static Model Weights (fixed) and dynamic KV Cache (grows with context length). 100% usage leads to crashes or swapping."
          >
            <AreaChart data={flattenedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <YAxis hide domain={[0, 1600]} />
              <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              <ReferenceLine y={1600} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'MAX CAP (1.6TB)', fill: '#ef4444', fontSize: 10 }} />
              
              {activeModelIds.map((id, idx) => (
                <Area 
                    key={id} 
                    type="monotone" 
                    name={MODELS[id]?.name || id} 
                    dataKey={id} 
                    stackId="1" 
                    stroke={MODEL_COLORS[idx % MODEL_COLORS.length]} 
                    fill={MODEL_COLORS[idx % MODEL_COLORS.length]} 
                    fillOpacity={0.6}
                    isAnimationActive={false} 
                />
              ))}
              {activeModelIds.length === 0 && <text x="50%" y="50%" textAnchor="middle" fill="#64748b" fontSize={12}>No Active Models</text>}
            </AreaChart>
          </MetricCard>

          {/* Row 3: Active Tokens & Temps */}
          <MetricCard 
            title="Active Tokens / Node" 
            colorClass="text-slate-400" 
            colSpan="md:col-span-2"
            description="Load Balancing visualization. Shows the volume of tokens actively being processed on each specific server. Ideally, this should be even across the cluster."
          >
            <AreaChart data={flattenedData}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><YAxis hide /><Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
            {Array.from({ length: 10 }, (_, i) => <Area key={i} type="monotone" dataKey={`server-${i+1}`} stackId="1" stroke="none" fill={WORKER_COLORS[i]} isAnimationActive={false} />)}</AreaChart>
          </MetricCard>
          
          <MetricCard 
            title="Avg GPU Temp (°C)" 
            colorClass="text-orange-400" 
            colSpan="md:col-span-2"
            description="Thermal health of the cluster. Temperatures >80°C trigger thermal throttling, reducing clock speeds and throughput."
          >
            <LineChart data={recent}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><YAxis hide domain={[30, 90]} /><Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label="Threshold" />
            <Line type="monotone" dataKey="avgGpuTemp" stroke="#fb923c" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart>
          </MetricCard>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-700 animate-in fade-in duration-300">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-800 text-slate-200 uppercase font-medium text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">User Identity</th>
                <th className="px-4 py-3 text-right">Total Requests</th>
                <th className="px-4 py-3 text-right">Tokens Consumed</th>
                <th className="px-4 py-3 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50">
              {users.sort((a,b) => b.totalCost - a.totalCost).map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sky-400 flex items-center gap-3">
                    <span className="text-lg">{user.avatar}</span>
                    <div>
                        <div className="font-bold text-slate-200">{user.name}</div>
                        <div className="text-[10px] text-slate-500">{user.id}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{user.requestCount}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{user.totalTokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">${user.totalCost.toFixed(4)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-600 italic">No active users in the simulation.</td></tr>
              )}
            </tbody>
            <tfoot className="bg-slate-800/50 border-t border-slate-700">
                <tr>
                    <td className="px-4 py-3 font-bold text-slate-300">TOTAL</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-300">{users.reduce((acc, u) => acc + u.requestCount, 0)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-300">{users.reduce((acc, u) => acc + u.totalTokens, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">${users.reduce((acc, u) => acc + u.totalCost, 0).toFixed(4)}</td>
                </tr>
            </tfoot>
          </table>
          <div className="bg-slate-950 px-4 py-2 text-xs text-slate-600 text-center border-t border-slate-800">
             Billing data aggregated from simulated Loki log streams (24h window)
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsDashboard;
