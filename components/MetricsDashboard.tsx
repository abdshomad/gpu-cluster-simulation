

import React from 'react';
import { LineChart, Line, AreaChart, Area, CartesianGrid, YAxis, Tooltip, ReferenceLine, Legend } from 'recharts';
import { MetricPoint } from '../types';
import { MetricCard, CustomTooltip } from './MetricCard';

interface Props { data: MetricPoint[]; }
const WORKER_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc'];

const MetricsDashboard: React.FC<Props> = ({ data }) => {
  const recent = data.slice(-50);
  const stackedData = recent.map(d => ({ ...d, ...d.nodeActiveTokens }));
  const currentLimit = recent.slice(-1)[0]?.networkLimit || 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard title="Throughput (tok/s)" colorClass="text-yellow-400">
        <AreaChart data={recent}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><YAxis hide domain={[0, 'auto']} /><Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
        <Area type="monotone" dataKey="totalThroughput" stroke="#fbbf24" strokeWidth={2} fill="#fbbf2440" isAnimationActive={false} /></AreaChart>
      </MetricCard>

      <MetricCard title="Latency P99 (ms)" colorClass="text-cyan-400">
        <LineChart data={recent}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><YAxis hide domain={[0, 'auto']} /><Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
        <Line type="monotone" dataKey="avgLatency" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart>
      </MetricCard>

      <MetricCard title="GPU Utilization (%)" colorClass="text-violet-400">
        <LineChart data={recent}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><YAxis hide domain={[0, 100]} /><Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
        <Line type="monotone" dataKey="clusterUtilization" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart>
      </MetricCard>

      <MetricCard title="Queue Depth" colorClass="text-rose-400">
        <LineChart data={recent}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><YAxis hide domain={[0, 'auto']} /><Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
        <Line type="stepAfter" dataKey="queueDepth" stroke="#f43f5e" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart>
      </MetricCard>

      <MetricCard title="Data Transfer Rates (GB/s)" colorClass="text-indigo-400" colSpan="md:col-span-2">
        <AreaChart data={recent}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
          
          {/* Reference line for physical limit of network */}
          <ReferenceLine y={currentLimit} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'NET LIMIT', fill: '#ef4444', fontSize: 10 }} />
          
          {/* NVLink Bandwidth (Intra-Node) - Usually higher */}
          <Area type="monotone" name="Intra-Node (NVLink)" dataKey="totalNvLinkBandwidth" stroke="#a855f7" strokeWidth={2} fill="#a855f740" isAnimationActive={false} stackId="1" />
          
          {/* Network Bandwidth (Inter-Node) */}
          <Area type="monotone" name="Inter-Node (Network)" dataKey="totalBandwidth" stroke="#818cf8" strokeWidth={2} fill="#818cf840" isAnimationActive={false} stackId="2" />
        </AreaChart>
      </MetricCard>

      <MetricCard title="Avg GPU Temp (°C)" colorClass="text-orange-400" colSpan="md:col-span-2">
        <LineChart data={recent}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><YAxis hide domain={[30, 90]} /><Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label="Threshold" />
        <Line type="monotone" dataKey="avgGpuTemp" stroke="#fb923c" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart>
      </MetricCard>

      <MetricCard title="Active Tokens / Node" colorClass="text-emerald-400" colSpan="md:col-span-4">
        <AreaChart data={stackedData}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><YAxis hide /><Tooltip content={<CustomTooltip />} cursor={{stroke: '#475569'}} />
        {Array.from({ length: 10 }, (_, i) => <Area key={i} type="monotone" dataKey={`server-${i+1}`} stackId="1" stroke="none" fill={WORKER_COLORS[i]} isAnimationActive={false} />)}</AreaChart>
      </MetricCard>
    </div>
  );
};
export default MetricsDashboard;